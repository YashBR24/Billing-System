const express = require('express');
const router = express.Router();

const {
  createBill,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  generateBillExcel,
  generateBillPdf,
  downloadBillsExcel,
  downloadBillsPdf,
  getAvailableChallans,
  createBillFromChallans,
  getNextBillNumber, // ✅ NEW
} = require('../controllers/billController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

// ===============================
// 🔒 PROTECTED ROUTES
// ===============================
router.use(protect);
router.use(isAdmin);

// ===============================
// ✅ MAIN CRUD
// ===============================
router.route('/')
  .post(createBill)
  .get(getBills);

// ===============================
// ✅ NEW: NEXT BILL NUMBER (IMPORTANT)
// MUST be before /:id
// ===============================
router.route('/next-number')
  .get(getNextBillNumber); 
// Example: /api/bills/next-number?financialYear=2025-26

// ===============================
// ✅ CREATE FROM CHALLANS
// ===============================
router.route('/from-challans')
  .post(createBillFromChallans);

// ===============================
// ✅ BULK DOWNLOAD
// ===============================
router.route('/download/excel')
  .get(downloadBillsExcel);

router.route('/download/pdf')
  .get(downloadBillsPdf);

// ===============================
// ✅ AVAILABLE CHALLANS
// ===============================
router.route('/challans/:companyId')
  .get(getAvailableChallans);

// ===============================
// ⚠️ ID ROUTES (KEEP LAST)
// ===============================
router.route('/:id')
  .get(getBillById)
  .put(updateBill)
  .delete(deleteBill);

// ===============================
// 📄 FILE GENERATION
// ===============================
router.route('/:id/excel')
  .get(generateBillExcel);

router.route('/:id/pdf')
  .get(generateBillPdf);

// ===============================
module.exports = router;