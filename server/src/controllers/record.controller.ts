import { Response } from 'express';
import { db } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const VALID_STATUSES = ['Created', 'Documents Submitted', 'Background Check', 'Under Review', 'Verified'];

export async function getRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const records = await db.getRecords();
    return res.json({ success: true, records });
  } catch (error: any) {
    logger.error(`Get Records Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to retrieve records.' });
  }
}

export async function createRecord(req: AuthenticatedRequest, res: Response) {
  const { name, email, riskScore } = req.body;
  const executor = req.user?.email || 'unknown';

  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required fields.' });
  }

  try {
    // Generate a pseudo-random risk score if not provided
    const score = (riskScore !== undefined) ? parseInt(riskScore, 10) : Math.floor(Math.random() * 85) + 5;

    const record = await db.createRecord({
      name,
      email,
      status: 'Created',
      riskScore: score
    });

    await db.createAuditLog(
      executor,
      'CANDIDATE_CREATED',
      `Candidate background check initialized for ${name} (${email}) with risk rating ${score}%`
    );

    logger.info(`Candidate profile created: ${name} by ${executor}`);
    return res.status(201).json({ success: true, record });
  } catch (error: any) {
    logger.error(`Create Record Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to initialize verification check.' });
  }
}

export async function updateRecordStatus(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;
  const executor = req.user?.email || 'unknown';

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  try {
    const existing = await db.getRecordById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Candidate record not found.' });
    }

    const previousStatus = existing.status;
    const updated = await db.updateRecord(id, { status });

    await db.createAuditLog(
      executor,
      'STATUS_WORKFLOW_ADVANCED',
      `Verification of '${existing.name}' transitioned from '${previousStatus}' to '${status}'`
    );

    logger.info(`Workflow progress for candidate ${id}: ${previousStatus} -> ${status} by ${executor}`);
    return res.json({ success: true, record: updated });
  } catch (error: any) {
    logger.error(`Update Record Status Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to progress workflow status.' });
  }
}

export async function deleteRecord(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const executor = req.user?.email || 'unknown';

  try {
    const existing = await db.getRecordById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    await db.deleteRecord(id);

    await db.createAuditLog(
      executor,
      'CANDIDATE_DELETED',
      `Background check file for ${existing.name} (${existing.email}) deleted`
    );

    logger.info(`Record deleted: ${id} by ${executor}`);
    return res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (error: any) {
    logger.error(`Delete Record Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
}
export async function updateRecordDetails(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { name, email, riskScore } = req.body;
  const executor = req.user?.email || 'unknown';

  try {
    const existing = await db.getRecordById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const updated = await db.updateRecord(id, { name, email, riskScore });
    
    await db.createAuditLog(
      executor,
      'CANDIDATE_UPDATED',
      `Candidate details updated: ${name || existing.name} (Risk: ${riskScore !== undefined ? riskScore : existing.riskScore}%)`
    );

    return res.json({ success: true, record: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update record details.' });
  }
}
