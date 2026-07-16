import api from '../utils/axiosConfig';

const API_URL = '/settings/';

const getSettings = () => {
  return api.get(API_URL);
};

const updateSettings = (settingsData) => {
  return api.put(API_URL, settingsData);
};

const addItemConfiguration = (itemConfigData) => {
  return api.post(API_URL + 'item-configurations', itemConfigData);
};

const updateItemConfiguration = (itemId, itemConfigData) => {
  return api.put(API_URL + 'item-configurations/' + itemId, itemConfigData);
};

const deleteItemConfiguration = (itemId) => {
  return api.delete(API_URL + 'item-configurations/' + itemId);
};

const SettingsService = {
  getSettings,
  updateSettings,
  addItemConfiguration,
  updateItemConfiguration,
  deleteItemConfiguration,
};

export default SettingsService;
