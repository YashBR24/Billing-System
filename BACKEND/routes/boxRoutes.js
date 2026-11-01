const express = require('express');
const router = express.Router();
const {
  createBox,
  getBoxes,
  getBoxById,
  updateBox,
  deleteBox,
  getAvailableBoxes,
  generateBoxesPDF,
  generateBoxesExcel,
  getMonthlyNetWeights,
  getNextBoxNumber,
  updateCounter,
  getCounter
} = require('../controllers/boxController');
const { protect, isAdmin} = require('../middleware/authMiddleware');

router.use(protect);
router.use(isAdmin);

router.route('/')
  .post(createBox) 
  .get(getBoxes); 

router.route('/available')
  .get(getAvailableBoxes);

router.route('/next-number')
  .get(getNextBoxNumber);

router.route('/generate-pdf')
  .post(generateBoxesPDF);

router.route('/generate-excel')
  .post(generateBoxesExcel);

router.route('/monthly-net')
  .get(getMonthlyNetWeights);

router.route('/counter')
  .get(getCounter)
  .put(updateCounter);

router.route('/:id')
  .get(getBoxById) 
  .put(updateBox)
  .delete(deleteBox); 

module.exports = router;
