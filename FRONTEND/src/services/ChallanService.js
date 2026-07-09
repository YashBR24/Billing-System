import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/challans/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for challan service.");
    return {};
  }
};

const getNextChallanNumber = (financialYear) => {
  return axios.get(API_URL + 'next-number', {
    headers: getAuthHeaders(),
    params: { financialYear }
  });
};

// Basic CRUD operations
const createChallan = (challanData) => {
  return axios.post(API_URL, challanData, { headers: getAuthHeaders() });
};

const getAllChallans = (params = {}) => {
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getChallanById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const getChallansByCompany = (companyId, financialYear) => {
  return axios.get(API_URL + 'challans', {
    headers: getAuthHeaders(),
    params: { companyId, financialYear }
  });
};
const updateChallan = (id, challanData) => {
  return axios.put(API_URL + id, challanData, { headers: getAuthHeaders() });
};

const deleteChallan = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

// Single challan downloads
const downloadChallan = (id) => {
  return axios.get(API_URL + id + '/pdf', { headers: getAuthHeaders(), responseType: 'blob' });
};

// Bulk download operations
const downloadChallansExcel = (filters = {}) => {
  return axios.get(API_URL + 'excel', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const downloadChallansPdf = (filters = {}) => {
  return axios.get(API_URL + 'pdf', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

export default {
  createChallan,
  getAllChallans,
  getChallanById,
  updateChallan,
  deleteChallan,
  downloadChallan,
  downloadChallansExcel,
  downloadChallansPdf,
  getChallansByCompany,
  getNextChallanNumber
};