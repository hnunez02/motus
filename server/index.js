import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { authRouter } from './routes/auth.js';
import { programRouter } from './routes/program.js';
import { logRouter } from './routes/log.js';
import { aiRouter } from './routes/ai.js';
import { exercisesRouter } from './routes/exercises.js';
import { progressRouter } from './routes/progress.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/program', programRouter);
app.use('/api/log', logRouter);
app.use('/api/ai', aiRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/progress', progressRouter);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Motus server running on port ${PORT}`);

  if (process.env.NODE_ENV === 'development') {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/auth/dev-setup`);
      const data = await res.json();
      if (data.ok) {
        console.log('Dev user ready (dev-user-id-123)');
      }
    } catch (err) {
      console.warn('Dev setup failed (is the DB connected?):', err.message);
    }
  }
});

export default app;
