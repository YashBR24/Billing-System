import api from '../utils/axiosConfig';
import fileDownload from 'js-file-download';

const API_URL = '/reports/';

const getTransactionReport = (params = {}) => {
  return api.get(API_URL + 'transactions', { params });
};

const exportTransactionReportCSV = (params = {}) => {
  return api.get(API_URL + 'transactions/export/csv', {
    params,
    responseType: 'blob',
  }).then(response => {
    const contentDisposition = response.headers['content-disposition'];
    let filename = `Transaction_Report_${new Date().toISOString().split('T')[0]}.csv`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch && filenameMatch.length > 1) {
        filename = filenameMatch[1];
      }
    }
    fileDownload(response.data, filename);
    return response;
  });
};

const ReportService = {
  getTransactionReport,
  exportTransactionReportCSV,
};

export default ReportService;
