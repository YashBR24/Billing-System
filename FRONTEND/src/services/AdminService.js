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

// Fetch all users (admin only)
const getAllUsers = () => {
  return axios.get(API_BASE_URL + '/auth/users', { headers: getAuthHeaders() });
};

// Fetch all logs (admin only, paginated)
const getAllLogs = (page = 1, limit = 100) => {
  return axios.get(API_BASE_URL + '/logs', { 
    headers: getAuthHeaders(),
    params: { page, limit }
  });
};

const AdminService = {
  getAllUsers,
  getAllLogs,
};

export default AdminService;