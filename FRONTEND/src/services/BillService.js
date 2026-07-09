import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/bills/';

// ===============================
// 🔐 AUTH HEADERS
// ===============================
const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for bill service.");
    return {};
  }
};

// ===============================
// ✅ BASIC CRUD
// ===============================
const createBill = (billData) => {
  return axios.post(API_URL, billData, {
    headers: getAuthHeaders(),
  });
};

const getAllBills = (params = {}) => {
  return axios.get(API_URL, {
    headers: getAuthHeaders(),
    params, // supports financialYear, date filters, etc.
  });
};

const getBillById = (id) => {
  return axios.get(API_URL + id, {
    headers: getAuthHeaders(),
  });
};

const updateBill = (id, billData) => {
  return axios.put(API_URL + id, billData, {
    headers: getAuthHeaders(),
  });
};

const deleteBill = (id) => {
  return axios.delete(API_URL + id, {
    headers: getAuthHeaders(),
  });
};

// ===============================
// 🆕 GET NEXT BILL NUMBER (IMPORTANT)
// ===============================
const getNextBillNumber = (financialYear) => {
  return axios.get(API_URL + 'next-number', {
    headers: getAuthHeaders(),
    params: financialYear ? { financialYear } : {},
  });
};

// ===============================
// 📄 SINGLE BILL DOWNLOAD
// ===============================
const downloadBillExcel = (id) => {
  return axios.get(API_URL + id + '/excel', {
    headers: getAuthHeaders(),
    responseType: 'blob',
  });
};

const downloadBillPdf = (id) => {
  return axios.get(API_URL + id + '/pdf', {
    headers: getAuthHeaders(),
    responseType: 'blob',
  });
};

// ===============================
// 📦 BULK DOWNLOAD
// ===============================
const downloadBulkExcel = (filters = {}) => {
  return axios.get(API_URL + 'download/excel', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

const downloadBulkPdf = (filters = {}) => {
  return axios.get(API_URL + 'download/pdf', {
    headers: getAuthHeaders(),
    params: filters,
    responseType: 'blob',
  });
};

// ===============================
// 📋 CHALLAN RELATED
// ===============================
// const getAvailableChallans = (companyId) => {
//   return axios.get(API_URL + 'available-challans/' + companyId, {
//     headers: getAuthHeaders(),
//   });
// };

// services/BillService.js

// const getAvailableChallans =(companyId, financialYear) => {
//   return axios.get(
//     `/api/bills/challans/${companyId}?financialYear=${financialYear}`
//   );
// }

const getAvailableChallans = (companyId, financialYear) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = user?.token;

  console.log("TOKEN:", token); // ✅ debug

  return axios.get(
    `${API_URL}challans/${companyId}?financialYear=${financialYear}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

// ===============================
// 🆕 CREATE BILL FROM CHALLANS
// ===============================
const createBillFromChallans = (data) => {
  return axios.post(API_URL + 'from-challans', data, {
    headers: getAuthHeaders(),
  });
};

// ===============================
// 📥 HELPER: FILE DOWNLOAD
// ===============================
const triggerDownload = (blobData, fileName) => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ===============================
// 🚀 EXPORT SERVICE
// ===============================
const BillService = {
  createBill,
  createBillFromChallans,

  getAllBills,
  getBillById,
  updateBill,
  deleteBill,

  // 🆕 IMPORTANT
  getNextBillNumber,

  downloadBillExcel,
  downloadBillPdf,
  downloadBulkExcel,
  downloadBulkPdf,

  getAvailableChallans,
  triggerDownload,
};

export default BillService;