import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/exercises — list all exercises with optional filters
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { muscleGroup, category, modality, equipment } = req.query;

    const exercises = await prisma.exercise.findMany({
      where: {
        ...(muscleGroup && { muscleGroups: { has: muscleGroup } }),
        ...(category && { category }),
        ...(modality && { modality }),
        ...(equipment && { equipment: { has: equipment } }),
      },
      orderBy: { name: 'asc' },
    });

    res.json({ exercises });
  } catch (err) {
    next(err);
  }
});

// GET /api/exercises/:id — get single exercise
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: req.params.id },
    });

    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ exercise });
  } catch (err) {
    next(err);
  }
});

export { router as exercisesRouter };
