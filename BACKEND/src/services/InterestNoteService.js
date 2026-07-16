import api from '../utils/axiosConfig';

const API_URL = '/interest-notes/';

const createInterestNote = (data) =>
  api.post(API_URL, data);

const getAllInterestNotes = (params = {}) =>
  api.get(API_URL, { params });

const getInterestNoteById = (id) =>
  api.get(API_URL + id);

const updateInterestNote = (id, data) =>
  api.put(API_URL + id, data);

const deleteInterestNote = (id) =>
  api.delete(API_URL + id);

const downloadInterestNotePdf = (id) =>
  api.get(API_URL + id + '/pdf', {
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

const getNextInterestNoteNumber = (financialYear) =>
  api.get(API_URL + 'next-number', {
    params: { financialYear },
  });

const getLatePaidBillsByCompany = (companyId, financialYear) =>
  api.get(API_URL + 'late-paid-bills', {
    params: { companyId, financialYear },
  });

const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth();
  const year = d.getFullYear();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
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

const calcInterestPreview = (billTotalAmount, monthlyInterestRate, lateDays) => {
  const perDayRate     = parseFloat(((billTotalAmount * (monthlyInterestRate / 100)) / 30).toFixed(4));
  const interestAmount = parseFloat((perDayRate * lateDays).toFixed(2));
  return { perDayRate, interestAmount };
};

const InterestNoteService = {
  createInterestNote,
  getAllInterestNotes,
  getInterestNoteById,
  updateInterestNote,
  deleteInterestNote,
  downloadInterestNotePdf,
  triggerDownload,
  getNextInterestNoteNumber,
  getLatePaidBillsByCompany,
  getFinancialYear,
  getFinancialYearOptions,
  calcInterestPreview,
};

export default InterestNoteService;
