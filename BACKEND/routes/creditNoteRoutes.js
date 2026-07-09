const express = require('express');
const router = express.Router();
const {
  createCreditNote,
  getCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
  generateCreditNotePdf,
  getNextCreditNoteNumber,   // ← new
  getUnpaidBillsByCompany,   // ← new
} = require('../controllers/creditNoteController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// All routes in this file are protected and require admin access
router.use(protect);
router.use(isAdmin);

// ─── New helper routes (MUST be before /:id to avoid clash) ──────────────────
// GET /api/credit-notes/next-number?financialYear=2025-26
router.get('/next-number', getNextCreditNoteNumber);

// GET /api/credit-notes/unpaid-bills?companyId=xxx&financialYear=2025-26
router.get('/unpaid-bills', getUnpaidBillsByCompany);

// ─── Main CRUD routes ─────────────────────────────────────────────────────────
router.route('/')
  .post(createCreditNote)   // POST   /api/credit-notes
  .get(getCreditNotes);     // GET    /api/credit-notes

router.route('/:id')
  .get(getCreditNoteById)   // GET    /api/credit-notes/:id
  .put(updateCreditNote)    // PUT    /api/credit-notes/:id
  .delete(deleteCreditNote); // DELETE /api/credit-notes/:id

// PDF generation
router.route('/:id/pdf')
  .get(generateCreditNotePdf); // GET /api/credit-notes/:id/pdf

module.exports = router;