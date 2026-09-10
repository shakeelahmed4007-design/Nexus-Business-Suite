import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes';
import shopRoutes from './routes/shopRoutes';
import staffRoutes from './routes/staffRoutes';
import crmRoutes from './routes/crmRoutes';
import vendorRoutes from './routes/vendorRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import posRoutes from './routes/posRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import stockMovementRoutes from './routes/stockMovementRoutes';
import reportsRoutes from './routes/reportsRoutes';

import { errorHandler } from './middleware/errorHandler';
import { initializeCronJobs } from './jobs/cronJobs';

import integrationRoutes from './routes/integrationRoutes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Mock-Session', 'x-shop-id', 'x-user-email'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Capture raw body buffer for Meta Webhook signature verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(morgan('dev'));


// Initialize background CRM & Phase 3 & Phase 4 cron schedulers
initializeCronJobs();

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Welcome to Nexus CRM & Business Suite Backend Service',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth',
      shops: '/api/shops',
      staff: '/api/staff',
      crm: '/api/crm',
      vendors: '/api/vendors',
      products: '/api/products',
      orders: '/api/orders',
      pos: '/api/pos',
      invoices: '/api/invoices',
      payments: '/api/payments',
      stockMovements: '/api/stock-movements',
      reports: '/api/reports',
      integrations: '/api/integrations',
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
app.use('/api/vendors', vendorRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/integrations', integrationRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// Global error handler
app.use(errorHandler);

export default app;
