import api from '../utils/axiosConfig';

const API_URL = '/attendance/';

const recordAttendance = async (attendanceData) => {
  try {
    const response = await api.post(API_URL, attendanceData);
    return response.data;
  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
};

const recordBulkAttendance = async (bulkData) => {
  try {
    const response = await api.post(API_URL + 'bulk', bulkData);
    return response.data;
  } catch (error) {
    console.error("Error recording bulk attendance:", error);
    throw error;
  }
};

const getAttendanceRecords = async (params = {}) => {
  try {
    const config = { params };
    if (params.format === 'pdf') {
      config.responseType = 'blob';
    }
    const response = await api.get(API_URL, config);
    if (params.format === 'pdf') {
      return response;
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    throw error;
  }
};

const getAttendanceReport = async (params = {}) => {
  try {
    const config = { params };
    if (params.format === 'pdf') {
      config.responseType = 'blob';
    }
    const response = await api.get(API_URL + 'report', config);
    if (params.format === 'pdf') {
      return response;
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance report:", error);
    throw error;
  }
};

const updateAttendance = async (id, attendanceData) => {
  try {
    const response = await api.put(API_URL + id, attendanceData);
    return response.data;
  } catch (error) {
    console.error("Error updating attendance:", error);
    throw error;
  }
};

export default {
  recordAttendance,
  recordBulkAttendance,
  getAttendanceRecords,
  getAttendanceReport,
  updateAttendance
};
