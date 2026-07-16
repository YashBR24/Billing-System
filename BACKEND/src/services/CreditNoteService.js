import api from '../utils/axiosConfig';

const API_URL = '/credit-notes/';

const createCreditNote = (creditNoteData) => {
  return api.post(API_URL, creditNoteData);
};

const getAllCreditNotes = (params = {}) => {
  return api.get(API_URL, { params });
};

const getCreditNoteById = (id) => {
  return api.get(API_URL + id);
};

const updateCreditNote = (id, creditNoteData) => {
  return api.put(API_URL + id, creditNoteData);
};

const deleteCreditNote = (id) => {
  return api.delete(API_URL + id);
};

const downloadCreditNotePdf = (id) => {
  return api.get(API_URL + id + '/pdf', {
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

const getNextCreditNoteNumber = (financialYear) => {
  return api.get(API_URL + 'next-number', {
    params: { financialYear },
  });
};

const getUnpaidBillsByCompany = (companyId, financialYear) => {
  return api.get(API_URL + 'unpaid-bills', {
    params: { companyId, financialYear },
  });
};

const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
};

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

const CreditNoteService = {
  createCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote,
  downloadCreditNotePdf,
  triggerDownload,
  getNextCreditNoteNumber,
  getUnpaidBillsByCompany,
  getFinancialYear,
  getFinancialYearOptions,
};

export default CreditNoteService;
