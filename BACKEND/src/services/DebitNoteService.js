import api from '../utils/axiosConfig';

const API_URL = '/debit-notes/';

const getFinancialYear = (date = new Date()) => {
  const d     = new Date(date);
  const month = d.getMonth();
  const year  = d.getFullYear();
  return month >= 3
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
};

const getFinancialYearOptions = (count = 3) => {
  const currentFY = getFinancialYear();
  const [startYearStr] = currentFY.split('-');
  const startYear = parseInt(startYearStr, 10);
  return Array.from({ length: count }, (_, i) => {
    const y = startYear - i;
    return `${y}-${String(y + 1).slice(-2)}`;
  });
};

const getNextDebitNoteNumber = (financialYear) => {
  return api.get(`${API_URL}next-number`, {
    params: { financialYear },
  });
};

const getUnpaidPurchasesByCompany = (companyId, financialYear) => {
  return api.get(`${API_URL}unpaid-purchases`, {
    params: { companyId, financialYear },
  });
};

const createDebitNote = (debitNoteData) => {
  return api.post(API_URL, debitNoteData);
};

const getAllDebitNotes = (params = {}) => {
  return api.get(API_URL, { params });
};

const getDebitNoteById = (id) => {
  return api.get(`${API_URL}${id}`);
};

const updateDebitNote = (id, debitNoteData) => {
  return api.put(`${API_URL}${id}`, debitNoteData);
};

const deleteDebitNote = (id) => {
  return api.delete(`${API_URL}${id}`);
};

const downloadDebitNotePdf = (id) => {
  return api.get(`${API_URL}${id}/pdf`, {
    responseType: 'blob',
  });
};

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

const DebitNoteService = {
  getFinancialYear,
  getFinancialYearOptions,
  getNextDebitNoteNumber,
  getUnpaidPurchasesByCompany,
  createDebitNote,
  getAllDebitNotes,
  getDebitNoteById,
  updateDebitNote,
  deleteDebitNote,
  downloadDebitNotePdf,
  triggerDownload,
};

export default DebitNoteService;
