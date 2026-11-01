// const express = require('express');
// const router = express.Router();
// const { getCompanyLedger, getAllCompaniesLedger, downloadLedgerExcel, downloadLedgerPdf } = require('../controllers/companyLedgerController');
// const { protect, isAdmin } = require('../middleware/authMiddleware');

// // All routes in this file are protected and require admin access
// router.use(protect);
// router.use(isAdmin);

// router.route('/')
//   .get( getCompanyLedger);

// router.route('/all')
//   .get(getAllCompaniesLedger);

// router.route('/download/excel')
//   .get(downloadLedgerExcel);

// router.route('/download/pdf')
//   .get(downloadLedgerPdf);

// module.exports = router;

const express = require('express');
const router = express.Router();
const { getCompanyLedger,
    getCompaniesLedgerSummary,
  downloadCompanyLedgerExcel,
  downloadCompanyLedgerPDF
} = require('../controllers/companyLedgerController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes in this file are protected and require admin access
router.use(protect);
router.use(isAdmin);

router.route('/company')
  .get( getCompanyLedger);

router.route('/companies-summary')
  .get(getCompaniesLedgerSummary);

router.route('/excel')
  .get(  downloadCompanyLedgerExcel);

router.route('/pdf')
  .get(downloadCompanyLedgerPDF);


module.exports = router;