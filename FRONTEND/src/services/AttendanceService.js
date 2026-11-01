// import axios from 'axios';
// import AuthService from './AuthService';

// const API_URL = import.meta.env.VITE_API_BASE_URL + '/attendance/';

// const getAuthHeaders = () => {
//   const user = AuthService.getCurrentUser();
//   if (user && user.token) {
//     return { Authorization: 'Bearer ' + user.token };
//   } else {
//     console.error("User token not found for attendance service.");
//     return {};
//   }
// };

// // Record or update a single attendance entry
// const recordAttendance = (attendanceData) => {
//   // attendanceData: { workerId, date, status, checkInTime?, checkOutTime?, notes? }
//   return axios.post(API_URL, attendanceData, { headers: getAuthHeaders() });
// };

// // Record bulk attendance entries
// const recordBulkAttendance = (bulkData) => {
//   // bulkData: { date, attendanceData: [{ workerId, status, ... }] }
//   return axios.post(API_URL + 'bulk', bulkData, { headers: getAuthHeaders() });
// };

// // Get attendance records based on query parameters
// const getAttendanceRecords = (params) => {
//   // params: { workerId?, startDate?, endDate?, specificDate?, month?, year? }
//   return axios.get(API_URL, { headers: getAuthHeaders(), params });
// };

// // Get monthly attendance report
// const getMonthlyAttendanceReport = (params) => {
//   // params should be an object with month, year, workerId (optional), shiftType (optional)
//   return axios.get(API_URL + 'report/monthly', { 
//     headers: getAuthHeaders(), 
//     params 
//   });
// };


// const AttendanceService = {
//   recordAttendance,
//   recordBulkAttendance,
//   getAttendanceRecords,
//   getMonthlyAttendanceReport
// };

// export default AttendanceService;


// import axios from 'axios';
// import AuthService from './AuthService';

// const API_URL = import.meta.env.VITE_API_BASE_URL + '/attendance/';

// const getAuthHeaders = () => {
//   const user = AuthService.getCurrentUser();
//   if (user && user.token) {
//     return { Authorization: 'Bearer ' + user.token };
//   }
//   console.error("User token not found for attendance service.");
//   return {};
// };

// const recordAttendance = async (attendanceData) => {
//   try {
//     const response = await axios.post(API_URL, attendanceData, {
//       headers: getAuthHeaders()
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error recording attendance:", error);
//     throw error;
//   }
// };

// const recordBulkAttendance = async (bulkData) => {
//   try {
//     const response = await axios.post(API_URL + 'bulk', bulkData, {
//       headers: getAuthHeaders()
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error recording bulk attendance:", error);
//     throw error;
//   }
// };

// const getAttendanceRecords = async (params = {}) => {
//   try {
//     const response = await axios.get(API_URL, {
//       headers: getAuthHeaders(),
//       params
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching attendance records:", error);
//     throw error;
//   }
// };

// const getAttendanceReport = async (params = {}) => {
//   try {
//     const config = {
//       headers: getAuthHeaders(),
//       params
//     };

//     if (params.format === 'pdf') {
//       config.responseType = 'blob';
//     }

//     const response = await axios.get(API_URL + 'report', config);
//     return response.data;
//   } catch (error) {
//     console.error("Error fetching attendance report:", error);
//     throw error;
//   }
// };

// const updateAttendance = async (id, attendanceData) => {
//   try {
//     const response = await axios.put(API_URL + id, attendanceData, {
//       headers: getAuthHeaders()
//     });
//     return response.data;
//   } catch (error) {
//     console.error("Error updating attendance:", error);
//     throw error;
//   }
// };

// export default {
//   recordAttendance,
//   recordBulkAttendance,
//   getAttendanceRecords,
//   getAttendanceReport,
//   updateAttendance
// };

import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/attendance/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  }
  console.error("User token not found for attendance service.");
  return {};
};

const recordAttendance = async (attendanceData) => {
  try {
    const response = await axios.post(API_URL, attendanceData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
};

const recordBulkAttendance = async (bulkData) => {
  try {
    const response = await axios.post(API_URL + 'bulk', bulkData, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error) {
    console.error("Error recording bulk attendance:", error);
    throw error;
  }
};

const getAttendanceRecords = async (params = {}) => {
  try {
    const config = {
      headers: getAuthHeaders(),
      params
    };

    if (params.format === 'pdf') {
      config.responseType = 'blob';
    }

    const response = await axios.get(API_URL, config);
    
    // For PDF requests, return the full response object so we can access the blob
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
    const config = {
      headers: getAuthHeaders(),
      params
    };

    if (params.format === 'pdf') {
      config.responseType = 'blob';
    }

    const response = await axios.get(API_URL + 'report', config);
    
    // For PDF requests, return the full response object so we can access the blob
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
    const response = await axios.put(API_URL + id, attendanceData, {
      headers: getAuthHeaders()
    });
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