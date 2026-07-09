import express from 'express';
import {
  getMonthlySummary,
  getFYSummary,
  getCurrentMonthSummary,
  getCurrentFYSummary,
  getAvailableFYs,
  exportMonthlyExcel,
  exportMonthlyPDF,
} from '../controllers/gstController.js';

const router = express.Router();

router.get('/monthly', getMonthlySummary);
router.get('/financial-year', getFYSummary);
router.get('/current-month', getCurrentMonthSummary);
router.get('/current-financial-year', getCurrentFYSummary);
router.get('/available-fys', getAvailableFYs);
router.get('/export/excel', exportMonthlyExcel);
router.get('/export/pdf', exportMonthlyPDF);

export default router;
