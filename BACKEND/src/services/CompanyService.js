import api from '../utils/axiosConfig';

const API_URL = '/companies/';

const getAllCompanies = (params = {}) => {
  return api.get(API_URL, { params });
};

const getCompanyById = (id) => {
  return api.get(API_URL + id);
};

const createCompany = (companyData) => {
  return api.post(API_URL, companyData);
};

const updateCompany = (id, companyData) => {
  return api.put(API_URL + id, companyData);
};

const deleteCompany = (id) => {
  return api.delete(API_URL + id);
};

const CompanyService = {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
};

export default CompanyService;
