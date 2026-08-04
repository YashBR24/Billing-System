import api from '../utils/axiosConfig';

const API_URL = '/transactions/';

const createTransaction = (transactionData) => {
  return api.post(API_URL, transactionData);
};

const getAllTransactions = (params = {}) => {
  return api.get(API_URL, { params });
};

const getTransactionById = (id) => {
  return api.get(API_URL + id);
};

const updateTransaction = (id, transactionData) => {
  return api.put(API_URL + id, transactionData);
};

const deleteTransaction = (id) => {
  return api.delete(API_URL + id);
};

const getFilteredSummary = (params = {}) => {
  return api.get(API_URL + 'summary', { params });
};

const exportToExcel = (params = {}, fileName = 'transactions') => {
  return api({
    url: API_URL + 'export/excel',
    method: 'GET',
    params: params,
    responseType: 'blob',
  }).then((response) => {
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
  return api({
    url: API_URL + 'export/pdf',
    method: 'GET',
    params: params,
    responseType: 'blob',
  }).then((response) => {
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
