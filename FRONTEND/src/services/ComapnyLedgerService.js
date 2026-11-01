import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/company-ledger/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for ledger service.");
    return {};
  }
};

// Fetch company ledger with filters
const getCompanyLedger = (params = {}) => {
  return axios.get(API_URL + 'company', {
    headers: getAuthHeaders(),
    params
  });
};

// Fetch all companies ledger summary
const getCompaniesLedgerSummary = (params = {}) => {
  return axios.get(API_URL + 'companies-summary', {
    headers: getAuthHeaders(),
    params
  });
};

// Download company ledger as Excel
const downloadCompanyLedgerExcel = (params = {}) => {
  return axios.get(API_URL + 'excel', {
    headers: getAuthHeaders(),
    params,
    responseType: 'blob',
  });
};

// Download company ledger as PDF
export const downloadCompanyLedgerPDF = (params) => {
  // Ensure companyId is always included
  const downloadParams = {
    companyId: params.companyId || 'all', // Default to 'all' if not specified
    startDate: params.startDate,
    endDate: params.endDate,
    month: params.month,
    year: params.year
  };
  return axios.get(API_URL + 'pdf', {
    headers: getAuthHeaders(),
    params: downloadParams,
    responseType: 'blob',
  });
};

// Helper function to trigger file download
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
  downloadCompanyLedgerExcel,
  downloadCompanyLedgerPDF,
  triggerDownload
};

export default LedgerService;