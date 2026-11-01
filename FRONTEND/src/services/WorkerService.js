import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/workers/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for worker service.");
    return {};
  }
};

const getAllWorkers = (params = {}) => { // params can include { active: true/false }
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getWorkerById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const createWorker = (workerData) => {
  return axios.post(API_URL, workerData, { headers: getAuthHeaders() });
};

const updateWorker = (id, workerData) => {
  return axios.put(API_URL + id, workerData, { headers: getAuthHeaders() });
};

const deleteWorker = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const WorkerService = {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
};

export default WorkerService;