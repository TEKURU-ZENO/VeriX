import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { connectDb } from './config/db';
import { delayMiddleware } from './middleware/delay.middleware';
import { authGuard, adminOnly } from './middleware/auth.middleware';

// Import Controllers
import * as authController from './controllers/auth.controller';
import * as recordController from './controllers/record.controller';
import * as userController from './controllers/user.controller';
import * as auditController from './controllers/audit.controller';
import * as analyticsController from './controllers/analytics.controller';

// Config Setup
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all client connections in developmental setup
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-simulate-latency', 'x-simulate-failure', 'x-simulate-offline']
}));

// Request Logger (morgan mapped to winston logs)
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

app.use(express.json());

// Simulated Network Instability Middleware
app.use(delayMiddleware);

// --- ROUTES ---

// Health route
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'VeriX Server running.', database: require('./config/db').isFallbackDb ? 'fallback' : 'online' });
});

// Auth Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/session', authGuard, authController.validateSession);

// Candidates / Records Routes
app.get('/api/records', authGuard, recordController.getRecords);
app.post('/api/records', authGuard, recordController.createRecord);
app.put('/api/records/:id', authGuard, recordController.updateRecordDetails);
app.put('/api/records/:id/status', authGuard, recordController.updateRecordStatus);
app.delete('/api/records/:id', authGuard, adminOnly, recordController.deleteRecord);

// Users Management Routes (Admin Only)
app.get('/api/users', authGuard, adminOnly, userController.getUsers);
app.post('/api/users', authGuard, adminOnly, userController.createUser);
app.put('/api/users/:id', authGuard, adminOnly, userController.updateUser);
app.delete('/api/users/:id', authGuard, adminOnly, userController.deleteUser);

// Audit & Operations Logs (Admin Only)
app.get('/api/audit', authGuard, adminOnly, auditController.getAuditLogs);

// Operational Analytics
app.get('/api/analytics', authGuard, analyticsController.getDashboardAnalytics);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Server Error: ${err.message}`);
  res.status(500).json({ success: false, message: 'Uncaught internal server exception.' });
});

// Database Connect & Server Boot
async function startServer() {
  await connectDb();
  app.listen(PORT, () => {
    logger.info(`===================================================`);
    logger.info(` VeriX Console Backend Server running on port ${PORT} `);
    logger.info(`===================================================`);
  });
}

startServer();
