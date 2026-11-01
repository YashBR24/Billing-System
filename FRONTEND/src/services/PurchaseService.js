import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/purchases/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for purchase service.");
    return {};
  }
};

const createPurchase = (purchaseData) => {
  return axios.post(API_URL, purchaseData, { headers: getAuthHeaders() });
};

const getAllPurchases = (params = {}) => { // params for future filtering
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getPurchaseById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const downloadPurchasesExcel = (filters = {}) => {
  return axios.get(API_URL + 'download/excel', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const downloadPurchasesPdf = (filters = {}) => {
  return axios.get(API_URL + 'download/pdf', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const updatePurchase = (id, purchaseData) => {
  return axios.put(API_URL + id, purchaseData, { headers: getAuthHeaders() });
};

const deletePurchase = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const PurchaseService = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  downloadPurchasesExcel,
  downloadPurchasesPdf,
};

export default PurchaseService;