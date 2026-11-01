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

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Billing Software API Running');
  log('API root accessed');
});

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/company-ledger', companyLedgerRoutes);
app.use('/api/boxes', boxRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/debit-notes', debitNoteRoutes);
app.use('/api/interest-notes', interestNoteRoutes);
app.use('/api/gst', gstRoutes);

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
