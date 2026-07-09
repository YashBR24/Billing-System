import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import billRoutes from './routes/billRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import logRoutes from './routes/logRoutes.js';
import { log } from './middleware/logger.js';
import challanRoutes from './routes/challanRoutes.js';
import companyLedgerRoutes from './routes/companyLedgerRoutes.js';
import boxRoutes from './routes/boxRoutes.js';
import creditNoteRoutes from './routes/creditNoteRoutes.js';
import debitNoteRoutes from './routes/debitNoteRoutes.js';
import interestNoteRoutes from './routes/interestNoteRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import { companyContext } from './middleware/companyContext.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Billing Software API Running');
  log('API root accessed');
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/companies', companyContext, companyRoutes);
app.use('/api/settings', companyContext, settingsRoutes);
app.use('/api/bills', companyContext, billRoutes);
app.use('/api/workers', companyContext, workerRoutes);
app.use('/api/attendance', companyContext, attendanceRoutes);
app.use('/api/purchases', companyContext, purchaseRoutes);
app.use('/api/transactions', companyContext, transactionRoutes);
app.use('/api/dashboard', companyContext, dashboardRoutes);
app.use('/api/reports', companyContext, reportRoutes);
app.use('/api/logs', companyContext, logRoutes);
app.use('/api/challans', companyContext, challanRoutes);
app.use('/api/company-ledger', companyContext, companyLedgerRoutes);
app.use('/api/boxes', companyContext, boxRoutes);
app.use('/api/credit-notes', companyContext, creditNoteRoutes);
app.use('/api/debit-notes', companyContext, debitNoteRoutes);
app.use('/api/interest-notes', companyContext, interestNoteRoutes);
app.use('/api/gst', companyContext, gstRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  log(`Error: ${err.message} - Stack: ${err.stack}`);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  log(`Server started on port ${PORT}`);
});
