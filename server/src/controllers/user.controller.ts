import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

export async function getUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = await db.getUsers();
    // Exclude password hashes from response
    const sanitized = users.map(u => ({
      _id: u._id,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt
    }));
    return res.json({ success: true, users: sanitized });
  } catch (error: any) {
    logger.error(`Get Users Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve accounts list.' });
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  const { email, password, role } = req.body;
  const executor = req.user?.email || 'unknown';

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password, and role are required.' });
  }

  try {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await db.createUser({
      email,
      passwordHash,
      role,
      status: 'active'
    });

    await db.createAuditLog(
      executor,
      'USER_CREATED',
      `Account created for '${email}' with privileges role '${role}'`
    );

    logger.info(`User created: ${email} by admin ${executor}`);
    return res.status(201).json({
      success: true,
      user: {
        _id: created._id,
        email: created.email,
        role: created.role,
        status: created.status,
        createdAt: created.createdAt
      }
    });
  } catch (error: any) {
    logger.error(`Create User Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to create user account.' });
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { role, status, password } = req.body;
  const executor = req.user?.email || 'unknown';

  try {
    const existing = await db.getUserById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await db.updateUser(id, updates);

    // Logs details
    let changeLog = '';
    if (role && role !== existing.role) changeLog += `Privileges changed from '${existing.role}' to '${role}'. `;
    if (status && status !== existing.status) changeLog += `Status toggled from '${existing.status}' to '${status}'. `;
    if (password) changeLog += `Credentials password reset. `;

    await db.createAuditLog(
      executor,
      'USER_UPDATED',
      `Modified user account '${existing.email}': ${changeLog}`
    );

    logger.info(`User modified ${existing.email} by admin ${executor}: ${changeLog}`);
    return res.json({
      success: true,
      user: {
        _id: updated?._id,
        email: updated?.email,
        role: updated?.role,
        status: updated?.status
      }
    });
  } catch (error: any) {
    logger.error(`Update User Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update user account.' });
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const executor = req.user?.email || 'unknown';

  try {
    const existing = await db.getUserById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent deleting self
    if (existing.email === executor) {
      return res.status(400).json({ success: false, message: 'Self-deletion is forbidden.' });
    }

    await db.deleteUser(id);

    await db.createAuditLog(
      executor,
      'USER_DELETED',
      `Account '${existing.email}' has been removed from database`
    );

    logger.info(`User deleted: ${existing.email} by admin ${executor}`);
    return res.json({ success: true, message: 'Account removed successfully.' });
  } catch (error: any) {
    logger.error(`Delete User Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to remove user account.' });
  }
}
