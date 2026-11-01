import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/debit-notes/';

// ─────────────────────────────────────────────────────────────────────────────
// Auth header helper
// ─────────────────────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  }
  console.error('User token not found for debit note service.');
  return {};
};

// ─────────────────────────────────────────────────────────────────────────────
// Financial Year helpers  (mirrors CreditNoteService helpers exactly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the financial year string for a given date (or today).
 * e.g. April 2025 – March 2026  →  "2025-26"
 */
const getFinancialYear = (date = new Date()) => {
  const d     = new Date(date);
  const month = d.getMonth();   // 0-indexed; April = 3
  const year  = d.getFullYear();
  return month >= 3
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
};

/**
 * Returns an array of financial year strings going back `count` years from now.
 * e.g. getFinancialYearOptions(3) → ["2025-26", "2024-25", "2023-24"]
 */
const getFinancialYearOptions = (count = 3) => {
  const currentFY = getFinancialYear();
  const [startYearStr] = currentFY.split('-');
  const startYear = parseInt(startYearStr, 10);
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview / helper endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/debit-notes/next-number?financialYear=2025-26
 * Returns { debitNoteNumber, financialYear }
 */
const getNextDebitNoteNumber = (financialYear) => {
  return axios.get(`${API_URL}next-number`, {
    headers: getAuthHeaders(),
    params:  { financialYear },
  });
};

/**
 * GET /api/debit-notes/unpaid-purchases?companyId=xxx&financialYear=2025-26
 * Returns array of Purchase objects that are Unpaid / Partially Paid and
 * do NOT yet have a debit note.
 */
const getUnpaidPurchasesByCompany = (companyId, financialYear) => {
  return axios.get(`${API_URL}unpaid-purchases`, {
    headers: getAuthHeaders(),
    params:  { companyId, financialYear },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

const createDebitNote = (debitNoteData) => {
  return axios.post(API_URL, debitNoteData, { headers: getAuthHeaders() });
};

const getAllDebitNotes = (params = {}) => {
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getDebitNoteById = (id) => {
  return axios.get(`${API_URL}${id}`, { headers: getAuthHeaders() });
};

const updateDebitNote = (id, debitNoteData) => {
  return axios.put(`${API_URL}${id}`, debitNoteData, { headers: getAuthHeaders() });
};

const deleteDebitNote = (id) => {
  return axios.delete(`${API_URL}${id}`, { headers: getAuthHeaders() });
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────────────────────

const downloadDebitNotePdf = (id) => {
  return axios.get(`${API_URL}${id}/pdf`, {
    headers:      getAuthHeaders(),
    responseType: 'blob',
  });
};

/**
 * Programmatically trigger a file download in the browser.
 * @param {Blob|ArrayBuffer} blobData
 * @param {string} fileName
 */
const triggerDownload = (blobData, fileName) => {
  const url  = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
const DebitNoteService = {
  // helpers
  getFinancialYear,
  getFinancialYearOptions,
  // preview / lookup
  getNextDebitNoteNumber,
  getUnpaidPurchasesByCompany,
  // CRUD
  createDebitNote,
  getAllDebitNotes,
  getDebitNoteById,
  updateDebitNote,
  deleteDebitNote,
  // PDF
  downloadDebitNotePdf,
  triggerDownload,
};

export default DebitNoteService;