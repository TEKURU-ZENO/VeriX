import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function delayMiddleware(req: Request, res: Response, next: NextFunction) {
  // Read Simulator Headers
  const latencyHeader = req.headers['x-simulate-latency'];
  const failureHeader = req.headers['x-simulate-failure'];
  const offlineHeader = req.headers['x-simulate-offline'];

  const latency = latencyHeader ? parseInt(latencyHeader as string, 10) : 0;
  const failureRate = failureHeader ? parseInt(failureHeader as string, 10) : 0;
  const isOffline = offlineHeader === 'true';

  // Log active simulation settings
  if (latency > 0 || failureRate > 0 || isOffline) {
    logger.info(`Simulation settings intercepted: Latency=${latency}ms, FailureRate=${failureRate}%, Offline=${isOffline}`);
  }

  // 1. Simulate Offline State
  if (isOffline) {
    logger.warn(`Simulated network offline: Dropping request to ${req.originalUrl}`);
    return res.status(503).json({
      success: false,
      message: 'Simulated connection offline. Server is unreachable.'
    });
  }

  // 2. Simulate Error/Failure Rates
  if (failureRate > 0) {
    const randomChance = Math.floor(Math.random() * 100);
    if (randomChance < failureRate) {
      logger.warn(`Simulated random network drop (${randomChance}% < ${failureRate}%): Failing request to ${req.originalUrl}`);
      
      // Delay before failing to mimic real timeout failures
      const errLatency = latency > 0 ? latency : 500;
      setTimeout(() => {
        return res.status(503).json({
          success: false,
          message: 'Simulated random server error. Request dropped.'
        });
      }, errLatency);
      return;
    }
  }

  // 3. Introduce Network Latency
  if (latency > 0) {
    setTimeout(() => {
      next();
    }, latency);
  } else {
    next();
  }
}
