import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/dashboard/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for dashboard service.");
    return {};
  }
};

const getFinancialYears = () => {
  return axios.get(API_URL + 'financial-years', { headers: getAuthHeaders() });
};

const getFYSummary = (fy) => {
  return axios.get(API_URL + 'fy-summary', { params: { fy }, headers: getAuthHeaders() });
};

const getFYComparison = () => {
  return axios.get(API_URL + 'fy-comparison', { headers: getAuthHeaders() });
};

const getFYMonthlyBreakdown = (fy) => {
  return axios.get(API_URL + 'fy-monthly', { params: { fy }, headers: getAuthHeaders() });
};

const getFYMaterialFlow = (fy) => {
  return axios.get(API_URL + 'fy-material-flow', { params: { fy }, headers: getAuthHeaders() });
};

const getOverdueBills = () => {
  return axios.get(API_URL + 'overdue-bills', { headers: getAuthHeaders() });
};

const getOverduePurchases = () => {
  return axios.get(API_URL + 'overdue-purchases', { headers: getAuthHeaders() });
};

const getAllOverdue = () => {
  return axios.get(API_URL + 'all-overdue', { headers: getAuthHeaders() });
};

const getUpcomingBillDues = () => {
  return axios.get(API_URL + 'upcoming-bill-dues', { headers: getAuthHeaders() });
};

const getUpcomingPurchaseDues = () => {
  return axios.get(API_URL + 'upcoming-purchase-dues', { headers: getAuthHeaders() });
};

const getMaterialFlowCards = (fy) => {
  return axios.get(API_URL + 'material-flow-cards', { params: { fy }, headers: getAuthHeaders() });
};

const DashboardService = {
  getFinancialYears,
  getFYSummary,
  getFYComparison,
  getFYMonthlyBreakdown,
  getFYMaterialFlow,
  getOverdueBills,
  getOverduePurchases,
  getAllOverdue,
  getUpcomingBillDues,
  getUpcomingPurchaseDues,
  getMaterialFlowCards,
};

export default DashboardService;
