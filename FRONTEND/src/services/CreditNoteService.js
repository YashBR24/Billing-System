// import axios from 'axios';
// import AuthService from './AuthService';

// const API_URL = import.meta.env.VITE_API_BASE_URL + '/credit-notes/';

// const getAuthHeaders = () => {
//   const user = AuthService.getCurrentUser();
//   if (user && user.token) {
//     return { Authorization: 'Bearer ' + user.token };
//   } else {
//     console.error("User token not found for credit note service.");
//     return {};
//   }
// };

// // Basic CRUD operations
// const createCreditNote = (creditNoteData) => {
//   return axios.post(API_URL, creditNoteData, { headers: getAuthHeaders() });
// };

// const getAllCreditNotes = (params = {}) => {
//   return axios.get(API_URL, { headers: getAuthHeaders(), params });
// };

// const getCreditNoteById = (id) => {
//   return axios.get(API_URL + id, { headers: getAuthHeaders() });
// };

// const updateCreditNote = (id, creditNoteData) => {
//   return axios.put(API_URL + id, creditNoteData, { headers: getAuthHeaders() });
// };

// const deleteCreditNote = (id) => {
//   return axios.delete(API_URL + id, { headers: getAuthHeaders() });
// };

// // PDF generation
// const downloadCreditNotePdf = (id) => {
//   return axios.get(API_URL + id + '/pdf', {
//     headers: getAuthHeaders(),
//     responseType: 'blob',
//   });
// };

// // Helper function to trigger file download
// const triggerDownload = (blobData, fileName) => {
//   const url = window.URL.createObjectURL(new Blob([blobData]));
//   const link = document.createElement('a');
//   link.href = url;
//   link.setAttribute('download', fileName);
//   document.body.appendChild(link);
//   link.click();
//   link.remove();
//   window.URL.revokeObjectURL(url);
// };

// const CreditNoteService = {
//   createCreditNote,
//   getAllCreditNotes,
//   getCreditNoteById,
//   updateCreditNote,
//   deleteCreditNote,
//   downloadCreditNotePdf,
//   triggerDownload,
// };

// export default CreditNoteService;


import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/credit-notes/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error('User token not found for credit note service.');
    return {};
  }
};

// ─── Basic CRUD ───────────────────────────────────────────────────────────────

const createCreditNote = (creditNoteData) => {
  return axios.post(API_URL, creditNoteData, { headers: getAuthHeaders() });
};

const getAllCreditNotes = (params = {}) => {
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getCreditNoteById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const updateCreditNote = (id, creditNoteData) => {
  return axios.put(API_URL + id, creditNoteData, { headers: getAuthHeaders() });
};

const deleteCreditNote = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

// ─── PDF ──────────────────────────────────────────────────────────────────────

const downloadCreditNotePdf = (id) => {
  return axios.get(API_URL + id + '/pdf', {
    headers: getAuthHeaders(),
    responseType: 'blob',
  });
};

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

// ─── New: financial-year-based helpers ───────────────────────────────────────

/**
 * Fetch the next auto-generated credit note number for a given financial year.
 * GET /api/credit-notes/next-number?financialYear=2025-26
 * Returns { creditNoteNumber: "2025-26/03", financialYear: "2025-26" }
 */
const getNextCreditNoteNumber = (financialYear) => {
  return axios.get(API_URL + 'next-number', {
    headers: getAuthHeaders(),
    params: { financialYear },
  });
};

/**
 * Fetch unpaid / partially-paid bills for a given company + financial year.
 * GET /api/credit-notes/unpaid-bills?companyId=xxx&financialYear=2025-26
 * Returns array of bills: [{ _id, billNumber, billDate, totalAmount, paymentStatus, company }]
 */
const getUnpaidBillsByCompany = (companyId, financialYear) => {
  return axios.get(API_URL + 'unpaid-bills', {
    headers: getAuthHeaders(),
    params: { companyId, financialYear },
  });
};

// ─── Utility: derive financial year string from a Date (mirrors backend logic) ─

/**
 * Returns "YYYY-YY" string for the Indian financial year that contains `date`.
 * April 2025 – March 2026 → "2025-26"
 */
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed; April = 3
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

/**
 * Build a list of financial year options to show in dropdowns.
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
  // also include current
  if (!options.includes(current)) options.push(current);
  return options;
};

const CreditNoteService = {
  // CRUD
  createCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
  // PDF
  downloadCreditNotePdf,
  triggerDownload,
  // New
  getNextCreditNoteNumber,
  getUnpaidBillsByCompany,
  getFinancialYear,
  getFinancialYearOptions,
};

export default CreditNoteService;