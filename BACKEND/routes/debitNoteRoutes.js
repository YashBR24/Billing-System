const express = require('express');
const router  = express.Router();

const {
  getNextDebitNoteNumber,
  getUnpaidPurchasesByCompany,
  createDebitNote,
  getDebitNotes,
  getDebitNoteById,
  updateDebitNote,
  deleteDebitNote,
  generateDebitNotePdf,
} = require('../controllers/debitNoteController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(isAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Specific static routes MUST be declared before /:id dynamic routes
// to prevent Express from matching "next-number" or "unpaid-purchases" as an id.
// ─────────────────────────────────────────────────────────────────────────────

// Preview / helper endpoints
router.get('/next-number',      getNextDebitNoteNumber);
router.get('/unpaid-purchases', getUnpaidPurchasesByCompany);

// Collection
router.route('/')
  .get( getDebitNotes)
  .post( createDebitNote);

// Single document
router.route('/:id')
  .get( getDebitNoteById)
  .put( updateDebitNote)
  .delete( deleteDebitNote);

// PDF generation
router.get('/:id/pdf',  generateDebitNotePdf);

module.exports = router;