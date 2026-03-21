import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { generateMesocycleSkeleton } from '../services/programEngine.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/program/mesocycle — create a new mesocycle
router.post('/mesocycle', requireAuth, async (req, res, next) => {
  try {
    const { goal, weeksTotal, daysPerWeek } = req.body;
    const userId = req.user.id;

    // Deactivate previous mesocycles
    await prisma.mesocycle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const skeleton = generateMesocycleSkeleton({ goal, daysPerWeek, weeksTotal });

    const mesocycle = await prisma.mesocycle.create({
      data: {
        userId,
        goal,
        weeksTotal: skeleton.weeksTotal,
        isActive: true,
      },
    });

    res.status(201).json({ mesocycle, skeleton });
  } catch (err) {
    next(err);
  }
});

// GET /api/program/active — get user's active mesocycle
router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.user.id, isActive: true },
      include: {
        workoutPlans: {
          include: { plannedSets: { include: { exercise: true } } },
          orderBy: [{ weekNum: 'asc' }],
        },
      },
    });

    res.json({ mesocycle });
  } catch (err) {
    next(err);
  }
});

// GET /api/program/today — get today's planned workout
router.get('/today', requireAuth, async (req, res, next) => {
  try {
    const mesocycle = await prisma.mesocycle.findFirst({
      where: { userId: req.user.id, isActive: true },
    });

    if (!mesocycle) return res.json({ plan: null });

    const plan = await prisma.workoutPlan.findFirst({
      where: { mesocycleId: mesocycle.id, weekNum: mesocycle.currentWeek },
      include: { plannedSets: { include: { exercise: true } } },
    });

    res.json({ plan, mesocycle });
  } catch (err) {
    next(err);
  }
});

export { router as programRouter };
