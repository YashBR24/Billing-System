import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/purchases/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for purchase order service.");
    return {};
  }
};

const createPurchaseOrder = (purchaseData) => {
  return axios.post(API_URL, purchaseData, { headers: getAuthHeaders() });
};

const getAllPurchaseOrders = (params = {}) => {
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getPurchaseOrderById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const updatePurchaseOrder = (id, purchaseData) => {
  return axios.put(API_URL + id, purchaseData, { headers: getAuthHeaders() });
};

const deletePurchaseOrder = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const downloadPurchaseOrdersExcel = (filters = {}) => {
  return axios.get(API_URL + 'download/excel', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const downloadPurchaseOrdersPdf = (filters = {}) => {
  return axios.get(API_URL + 'download/pdf', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const PurchaseOrderService = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  downloadPurchaseOrdersExcel,
  downloadPurchaseOrdersPdf,
};

export default PurchaseOrderService;
