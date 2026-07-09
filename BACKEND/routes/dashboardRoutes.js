const express = require('express');
const router = express.Router();
const {
  getFinancialYears,
  getFYSummary,
  getFYComparison,
  getFYMonthlyBreakdown,
  getFYMaterialFlow,
  getOverdueBills,
  getOverduePurchases,
  getAllOverdue,
  getUpcomingBillDues,
  getUpcomingPurchaseDues,
  getMaterialFlowCards,
} = require('../controllers/dashboardController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(isAdmin);

router.get('/financial-years', getFinancialYears);
router.get('/fy-summary', getFYSummary);
router.get('/fy-comparison', getFYComparison);
router.get('/fy-monthly', getFYMonthlyBreakdown);
router.get('/fy-material-flow', getFYMaterialFlow);
router.get('/overdue-bills', getOverdueBills);
router.get('/overdue-purchases', getOverduePurchases);
router.get('/all-overdue', getAllOverdue);
router.get('/upcoming-bill-dues', getUpcomingBillDues);
router.get('/upcoming-purchase-dues', getUpcomingPurchaseDues);
router.get('/material-flow-cards', getMaterialFlowCards);

module.exports = router;
