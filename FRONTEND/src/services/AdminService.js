import axios from 'axios';
import AuthService from './AuthService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for admin service.");
    return {};
  }
};

const getAllUsers = () => {
  return axios.get(API_BASE_URL + '/auth/users', { headers: getAuthHeaders() });
};

const getUsersByOrg = (organizationId) => {
  const params = {};
  if (organizationId) params.organizationId = organizationId;
  return axios.get(API_BASE_URL + '/auth/users/by-org', { headers: getAuthHeaders(), params });
};

const createUser = (userData) => {
  return axios.post(API_BASE_URL + '/auth/users', userData, { headers: getAuthHeaders() });
};

const updateUser = (userId, userData) => {
  return axios.put(API_BASE_URL + `/auth/users/${userId}`, userData, { headers: getAuthHeaders() });
};

const deleteUser = (userId) => {
  return axios.delete(API_BASE_URL + `/auth/users/${userId}`, { headers: getAuthHeaders() });
};

const getAllLogs = (page = 1, limit = 100) => {
  return axios.get(API_BASE_URL + '/logs', { 
    headers: getAuthHeaders(),
    params: { page, limit }
  });
};

const AdminService = {
  getAllUsers,
  getUsersByOrg,
  createUser,
  updateUser,
  deleteUser,
  getAllLogs,
};

export default AdminService;
