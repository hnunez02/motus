import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'development' || process.env.BYPASS_AUTH === 'true') {
    req.user = { id: 'dev-user-id-123', email: 'dev@motus.app' };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with a 5s timeout so offline clients get a fast 401
    // instead of the server hanging waiting for Supabase
    const verifyWithTimeout = Promise.race([
      supabase.auth.getUser(token),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Supabase auth timeout')), 5000)
      ),
    ]);

    const { data: { user }, error } = await verifyWithTimeout;

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    // Timeout or network error reaching Supabase — return 503 so client
    // knows to use offline fallback rather than showing an auth error
    if (err.message === 'Supabase auth timeout' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(503).json({ offline: true, error: 'Auth service unavailable' });
    }
    next(err);
  }
}
