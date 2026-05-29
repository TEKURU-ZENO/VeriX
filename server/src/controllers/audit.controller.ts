import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const logs = await db.getAuditLogs();
    return res.json({ success: true, logs });
  } catch (error: any) {
    logger.error(`Get Audit Logs Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit log tracks.' });
  }
}
