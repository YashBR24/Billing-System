import api from '../utils/axiosConfig';

const API_URL = '/workers/';

const getAllWorkers = (params = {}) => {
  return api.get(API_URL, { params });
};

const getWorkerById = (id) => {
  return api.get(API_URL + id);
};

const createWorker = (workerData) => {
  return api.post(API_URL, workerData);
};

const updateWorker = (id, workerData) => {
  return api.put(API_URL + id, workerData);
};

const deleteWorker = (id) => {
  return api.delete(API_URL + id);
};

const WorkerService = {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
};

export default WorkerService;
