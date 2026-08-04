import api from '../utils/axiosConfig';

const API_URL = '/challans/';

const getNextChallanNumber = (financialYear) => {
  return api.get(API_URL + 'next-number', {
    params: { financialYear }
  });
};

const createChallan = (challanData) => {
  return api.post(API_URL, challanData);
};

const getAllChallans = (params = {}) => {
  return api.get(API_URL, { params });
};

const getChallanById = (id) => {
  return api.get(API_URL + id);
};

const getChallansByCompany = (companyId, financialYear) => {
  return api.get(API_URL + 'challans', {
    params: { companyId, financialYear }
  });
};

const updateChallan = (id, challanData) => {
  return api.put(API_URL + id, challanData);
};

const deleteChallan = (id) => {
  return api.delete(API_URL + id);
};

const downloadChallan = (id) => {
  return api.get(API_URL + id + '/pdf', { responseType: 'blob' });
};

const downloadChallansExcel = (filters = {}) => {
  return api.get(API_URL + 'excel', {
    params: filters,
    responseType: 'blob',
  });
};

const downloadChallansPdf = (filters = {}) => {
  return api.get(API_URL + 'pdf', {
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
