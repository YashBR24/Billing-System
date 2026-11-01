// const express = require('express');
// const router = express.Router();
// const {
//   createBill,
//   getBills,
//   getBillById,
//   updateBill,
//   deleteBill,
//   generateBillExcel,
//   generateBillPdf,
//   downloadBillsExcel,
//   downloadBillsPdf,
//   getAvailableChallans,
//   createBillFromChallans,
// } = require('../controllers/billController');
// const { protect, isAdmin } = require('../middleware/authMiddleware');

// // All routes in this file are protected and require admin access
// router.use(protect);
// router.use(isAdmin);

// router.route('/')
//   .post(createBill)
//   .get(getBills);

// // Create bill from multiple challans
// router.route('/from-challans')
//   .post(createBillFromChallans);

// router.route('/:id')
//   .get(getBillById)
//   .put(updateBill)
//   .delete(deleteBill);

// // Route to get available challans for a company
// router.route('/available-challans/:companyId')
//   .get(getAvailableChallans); // GET request to retrieve available challans for a specific company

// // Routes for downloading bills in bulk
// router.route('/download/excel')
//   .get(downloadBillsExcel); // GET request to download all bills as Excel

// router.route('/download/pdf')
//   .get(downloadBillsPdf); // GET request to download all bills as PDF

// // Routes for file generation
// router.route('/:id/excel')
//   .get(generateBillExcel); // GET request to trigger generation and download

// router.route('/:id/pdf')
//   .get(generateBillPdf);   // GET request to trigger generation and download (or return path)

// module.exports = router;

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