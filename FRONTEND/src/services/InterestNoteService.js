import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/interest-notes/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error('User token not found for interest note service.');
    return {};
  }
};

// ─── Basic CRUD ───────────────────────────────────────────────────────────────

const createInterestNote = (data) =>
  axios.post(API_URL, data, { headers: getAuthHeaders() });

const getAllInterestNotes = (params = {}) =>
  axios.get(API_URL, { headers: getAuthHeaders(), params });

const getInterestNoteById = (id) =>
  axios.get(API_URL + id, { headers: getAuthHeaders() });

const updateInterestNote = (id, data) =>
  axios.put(API_URL + id, data, { headers: getAuthHeaders() });

const deleteInterestNote = (id) =>
  axios.delete(API_URL + id, { headers: getAuthHeaders() });

// ─── PDF ──────────────────────────────────────────────────────────────────────

const downloadInterestNotePdf = (id) =>
  axios.get(API_URL + id + '/pdf', {
    headers: getAuthHeaders(),
    responseType: 'blob',
  });

const triggerDownload = (blobData, fileName) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ─── Interest-note-specific helpers ──────────────────────────────────────────

/**
 * Fetch the next auto-generated interest note number for a given financial year.
 * GET /api/interest-notes/next-number?financialYear=2025-26
 * Returns { interestNoteNumber: "2025-26/IN/03", financialYear: "2025-26" }
 */
const getNextInterestNoteNumber = (financialYear) =>
  axios.get(API_URL + 'next-number', {
    headers: getAuthHeaders(),
    params: { financialYear },
  });

/**
 * Fetch paid bills where paymentDate > dueDate for a given company + FY.
 * GET /api/interest-notes/late-paid-bills?companyId=xxx&financialYear=2025-26
 * Returns enriched array: [{ _id, billNumber, billDate, dueDate, paymentDate,
 *   totalAmount, lateDays, perDayRate, financialYear, company }]
 */
const getLatePaidBillsByCompany = (companyId, financialYear) =>
  axios.get(API_URL + 'late-paid-bills', {
    headers: getAuthHeaders(),
    params: { companyId, financialYear },
  });

// ─── Utility: financial year helpers (mirrors backend logic) ─────────────────

/**
 * Returns "YYYY-YY" string for the Indian financial year that contains `date`.
 * April 2025 – March 2026 → "2025-26"
 */
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
};

/**
 * Build a list of financial year options for dropdowns.
 * e.g. ["2023-24", "2024-25", "2025-26"]
 */
const getFinancialYearOptions = (yearsBack = 3) => {
  const current = getFinancialYear();
  const [startStr] = current.split('-');
  const startYear = parseInt(startStr, 10);
  const options = [];
  for (let i = yearsBack - 1; i >= 0; i--) {
    const y = startYear - i;
    options.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  if (!options.includes(current)) options.push(current);
  return options;
};

// ─── Client-side interest preview calculator (mirrors backend formula) ────────

/**
 * Calculate interest amount for UI preview before submission.
 *
 * perDayRate      = (billTotalAmount × monthlyRate%) / 30
 * interestAmount  = perDayRate × lateDays
 *
 * @param {number} billTotalAmount
 * @param {number} monthlyInterestRate  – e.g. 18 for 18%/month
 * @param {number} lateDays
 * @returns {{ perDayRate: number, interestAmount: number }}
 */
const calcInterestPreview = (billTotalAmount, monthlyInterestRate, lateDays) => {
  const perDayRate     = parseFloat(((billTotalAmount * (monthlyInterestRate / 100)) / 30).toFixed(4));
  const interestAmount = parseFloat((perDayRate * lateDays).toFixed(2));
  return { perDayRate, interestAmount };
};

const InterestNoteService = {
  // CRUD
  createInterestNote,
  getAllInterestNotes,
  getInterestNoteById,
  updateInterestNote,
  deleteInterestNote,
  // PDF
  downloadInterestNotePdf,
  triggerDownload,
  // Lookups
  getNextInterestNoteNumber,
  getLatePaidBillsByCompany,
  // Utilities
  getFinancialYear,
  getFinancialYearOptions,
  calcInterestPreview,
};

export default InterestNoteService;