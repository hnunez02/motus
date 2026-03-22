import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import {
  calculateRpeDelta,
  updateFatigueScore,
  checkDeloadTrigger,
} from '../services/adaptiveEngine.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/log/set — log a single set
router.post('/set', requireAuth, async (req, res, next) => {
  try {
    const { plannedSetId, exerciseId, exerciseName, actualWeight, actualReps, loggedRpe } = req.body;
    const userId = req.user.id;

    let targetRpe = null;
    if (plannedSetId) {
      const planned = await prisma.plannedSet.findUnique({ where: { id: plannedSetId } });
      targetRpe = planned?.targetRpe ?? null;
    }

    const rpeDelta = targetRpe !== null ? calculateRpeDelta(loggedRpe, targetRpe) : null;

    const loggedSet = await prisma.loggedSet.create({
      data: {
        userId,
        plannedSetId:  plannedSetId  || null,
        exerciseId:    exerciseId    || null,
        exerciseName:  exerciseName  || null,
        actualWeight,
        actualReps,
        loggedRpe,
        targetRpe,
        rpeDelta,
      },
    });

    // Update fatigue and volume synchronously so response includes new scores
    const newFatigueScore = await updateUserFatigue(userId);
    if (exerciseId) await updateWeeklyVolume(userId, exerciseId);

    const message = buildRpeMessage(rpeDelta);

    res.status(201).json({ loggedSet, rpeDelta, newFatigueScore, message });
  } catch (err) {
    next(err);
  }
});

// POST /api/log/session — log multiple sets for a session at once
router.post('/session', requireAuth, async (req, res, next) => {
  try {
    const { sets } = req.body;
    const userId = req.user.id;

    const created = await prisma.$transaction(
      sets.map((s) =>
        prisma.loggedSet.create({
          data: {
            userId,
            plannedSetId: s.plannedSetId || null,
            exerciseId:   s.exerciseId   || null,
            exerciseName: s.exerciseName || null,
            actualWeight: s.actualWeight,
            actualReps:   s.actualReps,
            loggedRpe:    s.loggedRpe,
            targetRpe:    s.targetRpe    || null,
            rpeDelta:
              s.targetRpe !== null ? calculateRpeDelta(s.loggedRpe, s.targetRpe) : null,
          },
        })
      )
    );

    await updateUserFatigue(userId);

    res.status(201).json({ sets: created });
  } catch (err) {
    next(err);
  }
});

// GET /api/log/history — get recent logged sets
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { days = 14, limit = 100 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sets = await prisma.loggedSet.findMany({
      where: { userId: req.user.id, loggedAt: { gte: since } },
      include: { plannedSet: { include: { exercise: true } } },
      orderBy: { loggedAt: 'desc' },
      take: parseInt(limit),
    });

    res.json({ sets });
  } catch (err) {
    next(err);
  }
});

// GET /api/log/fatigue — get current fatigue score and deload status
router.get('/fatigue', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.perfProfile.findUnique({
      where: { userId: req.user.id },
    });

    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    const deload = mesocycle
      ? checkDeloadTrigger(
          profile?.fatigueScore ?? 0,
          mesocycle.currentWeek,
          mesocycle.weeksTotal
        )
      : { shouldDeload: false, reason: null };

    res.json({ fatigueScore: profile?.fatigueScore ?? 0, deload });
  } catch (err) {
    next(err);
  }
});

async function updateUserFatigue(userId) {
  const recentSets = await prisma.loggedSet.findMany({
    where: {
      userId,
      loggedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      rpeDelta: { not: null },
    },
    select: { rpeDelta: true },
  });

  const deltas = recentSets.map((s) => s.rpeDelta);

  const profile = await prisma.perfProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const newFatigue = updateFatigueScore(profile.fatigueScore, deltas);

  await prisma.perfProfile.update({
    where: { userId },
    data: { fatigueScore: newFatigue, lastUpdated: new Date() },
  });

  return newFatigue;
}

async function updateWeeklyVolume(userId, exerciseId) {
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { muscleGroups: true },
  });
  if (!exercise) return;

  const profile = await prisma.perfProfile.findUnique({ where: { userId } });
  if (!profile) return;

  const volume = { ...(profile.weeklyVolume || {}) };
  for (const muscle of exercise.muscleGroups) {
    volume[muscle] = (volume[muscle] || 0) + 1;
  }

  await prisma.perfProfile.update({
    where: { userId },
    data: { weeklyVolume: volume },
  });
}

function buildRpeMessage(rpeDelta) {
  if (rpeDelta === null) return null;
  if (rpeDelta >= 2)   return 'That felt very hard — consider dropping weight next set.';
  if (rpeDelta >= 1)   return 'Slightly harder than planned. Stay the course.';
  if (rpeDelta <= -2)  return "Easy! You've got more in the tank — bump weight next set.";
  if (rpeDelta <= -1)  return 'Easier than target — small weight increase next set.';
  return 'Right on target. 🦉';
}

export { router as logRouter };
