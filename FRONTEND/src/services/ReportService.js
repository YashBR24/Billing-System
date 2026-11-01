import axios from 'axios';
import AuthService from './AuthService';
import fileDownload from 'js-file-download'; // For CSV download

const API_URL = import.meta.env.VITE_API_BASE_URL + '/reports/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for report service.");
    return {};
  }
};

// Get detailed transaction report (JSON data)
const getTransactionReport = (params = {}) => {
  // params: { companyId?, type?, paymentMethod?, startDate?, endDate?, month?, year?, descriptionSearch? }
  return axios.get(API_URL + 'transactions', { headers: getAuthHeaders(), params });
};

// Export transaction report as CSV
const exportTransactionReportCSV = (params = {}) => {
  return axios.get(API_URL + 'transactions/export/csv', {
    headers: getAuthHeaders(),
    params,
    responseType: 'blob', // Expect a blob for file download
  }).then(response => {
    // Extract filename from content-disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = `Transaction_Report_${new Date().toISOString().split('T')[0]}.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }
    fileDownload(response.data, filename);
    return response; // Return original response if needed elsewhere
  });
};


const ReportService = {
  getTransactionReport,
  exportTransactionReportCSV,
};

export default ReportService;