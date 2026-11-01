import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/companies/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    return {};
  }
};

const getAllCompanies = (params = {}) => { // Accept params object
  return axios.get(API_URL, { headers: getAuthHeaders(), params }); // Pass params to axios
};

const getCompanyById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const createCompany = (companyData) => {
  return axios.post(API_URL, companyData, { headers: getAuthHeaders() });
};

const updateCompany = (id, companyData) => {
  return axios.put(API_URL + id, companyData, { headers: getAuthHeaders() });
};

const deleteCompany = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const CompanyService = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};

export default CompanyService;