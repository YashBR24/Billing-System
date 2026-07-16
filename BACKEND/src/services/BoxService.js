import api from '../utils/axiosConfig';

const API_URL = '/boxes/';

const createBox = (boxData) => {
  return api.post(API_URL, boxData);
};

const getAllBoxes = (params = {}) => {
  return api.get(API_URL, { params });
};

const getBoxById = (id) => {
  return api.get(API_URL + id);
};

const updateBox = (id, boxData) => {
  return api.put(API_URL + id, boxData);
};

const deleteBox = (id) => {
  return api.delete(API_URL + id);
};

const getAvailableBoxes = (descriptionOfGoods) => {
  const cleanedDescription = descriptionOfGoods
    .trim()
    .replace(/\s+/g, ' ');
  const encodedDescription = encodeURIComponent(cleanedDescription);
  return api.get(`${API_URL}available?descriptionOfGoods=${encodedDescription}`);
};

const generateBoxesPDF = async (filters) => {
  return api.post('/boxes/generate-pdf', filters, {
    responseType: 'blob',
    headers: { 'Content-Type': 'application/json' },
  });
};

const generateBoxesExcel = async (filters) => {
  return api.post('/boxes/generate-excel', filters, {
    responseType: 'blob',
    headers: { 'Content-Type': 'application/json' },
  });
};

const getMonthlyNet = async (params = {}) => {
  return api.get('/boxes/monthly-net', { params });
};

const getNextBoxNumber = async (params = {}) => {
  return api.get('/boxes/next-number', { params });
};

const getCounter = async (params = {}) => {
  return api.get('/boxes/counter', { params });
};

const updateCounter = async (data) => {
  return api.put('/boxes/counter', data);
};

const getBoxesStats = async (params = {}) => {
  return api.get('/boxes/stats', { params });
};

export default {
  createBox,
  getAllBoxes,
  getBoxesStats,
  getBoxById,
  updateBox,
  deleteBox,
  getAvailableBoxes,
  generateBoxesPDF,
  generateBoxesExcel,
  getMonthlyNet,
  getNextBoxNumber,
  getCounter,
  updateCounter
};
