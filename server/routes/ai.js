import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { searchCitations, formatCitationsForPrompt } from '../services/ragService.js';
import { AI_SYSTEM_PROMPT, generateSession, streamChat } from '../services/aiService.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/ai/generate-session
router.post('/generate-session', requireAuth, async (req, res, next) => {
  try {
    const { modality, split, muscleGroups = [], goal, cardioType, environment } = req.body;
    const userId = req.user.id;

    // 1. Fetch user + perfProfile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { perfProfile: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Fetch last 14 days of logged sets
    const recentSets = await prisma.loggedSet.findMany({
      where: {
        userId,
        loggedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      },
      include: { plannedSet: { include: { exercise: true } } },
      orderBy: { loggedAt: 'desc' },
      take: 50,
    });

    // 3. RAG — top 3 relevant citations
    const rawCitations = await searchCitations(muscleGroups, goal);
    const relevantCitations = formatCitationsForPrompt(rawCitations);

    // 4. Build context
    const context = {
      userProfile: {
        trainingAge: user.trainingAge,
        goals: user.goals,
        equipment: user.equipment,
        injuryFlags: user.injuryFlags,
        daysPerWeek: user.daysPerWeek,
      },
      perfProfile: {
        fatigueScore: user.perfProfile?.fatigueScore ?? 0,
        weeklyVolume: user.perfProfile?.weeklyVolume ?? {},
      },
      sessionRequest: { modality, split, muscleGroups, goal, cardioType, environment },
      recentPerformance: summarizeRecentSets(recentSets),
      relevantCitations,
    };

    // 5. Call AI
    const aiPlan = await generateSession(context);

    // 6. Save WorkoutPlan + PlannedSets
    const activeMeso = await prisma.mesocycle.findFirst({
      where: { userId, isActive: true },
    });

    let savedPlan = null;
    if (activeMeso) {
      savedPlan = await prisma.workoutPlan.create({
        data: {
          mesocycleId: activeMeso.id,
          weekNum: activeMeso.currentWeek,
          dayLabel: aiPlan.sessionTitle || split || 'Session',
          modality,
          plannedSets: {
            create: await buildPlannedSets(aiPlan.exercises, prisma),
          },
        },
      });
    }

    // 7. Return
    res.json({
      plan: savedPlan,
      exercises: aiPlan.exercises,
      citations: aiPlan.citations,
      rationale: aiPlan.rationale,
      fatigueNote: aiPlan.fatigueNote,
      sessionTitle: aiPlan.sessionTitle,
      nextSessionNote: aiPlan.nextSessionNote,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/chat
router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.id;

    // 1. Fetch all user context in parallel
    const [user, mesocycle, rawSets] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { perfProfile: true },
      }),
      prisma.mesocycle.findFirst({
        where: { userId, isActive: true },
      }),
      prisma.loggedSet.findMany({
        where: {
          userId,
          loggedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
        // LoggedSet has no direct @relation to Exercise in the schema,
        // so we go through plannedSet. Orphan exerciseIds are resolved below.
        include: {
          plannedSet: {
            include: { exercise: { select: { name: true, muscleGroups: true } } },
          },
        },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    // Resolve exercise for free-form sets (exerciseId stored but no plannedSet)
    const orphanIds = [
      ...new Set(
        rawSets
          .filter((s) => !s.plannedSet?.exercise && s.exerciseId)
          .map((s) => s.exerciseId)
      ),
    ];
    const orphanMap = new Map();
    if (orphanIds.length > 0) {
      const orphans = await prisma.exercise.findMany({
        where: { id: { in: orphanIds } },
        select: { id: true, name: true, muscleGroups: true },
      });
      orphans.forEach((e) => orphanMap.set(e.id, e));
    }

    const loggedSets = rawSets.map((s) => ({
      ...s,
      exercise: s.plannedSet?.exercise ?? orphanMap.get(s.exerciseId) ?? null,
    }));

    const perfProfile = user?.perfProfile;

    // 2. Build rich context string
    const userDataContext = `
ATHLETE'S CURRENT DATA (use this to personalize your answer):

Fatigue Score: ${perfProfile?.fatigueScore?.toFixed(1) ?? 0}/10
Training Age: ${user?.trainingAge ?? 0} years
Current Goal: ${mesocycle?.goal ?? user?.goals?.[0] ?? 'not set'}
Mesocycle: Week ${mesocycle?.currentWeek ?? '—'} of ${mesocycle?.weeksTotal ?? '—'}

Weekly Volume This Week (sets per muscle group):
${JSON.stringify(perfProfile?.weeklyVolume ?? {}, null, 2)}

MEV/MRV Reference for this athlete:
${buildMevMrvSummary(perfProfile?.weeklyVolume ?? {}, user?.trainingAge ?? 0)}

Recent Sessions (last 14 days):
${buildRecentSessionsSummary(loggedSets)}
`.trim();

    // 3. Compose full system message
    const systemMessage = `${AI_SYSTEM_PROMPT}

${userDataContext}

IMPORTANT: When answering questions, always reference the athlete's actual numbers above. For example if they ask about MEV, tell them exactly which muscles are below/above/at their MEV right now based on their weeklyVolume data. Make it personal — say "your chest is currently at X sets which is Y below your MEV" not generic advice.`;

    // 4. SSE streaming
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChat(messages, null, systemMessage);

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    next(err);
  }
});

function summarizeRecentSets(sets) {
  const sessions = {};
  for (const set of sets) {
    const dateKey = set.loggedAt.toISOString().slice(0, 10);
    if (!sessions[dateKey]) sessions[dateKey] = { date: dateKey, sets: [] };
    sessions[dateKey].sets.push({
      exercise: set.plannedSet?.exercise?.name || 'Unknown',
      weight: set.actualWeight,
      reps: set.actualReps,
      rpe: set.loggedRpe,
      rpeDelta: set.rpeDelta,
    });
  }
  return Object.values(sessions).slice(0, 5);
}

function buildMevMrvSummary(weeklyVolume, trainingAge) {
  const MEV_MRV = {
    chest:      { mev: 10, mrv: 20 },
    back:       { mev: 10, mrv: 22 },
    shoulders:  { mev: 8,  mrv: 18 },
    quads:      { mev: 8,  mrv: 20 },
    hamstrings: { mev: 6,  mrv: 16 },
    glutes:     { mev: 4,  mrv: 16 },
    biceps:     { mev: 6,  mrv: 14 },
    triceps:    { mev: 6,  mrv: 14 },
    calves:     { mev: 8,  mrv: 16 },
  };
  return Object.entries(MEV_MRV)
    .map(([muscle, { mev, mrv }]) => {
      const actual = weeklyVolume[muscle] || 0;
      const status = actual < mev ? 'BELOW MEV' : actual > mrv ? 'ABOVE MRV' : 'optimal';
      return `${muscle}: ${actual} sets (MEV: ${mev}, MRV: ${mrv}) — ${status}`;
    })
    .join('\n');
}

function buildRecentSessionsSummary(loggedSets) {
  if (!loggedSets.length) return 'No sessions logged yet.';

  const byDate = {};
  loggedSets.forEach((set) => {
    const date = set.loggedAt.toISOString().split('T')[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(set);
  });

  return Object.entries(byDate)
    .slice(-7)
    .map(([date, sets]) => {
      const avgRpe   = (sets.reduce((s, x) => s + x.loggedRpe, 0) / sets.length).toFixed(1);
      const avgDelta = (sets.reduce((s, x) => s + (x.rpeDelta || 0), 0) / sets.length).toFixed(1);
      const exercises = [...new Set(sets.map((s) => s.exercise?.name || 'Unknown'))];
      return `${date}: ${exercises.join(', ')} | Avg RPE: ${avgRpe} | RPE Delta: ${avgDelta}`;
    })
    .join('\n');
}

async function buildPlannedSets(exercises, prisma) {
  const sets = [];
  for (const ex of exercises) {
    let exerciseId = ex.exerciseId;

    if (!exerciseId) {
      const found = await prisma.exercise.findFirst({ where: { name: ex.name } });
      exerciseId = found?.id || null;
    }

    if (!exerciseId) continue;

    const numSets = ex.sets || 3;
    const [minReps] = (ex.reps || '8').split('-').map(Number);

    for (let i = 1; i <= numSets; i++) {
      sets.push({
        exerciseId,
        setNumber: i,
        targetReps: minReps || 8,
        targetRpe: ex.rpe || 7,
        restSeconds: ex.restSeconds || 120,
        notes: ex.formCue || null,
      });
    }
  }
  return sets;
}

export { router as aiRouter };
