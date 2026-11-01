import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/settings/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    // Handle cases where user might not be logged in or token is missing
    // This might involve redirecting to login or throwing an error
    console.error("User token not found for settings service.");
    return {}; 
  }
};

const getSettings = () => {
  return axios.get(API_URL, { headers: getAuthHeaders() });
};

const updateSettings = (settingsData) => {
  // This endpoint in the backend expects the full settings object or specific fields like
  // sgstPercentage, cgstPercentage, igstPercentage, and the full itemConfigurations array.
  return axios.put(API_URL, settingsData, { headers: getAuthHeaders() });
};

// --- Item Configuration Specific Methods ---

const addItemConfiguration = (itemConfigData) => {
  return axios.post(API_URL + 'item-configurations', itemConfigData, { headers: getAuthHeaders() });
};

const updateItemConfiguration = (itemId, itemConfigData) => {
  return axios.put(API_URL + 'item-configurations/' + itemId, itemConfigData, { headers: getAuthHeaders() });
};

const deleteItemConfiguration = (itemId) => {
  return axios.delete(API_URL + 'item-configurations/' + itemId, { headers: getAuthHeaders() });
};


const SettingsService = {
  getSettings,
  updateSettings,
  addItemConfiguration,
  updateItemConfiguration,
  deleteItemConfiguration,
};

export default SettingsService;