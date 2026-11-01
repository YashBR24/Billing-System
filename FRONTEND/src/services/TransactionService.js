// import axios from 'axios';
// import AuthService from './AuthService';

// const API_URL = import.meta.env.VITE_API_BASE_URL + '/transactions/';

// const getAuthHeaders = () => {
//   const user = AuthService.getCurrentUser();
//   if (user && user.token) {
//     return { Authorization: 'Bearer ' + user.token };
//   } else {
//     console.error("User token not found for transaction service.");
//     return {};
//   }
// };

// const createTransaction = (transactionData) => {
//   return axios.post(API_URL, transactionData, { headers: getAuthHeaders() });
// };

// const getAllTransactions = (params = {}) => { 
//   // params: { companyId?, type?, paymentMethod?, startDate?, endDate?, month?, year? }
//   return axios.get(API_URL, { headers: getAuthHeaders(), params });
// };

// const getTransactionById = (id) => {
//   return axios.get(API_URL + id, { headers: getAuthHeaders() });
// };

// const updateTransaction = (id, transactionData) => {
//   // Remember: Backend restricts updates to non-financial fields mainly
//   return axios.put(API_URL + id, transactionData, { headers: getAuthHeaders() });
// };

// const deleteTransaction = (id) => {
//   return axios.delete(API_URL + id, { headers: getAuthHeaders() });
// };

// const getFilteredSummary = (params = {}) => {
//   return axios.get(API_URL + 'summary', { headers: getAuthHeaders(), params });
// };

// const TransactionService = {
//   createTransaction,
//   getAllTransactions,
//   getFilteredSummary, // Added new method
//   getTransactionById,
//   updateTransaction,
//   deleteTransaction,
// };

// export default TransactionService;


import axios from 'axios';
import AuthService from './AuthService';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/transactions/';

const getAuthHeaders = () => {
  const user = AuthService.getCurrentUser();
  if (user && user.token) {
    return { Authorization: 'Bearer ' + user.token };
  } else {
    console.error("User token not found for transaction service.");
    return {};
  }
};

const createTransaction = (transactionData) => {
  return axios.post(API_URL, transactionData, { headers: getAuthHeaders() });
};

const getAllTransactions = (params = {}) => { 
  // params: { companyId?, type?, paymentMethod?, startDate?, endDate?, month?, year? }
  return axios.get(API_URL, { headers: getAuthHeaders(), params });
};

const getTransactionById = (id) => {
  return axios.get(API_URL + id, { headers: getAuthHeaders() });
};

const updateTransaction = (id, transactionData) => {
  return axios.put(API_URL + id, transactionData, { headers: getAuthHeaders() });
};

const deleteTransaction = (id) => {
  return axios.delete(API_URL + id, { headers: getAuthHeaders() });
};

const getFilteredSummary = (params = {}) => {
  return axios.get(API_URL + 'summary', { headers: getAuthHeaders(), params });
};

// New export functions
const exportToExcel = (params = {}, fileName = 'transactions') => {
  return axios({
    url: API_URL + 'export/excel',
    method: 'GET',
    headers: getAuthHeaders(),
    params: params,
    responseType: 'blob', // Important for file download
  }).then((response) => {
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};

const exportToPDF = (params = {}, fileName = 'transactions') => {
  return axios({
    url: API_URL + 'export/pdf',
    method: 'GET',
    headers: getAuthHeaders(),
    params: params,
    responseType: 'blob', // Important for file download
  }).then((response) => {
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
};

const TransactionService = {
  createTransaction,
  getAllTransactions,
  getFilteredSummary,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  exportToExcel, 
  exportToPDF,   
};

export default TransactionService;