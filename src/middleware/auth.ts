import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';

const BOOTSTRAP_ADMIN_EMAIL = 'gbholanath732@gmail.com';

export interface DbUser {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  institution: string | null;
  bio: string | null;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: DbUser;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<DbUser> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const isBootstrapAdmin =
    email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

  if (existing.length > 0) {
    const current = existing[0];
    if (isBootstrapAdmin && current.role !== 'admin') {
      const updated = await db
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }
    return current;
  }

  const inserted = await db
    .insert(users)
    .values({
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      role: isBootstrapAdmin ? 'admin' : 'researcher',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        updatedAt: new Date(),
      },
    })
    .returning();

  return inserted[0];
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name || null
    );
    if (!dbUser.isActive) {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      req.dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email || '',
        decodedToken.name || null
      );
    } catch {
      // Ignore invalid optional token and continue as public viewer
    }
  }
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required' });
  }
  next();
};
