import api from '../utils/axiosConfig';

const API_URL = '/gst/';

const getMonthlySummary = (year, month) => {
  return api.get(`${API_URL}monthly`, {
    params: { year, month },
  });
};

const getFYSummary = (financialYear) => {
  return api.get(`${API_URL}financial-year`, {
    params: { financialYear },
  });
};

const getCurrentMonthSummary = () => {
  return api.get(`${API_URL}current-month`);
};

const getCurrentFYSummary = () => {
  return api.get(`${API_URL}current-financial-year`);
};

const getAvailableFYs = () => {
  return api.get(`${API_URL}available-fys`);
};

const exportExcel = (year, month) => {
  return api.get(`${API_URL}export/excel`, {
    params: { year, month },
    headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    responseType: 'blob',
  });
};

const exportPDF = (year, month) => {
  return api.get(`${API_URL}export/pdf`, {
    params: { year, month },
    headers: { 'Accept': 'application/pdf' },
    responseType: 'blob',
  });
};

const GSTService = {
  getMonthlySummary,
  getFYSummary,
  getCurrentMonthSummary,
  getCurrentFYSummary,
  getAvailableFYs,
  exportExcel,
  exportPDF,
};

export default GSTService;
