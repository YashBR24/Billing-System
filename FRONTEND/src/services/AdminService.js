import api from '../utils/axiosConfig';

const getAllUsers = () => {
  return api.get('/auth/users');
};

const getUsersByOrg = (organizationId) => {
  const params = {};
  if (organizationId) params.organizationId = organizationId;
  return api.get('/auth/users/by-org', { params });
};

const createUser = (userData) => {
  return api.post('/auth/users', userData);
};

const updateUser = (userId, userData) => {
  return api.put(`/auth/users/${userId}`, userData);
};

const deleteUser = (userId) => {
  return api.delete(`/auth/users/${userId}`);
};

const getAllLogs = (page = 1, limit = 100) => {
  return api.get('/logs', {
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
