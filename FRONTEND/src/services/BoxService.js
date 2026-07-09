import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/boxes/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for box service.");
    return {};
  }
};

const createBox = (boxData) => {
  return axios.post(API_URL, boxData, { headers: getAuthHeaders() });
};

const getAllBoxes = (params = {}) => {
  return axios.get(API_URL, {
    headers: getAuthHeaders(),
    params: params
  });
};

const getBoxById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const updateBox = (id, boxData) => {
  return axios.put(API_URL + id, boxData, { headers: getAuthHeaders() });
};

const deleteBox = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const getAvailableBoxes = (descriptionOfGoods) => {
  const cleanedDescription = descriptionOfGoods
    .trim()
    .replace(/\s+/g, ' '); 
  
  const encodedDescription = encodeURIComponent(cleanedDescription);
  
  return axios.get(`${API_URL}available?descriptionOfGoods=${encodedDescription}`, { 
    headers: getAuthHeaders()
  });
};

const generateBoxesPDF = async (filters) => {
  const response = await axios.post(
    import.meta.env.VITE_API_BASE_URL + '/boxes/generate-pdf',
    filters,
    {
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
    }
  );
  return response;
};

const generateBoxesExcel = async (filters) => {
  const response = await axios.post(
    import.meta.env.VITE_API_BASE_URL + '/boxes/generate-excel',
    filters,
    {
      responseType: 'blob',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
    }
  );
  return response;
};

const getMonthlyNet = async (params = {}) => {
  const response = await axios.get(
    import.meta.env.VITE_API_BASE_URL + '/boxes/monthly-net',
    {
      params,
      headers: getAuthHeaders(),
    }
  );
  return response;
};

const getNextBoxNumber = async (params = {}) => {
  const response = await axios.get(
    import.meta.env.VITE_API_BASE_URL + '/boxes/next-number',
    {
      params,
      headers: getAuthHeaders(),
    }
  );
  return response;
};

const getCounter = async (params = {}) => {
  const response = await axios.get(
    import.meta.env.VITE_API_BASE_URL + '/boxes/counter',
    {
      params,
      headers: getAuthHeaders(),
    }
  );
  return response;
};

const updateCounter = async (data) => {
  const response = await axios.put(
    import.meta.env.VITE_API_BASE_URL + '/boxes/counter',
    data,
    {
      headers: getAuthHeaders(),
    }
  );
  return response;
};

const getBoxesStats = async (params = {}) => {
  const response = await axios.get(
    import.meta.env.VITE_API_BASE_URL + '/boxes/stats',
    {
      params,
      headers: getAuthHeaders(),
    }
  );
  return response;
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
