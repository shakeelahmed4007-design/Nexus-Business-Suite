import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes';
import shopRoutes from './routes/shopRoutes';
import staffRoutes from './routes/staffRoutes';
import crmRoutes from './routes/crmRoutes';

import { errorHandler } from './middleware/errorHandler';
import { initializeCronJobs } from './jobs/cronJobs';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Mock-Session'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());
app.use(morgan('dev'));


// Initialize background CRM cron scheduler
initializeCronJobs();

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Nexus CRM Backend Service',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth',
      shops: '/api/shops',
      staff: '/api/staff',
      crm: '/api/crm',
    },
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'Nexus CRM Backend Service operational' });
});

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/crm', crmRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// Global error handler
app.use(errorHandler);

export default app;
