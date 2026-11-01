import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/gst/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  }
  return {};
};

const getMonthlySummary = (year, month) => {
  return axios.get(`${API_URL}monthly`, {
    params: { year, month },
    headers: getAuthHeaders(),
  });
};

const getFYSummary = (financialYear) => {
  return axios.get(`${API_URL}financial-year`, {
    params: { financialYear },
    headers: getAuthHeaders(),
  });
};

const getCurrentMonthSummary = () => {
  return axios.get(`${API_URL}current-month`, { headers: getAuthHeaders() });
};

const getCurrentFYSummary = () => {
  return axios.get(`${API_URL}current-financial-year`, { headers: getAuthHeaders() });
};

const getAvailableFYs = () => {
  return axios.get(`${API_URL}available-fys`, { headers: getAuthHeaders() });
};

const exportExcel = (year, month) => {
  return axios.get(`${API_URL}export/excel`, {
    params: { year, month },
    headers: { ...getAuthHeaders(), 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    responseType: 'blob',
  });
};

const exportPDF = (year, month) => {
  return axios.get(`${API_URL}export/pdf`, {
    params: { year, month },
    headers: { ...getAuthHeaders(), 'Accept': 'application/pdf' },
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
