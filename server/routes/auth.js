import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/sync — create or fetch user record after Supabase login
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const { id: supabaseId, email } = req.user;

    let user = await prisma.user.findUnique({ where: { id: supabaseId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: supabaseId,
          email,
          perfProfile: { create: {} },
        },
        include: { perfProfile: true },
      });
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile — update user profile (goals, equipment, etc.)
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const {
      trainingAge, goals, equipment, injuryFlags, daysPerWeek,
      biologicalSex, heightCm, weightKg, activityLevel, healthKitConnected,
    } = req.body;

    // Validate types before touching the DB
    if (biologicalSex !== undefined && !['male', 'female', 'prefer_not_to_say'].includes(biologicalSex)) {
      return res.status(400).json({ error: 'Invalid biologicalSex value' });
    }
    if (heightCm !== undefined && (typeof heightCm !== 'number' || heightCm < 50 || heightCm > 300)) {
      return res.status(400).json({ error: 'Invalid heightCm value' });
    }
    if (weightKg !== undefined && (typeof weightKg !== 'number' || weightKg < 20 || weightKg > 500)) {
      return res.status(400).json({ error: 'Invalid weightKg value' });
    }
    if (activityLevel !== undefined && !['sedentary', 'light', 'active', 'very_active'].includes(activityLevel)) {
      return res.status(400).json({ error: 'Invalid activityLevel value' });
    }
    if (daysPerWeek !== undefined && (typeof daysPerWeek !== 'number' || daysPerWeek < 1 || daysPerWeek > 7)) {
      return res.status(400).json({ error: 'Invalid daysPerWeek value' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(trainingAge          !== undefined && { trainingAge }),
        ...(goals                !== undefined && { goals }),
        ...(equipment            !== undefined && { equipment }),
        ...(injuryFlags          !== undefined && { injuryFlags }),
        ...(daysPerWeek          !== undefined && { daysPerWeek }),
        ...(biologicalSex        !== undefined && { biologicalSex }),
        ...(heightCm             !== undefined && { heightCm }),
        ...(weightKg             !== undefined && { weightKg }),
        ...(activityLevel        !== undefined && { activityLevel }),
        ...(healthKitConnected   !== undefined && { healthKitConnected }),
      },
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — get current user with profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { perfProfile: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/dev-setup — upsert dev user + perfProfile (development only)
router.get('/dev-setup', async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const user = await prisma.user.upsert({
      where: { id: 'dev-user-id-123' },
      update: {
        trainingAge: 2,
        daysPerWeek: 4,
        goals: ['hypertrophy'],
        equipment: ['barbell', 'dumbbells', 'cables'],
      },
      create: {
        id: 'dev-user-id-123',
        email: 'dev@motus.app',
        trainingAge: 2,
        daysPerWeek: 4,
        goals: ['hypertrophy'],
        equipment: ['barbell', 'dumbbells', 'cables'],
      },
    });

    await prisma.perfProfile.upsert({
      where: { userId: 'dev-user-id-123' },
      update: { fatigueScore: 3.0, weeklyVolume: {} },
      create: { userId: 'dev-user-id-123', fatigueScore: 3.0, weeklyVolume: {} },
    });

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
