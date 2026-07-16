import api from '../utils/axiosConfig';

const API_URL = '/dashboard/';

const getFinancialYears = () => {
  return api.get(API_URL + 'financial-years');
};

const getFYSummary = (fy) => {
  return api.get(API_URL + 'fy-summary', { params: { fy } });
};

const getFYComparison = () => {
  return api.get(API_URL + 'fy-comparison');
};

const getFYMonthlyBreakdown = (fy) => {
  return api.get(API_URL + 'fy-monthly', { params: { fy } });
};

const getFYMaterialFlow = (fy) => {
  return api.get(API_URL + 'fy-material-flow', { params: { fy } });
};

const getOverdueBills = () => {
  return api.get(API_URL + 'overdue-bills');
};

const getOverduePurchases = () => {
  return api.get(API_URL + 'overdue-purchases');
};

const getAllOverdue = () => {
  return api.get(API_URL + 'all-overdue');
};

const getUpcomingBillDues = () => {
  return api.get(API_URL + 'upcoming-bill-dues');
};

const getUpcomingPurchaseDues = () => {
  return api.get(API_URL + 'upcoming-purchase-dues');
};

const getMaterialFlowCards = (fy) => {
  return api.get(API_URL + 'material-flow-cards', { params: { fy } });
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
