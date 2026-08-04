import api from '../utils/axiosConfig';

const API_URL = '/purchases/';

const createPurchase = (purchaseData) => {
  return api.post(API_URL, purchaseData);
};

const getAllPurchases = (params = {}) => {
  return api.get(API_URL, { params });
};

const getPurchaseById = (id) => {
  return api.get(API_URL + id);
};

const downloadPurchasesExcel = (filters = {}) => {
  return api.get(API_URL + 'download/excel', {
    params: filters,
    responseType: 'blob',
  });
};

const downloadPurchasesPdf = (filters = {}) => {
  return api.get(API_URL + 'download/pdf', {
    params: filters,
    responseType: 'blob',
  });
};

const updatePurchase = (id, purchaseData) => {
  return api.put(API_URL + id, purchaseData);
};

const deletePurchase = (id) => {
  return api.delete(API_URL + id);
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
