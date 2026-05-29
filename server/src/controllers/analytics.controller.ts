import { Response } from 'express';
import { db, isFallbackDb } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

export async function getDashboardAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const records = await db.getRecords();

    const total = records.length;
    const verified = records.filter(r => r.status === 'Verified').length;
    const pending = records.filter(r => ['Documents Submitted', 'Background Check', 'Under Review'].includes(r.status)).length;
    const riskAlerts = records.filter(r => r.riskScore > 70).length;

    // Calculate verification success rate percentage
    const successRate = total > 0 ? Math.round(((verified + records.filter(r => r.status === 'Under Review').length) / total) * 100) : 100;

    // Status distribution
    const statusDistribution = {
      Created: records.filter(r => r.status === 'Created').length,
      'Documents Submitted': records.filter(r => r.status === 'Documents Submitted').length,
      'Background Check': records.filter(r => r.status === 'Background Check').length,
      'Under Review': records.filter(r => r.status === 'Under Review').length,
      Verified: records.filter(r => r.status === 'Verified').length
    };

    // Calculate average risk score
    const avgRisk = total > 0 ? Math.round(records.reduce((sum, r) => sum + r.riskScore, 0) / total) : 0;

    return res.json({
      success: true,
      metrics: {
        totalChecks: total,
        verifiedCases: verified,
        pendingCases: pending,
        riskAlerts,
        verificationSuccessRate: successRate,
        avgRiskScore: avgRisk,
        dbStatus: isFallbackDb ? 'Fallback In-Memory JSON' : 'Connected MongoDB Atlas'
      },
      statusDistribution
    });
  } catch (error: any) {
    logger.error(`Analytics Controller Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to calculate analytics metrics.' });
  }
}
