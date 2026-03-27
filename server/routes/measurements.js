import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const measurementsRouter = Router();

// GET /api/measurements — latest value per muscle
measurementsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.bodyMeasurement.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });

    // Build map: muscle → sorted history array
    const map = {};
    for (const row of rows) {
      if (!map[row.muscle]) map[row.muscle] = [];
      map[row.muscle].push(row);
    }

    res.json({ measurements: map });
  } catch (err) {
    next(err);
  }
});

// POST /api/measurements — log a new measurement
measurementsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const { muscle, valueCm, unit, note } = req.body;

    if (!muscle || typeof muscle !== 'string') {
      return res.status(400).json({ error: 'muscle is required' });
    }
    if (typeof valueCm !== 'number' || valueCm <= 0 || valueCm > 200) {
      return res.status(400).json({ error: 'valueCm must be a number between 0 and 200' });
    }
    const allowedUnits = ['in', 'cm'];
    const safeUnit = allowedUnits.includes(unit) ? unit : 'in';

    const entry = await prisma.bodyMeasurement.create({
      data: {
        userId: req.userId,
        muscle: muscle.trim().toLowerCase(),
        valueCm,
        unit: safeUnit,
        note: note ? String(note).slice(0, 200) : null,
      },
    });

    res.status(201).json({ measurement: entry });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/measurements/:id
measurementsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.bodyMeasurement.findUnique({
      where: { id: req.params.id },
    });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: 'Not found' });
    }
    await prisma.bodyMeasurement.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
