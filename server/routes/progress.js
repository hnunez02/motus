import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { checkDeloadTrigger } from '../services/adaptiveEngine.js';

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
      return {
        id: s.id,
        exerciseId:   ex?.id   ?? s.exerciseId ?? null,
        exerciseName: ex?.name ?? null,
        actualWeight: s.actualWeight,
        actualReps:   s.actualReps,
        loggedRpe:    s.loggedRpe,
        rpeDelta:     s.rpeDelta ?? null,
        loggedAt:     s.loggedAt.toISOString(),
      };
    });

    // Distinct exercises for the strength chart dropdown
    const exerciseMap = new Map();
    for (const s of sets) {
      if (s.exerciseId && s.exerciseName && !exerciseMap.has(s.exerciseId)) {
        exerciseMap.set(s.exerciseId, { id: s.exerciseId, name: s.exerciseName });
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
      weeklyVolume: profile?.weeklyVolume ?? {},
      fatigueScore: profile?.fatigueScore ?? 0,
      deload,
      sets,
      exercises: Array.from(exerciseMap.values()),
    });
  } catch (err) {
    next(err);
  }
});

export { router as progressRouter };
