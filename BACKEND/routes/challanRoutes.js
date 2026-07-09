const express = require('express');
const router = express.Router();
const {
  createChallan,
  getChallans,
  getChallanById,
  updateChallan,
  deleteChallan,
  generateChallanPdf,
  downloadChallansExcel,
  downloadChallansPdf,
  getChallansByCompany,
  getNextChallanNumber
} = require('../controllers/challanController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes in this file are protected and require admin access
router.use(protect);
router.use(isAdmin);

router.route('/')
  .post(createChallan) // POST request to create a new challan
  .get(getChallans); // GET request to retrieve all challans

 router.route('/next-number')
  .get(getNextChallanNumber);

router.route('/:id')
    .get(getChallanById) // GET request to retrieve a specific challan by ID
    .put(updateChallan) // PUT request to update a specific challan by ID
    .delete(deleteChallan); // DELETE request to delete a specific challan by ID

// Route to get all challans for a specific company
router.route('/challans/:companyId')
  .get(getChallansByCompany); // GET request to retrieve all challans for a specific company

// Route for generating and downloading a challan as PDF
router.route('/:id/pdf')
  .get(generateChallanPdf); // GET request to generate and download a challan as PDF

// Routes for downloading challans in bulk
router.route('/download/excel')
  .get(downloadChallansExcel); // GET request to download all challans as Excel
router.route('/download/pdf')
  .get(downloadChallansPdf); // GET request to download all challans as PDF

module.exports = router;