'use strict';

/**
 * routes/interestNoteRoutes.js
 *
 * Base path (mount in app.js):
 *   app.use('/api/interest-notes', interestNoteRoutes);
 *
 * All routes require authentication (protect) and admin role (admin).
 * Adjust middleware imports to match your project structure.
 */

const express = require('express');
const router  = express.Router();

// ── Auth middleware – update path if needed ───────────────────────────────────
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ── Controller ────────────────────────────────────────────────────────────────
const {
  getNextInterestNoteNumber,
  getLatePaidBillsByCompany,
  createInterestNote,
  getInterestNotes,
  getInterestNoteById,
  updateInterestNote,
  deleteInterestNote,
  generateInterestNotePdf,
} = require('../controllers/InterestNoteController');


router.use(protect);
router.use(isAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY / LOOKUP  (no :id, must come BEFORE /:id routes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/interest-notes/next-number?financialYear=2025-26
 *
 * Returns the next auto-generated interest note number for a given FY.
 * UI calls this on company/FY selection to pre-fill the number field.
 *
 * Query params:
 *   financialYear  – e.g. "2025-26" (defaults to current FY)
 *
 * Response: { interestNoteNumber: "2025-26/IN/03", financialYear: "2025-26" }
 */
router.get('/next-number', getNextInterestNoteNumber);

/**
 * GET /api/interest-notes/late-paid-bills?companyId=xxx&financialYear=2025-26
 *
 * Fetches all PAID bills for a company where paymentDate > dueDate.
 * Enriches each bill with: lateDays, perDayRate (at base).
 * UI uses this to let the user pick which bills to raise interest on.
 *
 * Query params:
 *   companyId     – required
 *   financialYear – optional; filters by bill FY
 *
 * Response: Array of enriched bill objects
 */
router.get('/late-paid-bills', getLatePaidBillsByCompany);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/interest-notes
 *
 * Fetch all interest notes with optional filters.
 *
 * Query params (all optional):
 *   companyId     – filter by company
 *   financialYear – e.g. "2025-26"
 *   status        – "Pending" | "Paid" | "Cancelled"
 *   startDate     – ISO date (filters on interestNoteDate)
 *   endDate       – ISO date
 *
 * Response: Array of populated InterestNote documents
 */
router.get('/', getInterestNotes);

/**
 * POST /api/interest-notes
 *
 * Create a new interest note.
 *
 * Body (JSON):
 *   companyId            – required
 *   billId               – required; must be a Paid bill with paymentDate > dueDate
 *   financialYear        – optional; auto-resolved from bill if omitted
 *   interestNoteNumber   – optional; auto-generated if omitted
 *   interestNoteDate     – optional ISO date; defaults to today
 *   monthlyInterestRate  – required; e.g. 18 (% per month)
 *   taxType              – optional; defaults to bill's taxType
 *   cgstPercentage       – optional; defaults to bill / settings value
 *   sgstPercentage       – optional
 *   igstPercentage       – optional
 *   jobCgstPercentage    – optional
 *   jobSgstPercentage    – optional
 *
 * Response: Newly created InterestNote document (201)
 */
router.post('/', createInterestNote);

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/interest-notes/:id
 *
 * Fetch a single interest note by MongoDB _id.
 * Populates: company, originalBill, createdBy.
 *
 * Response: Populated InterestNote document
 */
router.get('/:id', getInterestNoteById);

/**
 * PUT /api/interest-notes/:id
 *
 * Update mutable fields on an interest note.
 * Currently supports: status
 *
 * Body (JSON):
 *   status – "Pending" | "Paid" | "Cancelled"
 *
 * Response: Updated InterestNote document
 */
router.put('/:id', updateInterestNote);

/**
 * DELETE /api/interest-notes/:id
 *
 * Permanently delete an interest note.
 * Also:
 *   - Unlinks the interestNote reference from the original Bill
 *   - Removes the generated PDF file from disk (if exists)
 *
 * Response: { message: "Interest note removed successfully." }
 */
router.delete('/:id', deleteInterestNote);

/**
 * GET /api/interest-notes/:id/pdf
 *
 * Generate (or re-generate) and stream the PDF for an interest note.
 * Streams directly as application/pdf with Content-Disposition: attachment.
 *
 * Response: PDF binary stream
 */
router.get('/:id/pdf', generateInterestNotePdf);

// ─────────────────────────────────────────────────────────────────────────────
module.exports = router;