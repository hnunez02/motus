import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { checkDeloadTrigger } from '../services/adaptiveEngine.js';
import { getMusclesForExercise } from '../utils/exerciseMuscles.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/progress/summary
 * Returns all data needed for the Progress page charts:
 *   - weeklyVolume  — muscle group → set count (from PerfProfile)
 *   - fatigueScore  — current EMA fatigue (from PerfProfile)
 *   - deload        — deload trigger status
 *   - sets          — last 60 days of logged sets with exercise metadata
 *   - exercises     — distinct exercises the user has logged (for dropdown)
 */
router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [profile, mesocycle, rawSets] = await Promise.all([
      prisma.perfProfile.findUnique({ where: { userId } }),
      prisma.mesocycle.findFirst({ where: { userId, isActive: true } }),
      prisma.loggedSet.findMany({
        where: {
          userId,
          loggedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        },
        include: { plannedSet: { include: { exercise: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    // LoggedSet has exerciseId stored directly but no Prisma @relation.
    // For sets that came from a planned set, grab exercise via plannedSet.
    // For free-form sets (direct exerciseId, no plannedSet), fetch separately.
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
        select: { id: true, name: true },
      });
      orphans.forEach((e) => orphanMap.set(e.id, e));
    }

    const sets = rawSets.map((s) => {
      const ex = s.plannedSet?.exercise ?? orphanMap.get(s.exerciseId) ?? null;
      // Prefer direct exerciseName field (set by chat-flow logger), fall back to relation
      const exerciseName = s.exerciseName ?? ex?.name ?? null;
      return {
        id: s.id,
        exerciseId:   ex?.id ?? s.exerciseId ?? null,
        exerciseName,
        actualWeight: s.actualWeight,
        actualReps:   s.actualReps,
        loggedRpe:    s.loggedRpe,
        rpeDelta:     s.rpeDelta ?? null,
        loggedAt:     s.loggedAt.toISOString(),
      };
    });

    // Compute weekly volume from exercise names via muscle map
    const weeklyVolumeMap = {};
    for (const s of sets) {
      const muscles = getMusclesForExercise(s.exerciseName);
      for (const muscle of muscles) {
        weeklyVolumeMap[muscle] = (weeklyVolumeMap[muscle] || 0) + 1;
      }
    }
    const weeklyVolume = Object.keys(weeklyVolumeMap).length > 0
      ? weeklyVolumeMap
      : (profile?.weeklyVolume ?? {});

    // Compute best estimated 1RM per exercise (Epley: w * (1 + r/30))
    const oneRMMap = {};
    for (const s of sets) {
      if (!s.exerciseName || !s.actualWeight || !s.actualReps) continue;
      const e1rm = s.actualWeight * (1 + s.actualReps / 30);
      if (!oneRMMap[s.exerciseName] || e1rm > oneRMMap[s.exerciseName]) {
        oneRMMap[s.exerciseName] = Math.round(e1rm);
      }
    }
    const oneRMExercises = Object.entries(oneRMMap).map(([name, e1rm]) => ({ name, e1rm }));

    // Distinct exercises for the strength chart dropdown (union of both sources)
    const exerciseMap = new Map();
    for (const s of sets) {
      if (s.exerciseName && !exerciseMap.has(s.exerciseName)) {
        exerciseMap.set(s.exerciseName, { id: s.exerciseId, name: s.exerciseName });
      }
    }

    const deload = mesocycle
      ? checkDeloadTrigger(
          profile?.fatigueScore ?? 0,
          mesocycle.currentWeek,
          mesocycle.weeksTotal
        )
      : { shouldDeload: false, reason: null };

    res.json({
      weeklyVolume,
      fatigueScore: profile?.fatigueScore ?? 0,
      deload,
      sets,
      exercises: Array.from(exerciseMap.values()),
      oneRMExercises,
    });
  } catch (err) {
    next(err);
  }
});

export { router as progressRouter };
