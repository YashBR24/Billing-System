import api from '../utils/axiosConfig';

const API_URL = '/bills/';

const createBill = (billData) => {
  return api.post(API_URL, billData);
};

const getAllBills = (params = {}) => {
  return api.get(API_URL, { params });
};

const getBillById = (id) => {
  return api.get(API_URL + id);
};

const updateBill = (id, billData) => {
  return api.put(API_URL + id, billData);
};

const deleteBill = (id) => {
  return api.delete(API_URL + id);
};

const getNextBillNumber = (financialYear) => {
  return api.get(API_URL + 'next-number', {
    params: financialYear ? { financialYear } : {},
  });
};

const downloadBillExcel = (id) => {
  return api.get(API_URL + id + '/excel', {
    responseType: 'blob',
  });
};

const downloadBillPdf = (id) => {
  return api.get(API_URL + id + '/pdf', {
    responseType: 'blob',
  });
};

const downloadBulkExcel = (filters = {}) => {
  return api.get(API_URL + 'download/excel', {
    params: filters,
    responseType: 'blob',
  });
};

const downloadBulkPdf = (filters = {}) => {
  return api.get(API_URL + 'download/pdf', {
    params: filters,
    responseType: 'blob',
  });
};

const getAvailableChallans = (companyId, financialYear) => {
  return api.get(
    `${API_URL}challans/${companyId}?financialYear=${financialYear}`
  );
}

const createBillFromChallans = (data) => {
  return api.post(API_URL + 'from-challans', data);
};

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

const BillService = {
  createBill,
  createBillFromChallans,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
  getNextBillNumber,
  downloadBillExcel,
  downloadBillPdf,
  downloadBulkExcel,
  downloadBulkPdf,
  getAvailableChallans,
  triggerDownload,
};

export default BillService;
