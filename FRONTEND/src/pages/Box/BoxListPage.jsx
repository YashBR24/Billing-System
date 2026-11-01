import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Edit3,
  Trash2,
  X,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Plus,
  Package,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Hash,
  Printer,
  Weight,
  Box,
} from 'lucide-react';
import BoxService from '../../services/BoxService';
import SettingsService from '../../services/SettingsService';

const getCurrentFY = (date = new Date()) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) {
    const nextYY = String((y + 1) % 100).padStart(2, '0');
    return `${y}-${nextYY}`;
  } else {
    const prev = y - 1;
    const nextYY = String(y % 100).padStart(2, '0');
    return `${prev}-${nextYY}`;
  }
};

const buildFYOptions = (yearsBack = 4, yearsForward = 1) => {
  const cur = new Date();
  const baseYear = cur.getMonth() >= 3 ? cur.getFullYear() : cur.getFullYear() - 1;
  const list = [];
  for (let i = yearsBack; i >= 0; i--) {
    const start = baseYear - i;
    const endYY = String((start + 1) % 100).padStart(2, '0');
    list.push(`${start}-${endYY}`);
  }
  for (let i = 1; i <= yearsForward; i++) {
    const start = baseYear + i;
    const endYY = String((start + 1) % 100).padStart(2, '0');
    list.push(`${start}-${endYY}`);
  }
  return list;
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const formatKg = (v) => {
  const n = toNumber(v);
  return n === null ? 'N/A' : `${n.toFixed(2)} kg`;
};
const formatPlainKg = (v) => {
  const n = toNumber(v);
  return n === null ? 'N/A' : n.toFixed(2);
};
const formatInt = (v) => {
  const n = toNumber(v);
  return n === null ? 'N/A' : `${Math.trunc(n)}`;
};

const BoxListPage = () => {
  const [boxes, setBoxes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);
  const [availableDescriptions, setAvailableDescriptions] = useState([]);

  const [filterDescription, setFilterDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFY, setFilterFY] = useState(getCurrentFY());

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [editingBox, setEditingBox] = useState(null);
  const [formData, setFormData] = useState({ boxNumber: '', descriptionOfGoods: '', grossWeight: '', tareWeight: '', netWeight: '', cops: '', copsWeight: '', boxDate: new Date().toISOString().split('T')[0] });
  const [formErrors, setFormErrors] = useState({});
  const [isGeneratingBoxNumber, setIsGeneratingBoxNumber] = useState(false);

  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLotNo, setPrintLotNo] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailBox, setDetailBox] = useState(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailLocal, setDetailLocal] = useState(null);
  const [detailErrors, setDetailErrors] = useState({});

  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterForm, setCounterForm] = useState({ financialYear: getCurrentFY(), descriptionOfGoods: '', counterValue: '' });
  const [counterLoading, setCounterLoading] = useState(false);
  const [currentCounter, setCurrentCounter] = useState(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowFilters(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await SettingsService.getSettings();
        setAvailableDescriptions(response.data.itemConfigurations.map(item => item.description) || []);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const getStatusColor = (isUsed) => {
    return isUsed
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  };

  const fetchBoxes = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (filterDescription && filterDescription !== 'All Descriptions') params.descriptionOfGoods = filterDescription;
      if (filterStatus !== '') params.isUsed = filterStatus;
      if (filterSearch.trim()) params.search = filterSearch.trim();
      if (filterFY) params.fy = filterFY;

      const response = await BoxService.getAllBoxes(params);
      setBoxes(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch boxes.');
      setBoxes([]);
    } finally {
      setIsLoading(false);
    }
  }, [filterDescription, filterStatus, filterSearch, filterFY]);

  useEffect(() => {
    fetchBoxes();
  }, [fetchBoxes]);

  const clearFilters = () => {
    setFilterDescription('');
    setFilterStatus('');
    setFilterSearch('');
    setFilterFY(getCurrentFY());
    if (isMobile) setShowFilters(false);
  };

  const fetchAutoBoxNumber = useCallback(async (fy, desc) => {
    if (!desc || !fy) return;
    setIsGeneratingBoxNumber(true);
    try {
      const res = await BoxService.getNextBoxNumber({ financialYear: fy, descriptionOfGoods: desc });
      setFormData(prev => ({ ...prev, boxNumber: res.data.boxNumber }));
    } catch (err) {
      console.error('Failed to fetch next box number:', err);
    } finally {
      setIsGeneratingBoxNumber(false);
    }
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'grossWeight' || name === 'tareWeight') {
        const gross = parseFloat(newData.grossWeight) || 0;
        const tare = parseFloat(newData.tareWeight) || 0;
        newData.netWeight = (gross - tare).toFixed(2);
      }
      return newData;
    });
    if (formMode === 'create' && showFormModal && (name === 'descriptionOfGoods' || name === 'boxDate')) {
      const newDesc = name === 'descriptionOfGoods' ? value : formData.descriptionOfGoods;
      const newDate = name === 'boxDate' ? value : formData.boxDate;
      if (newDesc && newDate) {
        const fy = getCurrentFY(new Date(newDate));
        fetchAutoBoxNumber(fy, newDesc);
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.boxNumber.trim()) errors.boxNumber = 'Box number is required.';
    if (!formData.descriptionOfGoods) errors.descriptionOfGoods = 'Description is required.';
    if (!formData.grossWeight || isNaN(parseFloat(formData.grossWeight)) || parseFloat(formData.grossWeight) <= 0) errors.grossWeight = 'Valid gross weight is required.';
    if (!formData.tareWeight || isNaN(parseFloat(formData.tareWeight)) || parseFloat(formData.tareWeight) < 0) errors.tareWeight = 'Valid tare weight is required.';
    if (!formData.cops || isNaN(parseInt(formData.cops)) || parseInt(formData.cops) <= 0) errors.cops = 'Valid cops count is required.';
    const gross = parseFloat(formData.grossWeight) || 0;
    const tare = parseFloat(formData.tareWeight) || 0;
    if (tare >= gross) errors.tareWeight = 'Tare weight must be less than gross weight.';
    if (formData.copsWeight !== '' && (isNaN(parseFloat(formData.copsWeight)) || parseFloat(formData.copsWeight) < 0)) errors.copsWeight = 'Cops weight must be a number >= 0.';
    if (!formData.boxDate) errors.boxDate = 'Date is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    const fy = getCurrentFY(new Date(formData.boxDate));
    const payload = {
      ...formData,
      financialYear: fy,
      grossWeight: parseFloat(formData.grossWeight),
      tareWeight: parseFloat(formData.tareWeight),
      netWeight: parseFloat(formData.netWeight),
      cops: parseInt(formData.cops),
      copsWeight: formData.copsWeight === '' ? 0 : parseFloat(formData.copsWeight)
    };
    try {
      if (formMode === 'create') {
        await BoxService.createBox(payload);
        setFormData({ boxNumber: '', descriptionOfGoods: '', grossWeight: '', tareWeight: '', netWeight: '', cops: '', copsWeight: '', boxDate: new Date().toISOString().split('T')[0] });
        setSuccessMessage('Box created successfully!');
      } else {
        await BoxService.updateBox(editingBox._id, payload);
        setShowFormModal(false);
        setEditingBox(null);
        setSuccessMessage('Box updated successfully!');
      }
      setFormErrors({});
      fetchBoxes();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${formMode === 'create' ? 'create' : 'update'} box.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBox = async (id) => {
    if (window.confirm('Are you sure you want to delete this box? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await BoxService.deleteBox(id);
        fetchBoxes();
        setSuccessMessage('Box deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to delete box.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleViewBox = (box) => {
    setDetailBox(box);
    setShowDetail(true);
    setDetailEditMode(false);
    setDetailErrors({});
    setDetailLocal({
      boxNumber: box.boxNumber || '',
      descriptionOfGoods: box.descriptionOfGoods || '',
      grossWeight: box.grossWeight ?? '',
      tareWeight: box.tareWeight ?? '',
      netWeight: box.netWeight ?? '',
      cops: box.cops ?? '',
      copsWeight: box.copsWeight ?? '',
    });
  };

  const handleEditBox = (box) => {
    setEditingBox(box);
    setFormMode('edit');
    setFormData({
      boxNumber: box.boxNumber,
      descriptionOfGoods: box.descriptionOfGoods,
      grossWeight: box.grossWeight,
      tareWeight: box.tareWeight,
      netWeight: box.netWeight,
      cops: box.cops,
      copsWeight: box.copsWeight ?? '',
      boxDate: box.createdAt ? new Date(box.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      financialYear: box.financialYear || getCurrentFY()
    });
    setShowFormModal(true);
  };

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setDetailLocal(prev => {
      const n = { ...prev, [name]: value };
      if (name === 'grossWeight' || name === 'tareWeight') {
        const gw = parseFloat(n.grossWeight) || 0;
        const tw = parseFloat(n.tareWeight) || 0;
        n.netWeight = parseFloat((gw - tw).toFixed(2));
      }
      return n;
    });
  };

  const validateDetail = () => {
    const e = {};
    if (!detailLocal.boxNumber?.trim()) e.boxNumber = 'Box number is required';
    if (!detailLocal.descriptionOfGoods) e.descriptionOfGoods = 'Description is required';
    const gw = parseFloat(detailLocal.grossWeight);
    const tw = parseFloat(detailLocal.tareWeight);
    if (isNaN(gw) || gw <= 0) e.grossWeight = 'Valid gross weight required';
    if (isNaN(tw) || tw < 0) e.tareWeight = 'Valid tare weight required';
    if (!detailLocal.cops || isNaN(parseInt(detailLocal.cops)) || parseInt(detailLocal.cops) <= 0) e.cops = 'Valid cops required';
    if (tw >= gw) e.tareWeight = 'Tare must be less than gross';
    if (detailLocal.copsWeight !== '' && (isNaN(parseFloat(detailLocal.copsWeight)) || parseFloat(detailLocal.copsWeight) < 0)) e.copsWeight = 'Cops weight >= 0';
    setDetailErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDetailSave = async () => {
    if (detailBox.isUsed) return;
    if (!validateDetail()) return;
    const payload = {
      boxNumber: detailLocal.boxNumber,
      descriptionOfGoods: detailLocal.descriptionOfGoods,
      grossWeight: parseFloat(detailLocal.grossWeight),
      tareWeight: parseFloat(detailLocal.tareWeight),
      netWeight: parseFloat(detailLocal.netWeight),
      cops: parseInt(detailLocal.cops),
      copsWeight: detailLocal.copsWeight === '' ? 0 : parseFloat(detailLocal.copsWeight)
    };
    try {
      const updated = await BoxService.updateBox(detailBox._id, payload);
      setBoxes(prev => prev.map(b => (b._id === updated.data._id ? updated.data : b)));
      setDetailBox(updated.data);
      setDetailEditMode(false);
      setSuccessMessage('Box updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update box';
      setDetailErrors(prev => ({ ...prev, form: msg }));
    }
  };

  const toggleBoxSelection = (id) => {
    setSelectedBoxes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelectedBoxes(boxes.map(b => b._id));
    else setSelectedBoxes([]);
  };

  const handlePrintSlips = () => {
    if (selectedBoxes.length === 0) {
      setError('Please select at least one box to print.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrint = (lotNo) => {
    const printBoxes = boxes.filter(b => selectedBoxes.includes(b._id));
    if (printBoxes.length === 0) return;
    const printWindow = window.open('', '_blank');
    const slipsPerPage = 12;
    const pageCount = Math.ceil(printBoxes.length / slipsPerPage);
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>MAHADEV FILAMENTS - Box Slips</title><style>@page { size: A4; margin: 0; }* { margin: 0; padding: 0; box-sizing: border-box; }body, html { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }.page { width: 210mm; height: 297mm; padding: 5mm; display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(6, 46mm); gap: 2mm; page-break-after: always; }.slip { border: 2px solid #000; padding: 2mm 3mm; display: flex; flex-direction: column; justify-content: flex-start; line-height: 1.3; }.header { border: 2px solid #000; text-align: center; padding: 1mm 0; margin-bottom: 1.5mm; }.company { font-weight: bold; font-size: 10pt; letter-spacing: 1px; }.product { font-size: 7.5pt; }.details { font-size: 8.2pt; }.row { display: flex; justify-content: space-between; margin-bottom: 1mm; }.left-col, .right-col { display: flex; gap: 1.5mm; flex: 0 0 48%; }.label { font-weight: 600; }.value { font-weight: normal; }.note { font-size: 7pt; font-style: italic; margin-top: 1mm; line-height: 1.2; }</style></head><body>`;
    for (let p = 0; p < pageCount; p++) {
      const start = p * slipsPerPage;
      const end = Math.min(start + slipsPerPage, printBoxes.length);
      const pageBoxes = printBoxes.slice(start, end);
      html += `<div class="page">`;
      pageBoxes.forEach(box => {
        const denier = box.descriptionOfGoods || 'N/A';
        const cartoonNo = box.boxNumber?.toString() || 'N/A';
        const unit = formatInt(box.cops);
        const gross = formatPlainKg(box.grossWeight);
        const tare = formatPlainKg(box.tareWeight);
        const net = formatPlainKg(box.netWeight);
        const grade = 'A++';
        html += `<div class="slip"><div class="header"><div class="company">MAHADEV FILAMENT</div><div class="product">POLYESTAR FILAMENT YARN</div></div><div class="details"><div class="row"><div class="left-col"><span class="label">CARTOON NO:</span><span class="value">${cartoonNo}</span></div><div class="right-col"><span class="label">UNIT:</span><span class="value">${unit}</span></div></div><div class="row"><div class="left-col"><span class="label">GRADE:</span><span class="value">${grade}</span></div><div class="right-col"><span class="label">GROSS WT:</span><span class="value">${gross}</span></div></div><div class="row"><div class="left-col"><span class="label">LOT NO:</span><span class="value">${lotNo || ''}</span></div><div class="right-col"><span class="label">TARE WT:</span><span class="value">${tare}</span></div></div><div class="row"><div class="left-col"><span class="label">DENIER:</span><span class="value">${denier}</span></div><div class="right-col"><span class="label">NET WT:</span><span class="value">${net}</span></div></div><div class="note">Please do not mix this Lot No. with any other Lot No.</div></div></div>`;
      });
      for (let i = pageBoxes.length; i < slipsPerPage; i++) { html += `<div class="slip"></div>`; }
      html += `</div>`;
    }
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 800);
    };
    setShowPrintModal(false);
    setPrintLotNo('');
    setSuccessMessage(`Successfully printed ${printBoxes.length} box slip(s)${lotNo ? ` with Lot No: ${lotNo}` : ''}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleGenerateFilteredPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfFilters = { descriptionOfGoods: filterDescription || '', isUsed: filterStatus || '', search: filterSearch || '', fy: filterFY || '' };
      const response = await BoxService.generateBoxesPDF(pdfFilters);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boxes-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('PDF generated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateSelectedPDF = async () => {
    if (selectedBoxes.length === 0) {
      setError('Select at least one box');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const selectedBoxNumbers = boxes.filter(b => selectedBoxes.includes(b._id)).map(b => b.boxNumber).join(',');
      const response = await BoxService.generateBoxesPDF({ boxNumbers: selectedBoxNumbers });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boxes-selected-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Selected PDF generated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate selected PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateFilteredExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const excelFilters = { descriptionOfGoods: filterDescription || '', isUsed: filterStatus || '', search: filterSearch || '', fy: filterFY || '' };
      const response = await BoxService.generateBoxesExcel(excelFilters);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boxes-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Excel generated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate Excel.');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleGenerateSelectedExcel = async () => {
    if (selectedBoxes.length === 0) {
      setError('Select at least one box');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setIsGeneratingExcel(true);
    try {
      const selectedBoxNumbers = boxes.filter(b => selectedBoxes.includes(b._id)).map(b => b.boxNumber).join(',');
      const response = await BoxService.generateBoxesExcel({ boxNumbers: selectedBoxNumbers });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `boxes-selected-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Selected Excel generated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate selected Excel.');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleCounterChange = (e) => {
    const { name, value } = e.target;
    setCounterForm(prev => ({ ...prev, [name]: value }));
    if (name === 'descriptionOfGoods' || name === 'financialYear') {
      setCurrentCounter(null);
      setCounterForm(prev => ({ ...prev, counterValue: '' }));
    }
  };

  const handleSaveCounter = async (e) => {
    e.preventDefault();
    if (!counterForm.financialYear || !counterForm.descriptionOfGoods || !counterForm.counterValue) {
      setError('All fields are required');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setCounterLoading(true);
    try {
      const res = await BoxService.updateCounter({
        financialYear: counterForm.financialYear,
        descriptionOfGoods: counterForm.descriptionOfGoods,
        counterValue: parseInt(counterForm.counterValue)
      });
      setSuccessMessage(res.data.message + ` | Next box number will be: ${res.data.nextBoxNumber}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowCounterModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update counter');
    } finally {
      setCounterLoading(false);
    }
  };

  const stats = {
    total: boxes.length,
    available: boxes.filter(b => !b.isUsed).length,
    used: boxes.filter(b => b.isUsed).length,
    totalNetWeight: boxes.reduce((sum, b) => sum + (toNumber(b.netWeight) || 0), 0)
  };

  return (
    <motion.div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <AnimatePresence>
        {error && (
          <motion.div className="fixed top-4 right-4 z-[100] p-4 bg-red-100 text-red-800 rounded-xl border border-red-200 shadow-lg max-w-md" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-2"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
        {successMessage && (
          <motion.div className="fixed top-4 right-4 z-[100] p-4 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 shadow-lg max-w-md" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">{successMessage}</span>
              <button onClick={() => setSuccessMessage('')} className="ml-2"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <motion.div className="mb-8" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Box Management
                </h1>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">
                  Track and manage your box inventory
                </p>
              </div>
            </div>
            {!isMobile && (
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => { setCounterForm({ financialYear: getCurrentFY(), descriptionOfGoods: '', counterValue: '' }); setCurrentCounter(null); setShowCounterModal(true); }}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span>Counter</span>
                  </div>
                </motion.button>
                <motion.button
                  onClick={handlePrintSlips}
                  className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50 text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    <span>Print Slips</span>
                  </div>
                </motion.button>
                <motion.button
                  onClick={() => { setFormMode('create'); setShowFormModal(true); }}
                  className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Box</span>
                  </div>
                </motion.button>
                <motion.button
                  onClick={fetchBoxes}
                  className="p-2 text-slate-400 hover:text-violet-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div className="bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm hover:shadow-md transition-all" whileHover={{ y: -2 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100/50"><Package className="h-5 w-5 text-violet-600" /></div>
              <span className="text-sm font-medium text-slate-500">Total Boxes</span>
            </div>
            <p className="text-2xl font-bold text-violet-600">{stats.total}</p>
          </motion.div>
          <motion.div className="bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm hover:shadow-md transition-all" whileHover={{ y: -2 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
              <span className="text-sm font-medium text-slate-500">Available</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.available}</p>
          </motion.div>
          <motion.div className="bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm hover:shadow-md transition-all" whileHover={{ y: -2 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50"><XCircle className="h-5 w-5 text-red-600" /></div>
              <span className="text-sm font-medium text-slate-500">Used</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.used}</p>
          </motion.div>
          <motion.div className="bg-white rounded-2xl p-5 border border-slate-200/50 shadow-sm hover:shadow-md transition-all" whileHover={{ y: -2 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <span className="text-sm font-medium text-slate-500">Net Weight</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatPlainKg(stats.totalNetWeight)} kg</p>
          </motion.div>
        </div>

        {isMobile && (
          <>
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="mb-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-full font-medium shadow-sm hover:bg-slate-50">
                {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
                <span className="text-sm font-semibold">{showFilters ? 'Hide' : 'Show'} Filters</span>
              </div>
            </motion.button>
            <div className="flex items-center justify-start mb-4 gap-3 flex-wrap">
              <motion.button
                onClick={handleGenerateFilteredExcel}
                className="text-sm px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>Excel</span>
                </div>
              </motion.button>
              <motion.button
                onClick={handleGenerateFilteredPDF}
                className="text-sm px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </div>
              </motion.button>
              <motion.button
                onClick={handlePrintSlips}
                className="text-sm px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </div>
              </motion.button>
            </div>
          </>
        )}

        {(showFilters || !isMobile) && (
          <motion.div
            className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-800">Filters & Export</h2>
              </div>
              {!isMobile && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={fetchBoxes}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>Apply</span>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={clearFilters}
                    className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50 text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4" />
                      <span>Reset</span>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={handleGenerateFilteredExcel}
                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span>Excel</span>
                    </div>
                  </motion.button>
                  <motion.button
                    onClick={handleGenerateFilteredPDF}
                    className="px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>PDF</span>
                    </div>
                  </motion.button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {(!isMobile || showFilters) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Financial Year</label>
                      <select
                        value={filterFY}
                        onChange={(e) => setFilterFY(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        {buildFYOptions().map(fy => (<option key={fy} value={fy}>{fy}</option>))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Description</label>
                      <select
                        value={filterDescription}
                        onChange={(e) => setFilterDescription(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        <option value="">All Descriptions</option>
                        {availableDescriptions.map(d => (<option key={d} value={d}>{d}</option>))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2 mt-3 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        disabled={isLoading}
                      >
                        <option value="">All Statuses</option>
                        <option value="false">Available</option>
                        <option value="true">Used</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-64">
                        <input
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="Search box number..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-black bg-white"
                        />
                      </div>
                      {selectedBoxes.length > 0 && (
                        <div className="flex gap-2">
                          <motion.button
                            onClick={handleGenerateSelectedPDF}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium shadow-sm hover:bg-purple-700 text-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              <span>Selected PDF</span>
                            </div>
                          </motion.button>
                          <motion.button
                            onClick={handleGenerateSelectedExcel}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium shadow-sm hover:bg-emerald-700 text-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center gap-1.5">
                              <Download className="h-3.5 w-3.5" />
                              <span>Selected Excel</span>
                            </div>
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {selectedBoxes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm"
          >
            <span className="text-sm text-violet-700 font-medium">{selectedBoxes.length} box{selectedBoxes.length !== 1 ? 'es' : ''} selected</span>
            <div className="flex items-center gap-2">
              <button onClick={handlePrintSlips} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-all hover:shadow-md">
                <Printer className="h-3.5 w-3.5" /> Print Slips
              </button>
              <button onClick={() => setSelectedBoxes([])} className="text-xs text-violet-600 hover:text-violet-800 font-medium">Clear selection</button>
            </div>
          </motion.div>
        )}

        {!isLoading && !error && boxes.length === 0 && (
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Package className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-lg font-medium text-slate-800">No boxes found</h3>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or add a new box.</p>
            <div className="mt-6">
              <motion.button
                onClick={() => { setFormMode('create'); setShowFormModal(true); }}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add New Box</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}

        {boxes.length > 0 && (
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Box Records</h2>
              <motion.button
                onClick={fetchBoxes}
                className="p-2 text-slate-400 hover:text-violet-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            {isMobile ? (
              <div className="space-y-4">
                {boxes.map((box, index) => (
                  <motion.div
                    key={box._id}
                    className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedBoxes.includes(box._id)}
                          onChange={() => toggleBoxSelection(box._id)}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300 rounded"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <span className="text-sm font-semibold text-violet-600">{box.boxNumber}</span>
                          <p className="text-xs text-slate-500">{box.descriptionOfGoods}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(box.isUsed)}`}>
                        {box.isUsed ? 'Used' : 'Available'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-slate-600 mb-3">
                      <div><span className="text-xs text-slate-400">Net Wt</span><p className="font-medium">{formatKg(box.netWeight)}</p></div>
                      <div><span className="text-xs text-slate-400">Cops</span><p className="font-medium">{formatInt(box.cops)}</p></div>
                      <div><span className="text-xs text-slate-400">Date</span><p className="font-medium">{formatDisplayDate(box.createdAt)}</p></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <motion.button onClick={() => handleViewBox(box)} className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      {!box.isUsed && (
                        <>
                          <motion.button onClick={() => handleEditBox(box)} className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Edit3 className="h-4 w-4" />
                          </motion.button>
                          <motion.button onClick={() => handleDeleteBox(box._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto max-w-fit">
                <table className="max-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left w-10">
                        <input type="checkbox" onChange={toggleSelectAll} checked={selectedBoxes.length === boxes.length && boxes.length > 0} className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300 rounded" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Box #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Gross Wt</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Tare Wt</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Net Wt</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cops</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {boxes.map((box, index) => (
                      <motion.tr
                        key={box._id}
                        className={`hover:bg-slate-50 transition-colors ${selectedBoxes.includes(box._id) ? 'bg-violet-50' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="px-6 py-4">
                          <input type="checkbox" checked={selectedBoxes.includes(box._id)} onChange={() => toggleBoxSelection(box._id)} className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300 rounded" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="text-violet-600 font-semibold">{box.boxNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{box.descriptionOfGoods}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatPlainKg(box.grossWeight)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatPlainKg(box.tareWeight)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-medium">{formatPlainKg(box.netWeight)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatInt(box.cops)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">{formatDisplayDate(box.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(box.isUsed)}`}>
                            {box.isUsed ? 'Used' : 'Available'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <motion.button
                              onClick={() => handleViewBox(box)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                            {!box.isUsed && (
                              <>
                                <motion.button
                                  onClick={() => handleEditBox(box)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDeleteBox(box._id)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  disabled={isLoading}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {showFormModal && (
            <motion.div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">{formMode === 'create' ? 'Add New Box' : 'Edit Box'}</h2>
                  <motion.button onClick={() => setShowFormModal(false)} className="p-2 text-slate-400 hover:text-red-600" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input type="date" name="boxDate" value={formData.boxDate} onChange={handleFormChange} className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.boxDate ? 'border-red-500' : 'border-slate-200'}`} />
                      {formErrors.boxDate && <p className="mt-1 text-xs text-red-500">{formErrors.boxDate}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <select name="descriptionOfGoods" value={formData.descriptionOfGoods} onChange={handleFormChange} className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.descriptionOfGoods ? 'border-red-500' : 'border-slate-200'}`}>
                        <option value="">Select Description</option>
                        {availableDescriptions.map(desc => (<option key={desc} value={desc}>{desc}</option>))}
                      </select>
                      {formErrors.descriptionOfGoods && <p className="mt-1 text-xs text-red-500">{formErrors.descriptionOfGoods}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Box Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input type="text" name="boxNumber" value={formData.boxNumber} onChange={handleFormChange} readOnly={formMode === 'create'} className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formMode === 'create' ? 'bg-slate-50 cursor-not-allowed' : ''} ${formErrors.boxNumber ? 'border-red-500' : 'border-slate-200'}`} placeholder="Auto-generated" />
                      {isGeneratingBoxNumber && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-violet-500" />}
                    </div>
                    {formErrors.boxNumber && <p className="mt-1 text-xs text-red-500">{formErrors.boxNumber}</p>}
                    {formMode === 'create' && formData.boxNumber && (
                      <p className="text-xs text-slate-500 mt-1">Auto-generated based on description and date</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Gross Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input type="number" name="grossWeight" value={formData.grossWeight} onChange={handleFormChange} step="0.01" className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.grossWeight ? 'border-red-500' : 'border-slate-200'}`} />
                      {formErrors.grossWeight && <p className="mt-1 text-xs text-red-500">{formErrors.grossWeight}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Tare Weight (kg) <span className="text-red-500">*</span>
                      </label>
                      <input type="number" name="tareWeight" value={formData.tareWeight} onChange={handleFormChange} step="0.01" className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.tareWeight ? 'border-red-500' : 'border-slate-200'}`} />
                      {formErrors.tareWeight && <p className="mt-1 text-xs text-red-500">{formErrors.tareWeight}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Net Weight (kg)
                      </label>
                      <input type="text" value={formData.netWeight} readOnly className="w-full p-2 text-sm text-black border border-slate-200 rounded-lg bg-slate-50 font-medium" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Cops <span className="text-red-500">*</span>
                      </label>
                      <input type="number" name="cops" value={formData.cops} onChange={handleFormChange} step="1" className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.cops ? 'border-red-500' : 'border-slate-200'}`} />
                      {formErrors.cops && <p className="mt-1 text-xs text-red-500">{formErrors.cops}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Cops Weight (kg)
                      </label>
                      <input type="number" name="copsWeight" value={formData.copsWeight} onChange={handleFormChange} step="0.01" className={`w-full p-2 text-sm text-black border rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${formErrors.copsWeight ? 'border-red-500' : 'border-slate-200'}`} />
                      {formErrors.copsWeight && <p className="mt-1 text-xs text-red-500">{formErrors.copsWeight}</p>}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <motion.button type="button" onClick={() => setShowFormModal(false)} className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium shadow-sm hover:bg-slate-50" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      Cancel
                    </motion.button>
                    <motion.button type="submit" disabled={isLoading} className={`px-6 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg font-medium shadow-sm ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {isLoading ? <RefreshCw className="h-4 w-4 animate-spin inline mr-2" /> : null}
                      {isLoading ? 'Processing...' : (formMode === 'create' ? 'Create Box' : 'Update Box')}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPrintModal && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)}>
              <motion.div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.3 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-50 rounded-xl"><Printer className="h-5 w-5 text-violet-600" /></div>
                    <h2 className="text-xl font-bold text-slate-800">Print Box Slips</h2>
                  </div>
                  <button onClick={() => setShowPrintModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="h-5 w-5" /></button>
                </div>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-slate-700"><span className="font-semibold text-blue-700">{selectedBoxes.length}</span> box{selectedBoxes.length !== 1 ? 'es' : ''} selected for printing</p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Enter Lot Number: <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" value={printLotNo} onChange={(e) => setPrintLotNo(e.target.value)} className="w-full px-4 py-3 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white" placeholder="You can leave this empty" />
                  <p className="text-xs text-slate-500 mt-1">If left blank, slips will print without lot number</p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setShowPrintModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium">Cancel</button>
                  <button onClick={() => handlePrint(printLotNo.trim())} className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl font-medium transition-all hover:from-violet-700 hover:to-blue-700">Print Slips</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDetail && detailBox && (
            <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowDetail(false); setDetailEditMode(false); }} />
              <motion.div className="absolute right-0 top-0 h-full w-full sm:w-[720px] bg-white shadow-2xl border-l border-slate-200 flex flex-col" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Box Details</h3>
                    <p className="text-xs text-slate-500">Box #{detailBox.boxNumber}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!detailBox.isUsed && (
                      <button onClick={() => setDetailEditMode(v => !v)} className={`px-3 py-1.5 rounded-lg text-white text-sm transition-colors ${detailEditMode ? 'bg-slate-500 hover:bg-slate-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{detailEditMode ? 'Cancel' : 'Edit'}</button>
                    )}
                    <button onClick={() => { setShowDetail(false); setDetailEditMode(false); }} className="p-2 rounded-lg hover:bg-slate-100"><X className="h-5 w-5 text-slate-600" /></button>
                  </div>
                </div>

                {detailBox.isUsed && (
                  <div className="mx-5 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> This box is Used in a challan and cannot be edited.
                  </div>
                )}

                {detailErrors.form && (
                  <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{detailErrors.form}</div>
                )}

                <div className="flex-1 overflow-y-auto p-5">
                  {!detailEditMode ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Box Number</p>
                            <p className="text-xl font-bold text-slate-800">{detailBox.boxNumber}</p>
                          </div>
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${detailBox.isUsed ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {detailBox.isUsed ? 'Used' : 'Available'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">{detailBox.descriptionOfGoods}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Gross Weight</p>
                          <p className="text-slate-800 font-medium">{formatPlainKg(detailBox.grossWeight)} kg</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Tare Weight</p>
                          <p className="text-slate-800 font-medium">{formatPlainKg(detailBox.tareWeight)} kg</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Net Weight</p>
                          <p className="text-slate-800 font-medium">{formatPlainKg(detailBox.netWeight)} kg</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Cops</p>
                          <p className="text-slate-800 font-medium">{formatInt(detailBox.cops)}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Cops Weight</p>
                          <p className="text-slate-800 font-medium">{formatPlainKg(detailBox.copsWeight)} kg</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Financial Year</p>
                          <p className="text-slate-800 font-medium">{detailBox.financialYear}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Created At</p>
                          <p className="text-slate-800 font-medium">{formatDisplayDate(detailBox.createdAt)}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-200 bg-white">
                          <p className="text-xs font-semibold text-slate-500 mb-0.5">Updated At</p>
                          <p className="text-slate-800 font-medium">{formatDisplayDate(detailBox.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Box Number</label>
                        <input name="boxNumber" value={detailLocal.boxNumber} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.boxNumber ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`} />
                        {detailErrors.boxNumber && <p className="text-xs text-red-500 mt-1">{detailErrors.boxNumber}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
                        <select name="descriptionOfGoods" value={detailLocal.descriptionOfGoods} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.descriptionOfGoods ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`}>
                          <option value="">Select Description</option>
                          {availableDescriptions.map(desc => (<option key={desc} value={desc}>{desc}</option>))}
                        </select>
                        {detailErrors.descriptionOfGoods && <p className="text-xs text-red-500 mt-1">{detailErrors.descriptionOfGoods}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Gross Weight (kg)</label>
                        <input name="grossWeight" type="number" step="0.01" value={detailLocal.grossWeight} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.grossWeight ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`} />
                        {detailErrors.grossWeight && <p className="text-xs text-red-500 mt-1">{detailErrors.grossWeight}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Tare Weight (kg)</label>
                        <input name="tareWeight" type="number" step="0.01" value={detailLocal.tareWeight} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.tareWeight ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`} />
                        {detailErrors.tareWeight && <p className="text-xs text-red-500 mt-1">{detailErrors.tareWeight}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Net Weight (kg)</label>
                        <input type="text" value={detailLocal.netWeight} readOnly className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-800 border-slate-200" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Cops</label>
                        <input name="cops" type="number" step="1" value={detailLocal.cops} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.cops ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`} />
                        {detailErrors.cops && <p className="text-xs text-red-500 mt-1">{detailErrors.cops}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Cops Weight (kg)</label>
                        <input name="copsWeight" type="number" step="0.01" value={detailLocal.copsWeight} onChange={handleDetailChange} className={`w-full px-3 py-2 border rounded-lg bg-white transition-colors ${detailErrors.copsWeight ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-violet-500`} />
                        {detailErrors.copsWeight && <p className="text-xs text-red-500 mt-1">{detailErrors.copsWeight}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {detailEditMode && !detailBox.isUsed && (
                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setDetailEditMode(false)} className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors">Cancel</button>
                    <button onClick={handleDetailSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">Save Changes</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCounterModal && (
            <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative" initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.3 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-xl"><Hash className="h-5 w-5 text-amber-600" /></div>
                    <h2 className="text-xl font-bold text-slate-800">Counter Settings</h2>
                  </div>
                  <button onClick={() => setShowCounterModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"><X className="h-5 w-5" /></button>
                </div>

                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800"><AlertCircle className="h-4 w-4 inline mr-1" /> Use this to set the starting box number when you begin using the software mid-year. For example, if your current box number is <strong>1145</strong>, enter <strong>1145</strong> and the next box will be <strong>1146</strong>.</p>
                </div>

                <form onSubmit={handleSaveCounter} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Financial Year</label>
                      <select name="financialYear" value={counterForm.financialYear} onChange={handleCounterChange} className="w-full px-4 py-3 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white">
                        {buildFYOptions().map(fy => (<option key={fy} value={fy}>{fy}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                      <select name="descriptionOfGoods" value={counterForm.descriptionOfGoods} onChange={handleCounterChange} className="w-full px-4 py-3 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white">
                        <option value="">Select Description</option>
                        {availableDescriptions.map(desc => (<option key={desc} value={desc}>{desc}</option>))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Counter Value <span className="text-red-500">*</span></label>
                    <input type="number" name="counterValue" value={counterForm.counterValue} onChange={handleCounterChange} className="w-full px-4 py-3 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white" placeholder="e.g. 1145" min="0" required />
                    <p className="text-xs text-slate-500 mt-1">Enter the last used box number. The next box will be this number + 1.</p>
                  </div>

                  {currentCounter && currentCounter.counter !== null && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">Current counter in database: <strong>{currentCounter.counter}</strong>. Next box number will be: <strong>{currentCounter.counter + 1}</strong></p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={() => setShowCounterModal(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-medium">Cancel</button>
                    <button type="submit" disabled={counterLoading} className={`px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium transition-all hover:from-amber-600 hover:to-orange-700 ${counterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {counterLoading ? <RefreshCw className="h-4 w-4 animate-spin inline mr-2" /> : null}
                      {counterLoading ? 'Saving...' : 'Save Counter'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default BoxListPage;
