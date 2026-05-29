import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'verix-super-secret-key';
const TOKEN_EXPIRY = '2h';

export async function login(req: AuthenticatedRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await db.getUserByEmail(email);

    if (!user) {
      await db.createAuditLog(email || 'anonymous', 'LOGIN_FAILED', 'User not found');
      logger.warn(`Failed login attempt: user not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status === 'suspended') {
      await db.createAuditLog(email, 'LOGIN_FAILED', 'User account suspended');
      logger.warn(`Failed login attempt: account suspended: ${email}`);
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await db.createAuditLog(email, 'LOGIN_FAILED', 'Password mismatch');
      logger.warn(`Failed login attempt: password mismatch: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    await db.createAuditLog(user.email, 'LOGIN_SUCCESS', `Session initiated with role '${user.role}'`);
    logger.info(`Successful login: ${user.email} as ${user.role}`);

    return res.json({
      success: true,
      token,
      user: {
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error: any) {
    logger.error(`Login Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

export async function validateSession(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Session invalid.' });
  }

  try {
    const user = await db.getUserByEmail(req.user.email);
    if (!user || user.status === 'suspended') {
      return res.status(401).json({ success: false, message: 'User suspended or deleted.' });
    }

    return res.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}
