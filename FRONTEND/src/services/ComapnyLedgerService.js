import api from '../utils/axiosConfig';

const API_URL = '/company-ledger/';

const getCompanyLedger = (params = {}) => {
  return api.get(API_URL + 'company', { params });
};

const getCompaniesLedgerSummary = (params = {}) => {
  return api.get(API_URL + 'companies-summary', { params });
};

const getCompanyBillSummary = (params = {}) => {
  return api.get(API_URL + 'company-bills', { params });
};

const getCompanyOutstanding = (params = {}) => {
  return api.get(API_URL + 'company-outstanding', { params });
};

const getCompanyFinancialYears = (params = {}) => {
  return api.get(API_URL + 'company-financial-years', { params });
};

const downloadCompanyLedgerExcel = (params = {}) => {
  return api.get(API_URL + 'excel', {
    params,
    responseType: 'blob',
  });
};

export const downloadCompanyLedgerPDF = (params) => {
  const downloadParams = {
    companyId: params.companyId || 'all',
    startDate: params.startDate,
    endDate: params.endDate,
    month: params.month,
    year: params.year
  };
  return api.get(API_URL + 'pdf', {
    params: downloadParams,
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

const LedgerService = {
  getCompanyLedger,
  getCompaniesLedgerSummary,
  getCompanyBillSummary,
  getCompanyOutstanding,
  getCompanyFinancialYears,
  downloadCompanyLedgerExcel,
  downloadCompanyLedgerPDF,
  triggerDownload
};

export default LedgerService;
