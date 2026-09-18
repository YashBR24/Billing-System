import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ArrowUpDown,
  CreditCard,
  BarChart3,
  Download,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LedgerService from '../../services/ComapnyLedgerService';

const PAGE_SIZE = 15;

const CompanyBillModal = ({ companyId, companyName, onClose }) => {
  const [activeTab, setActiveTab] = useState('bills');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [billSummary, setBillSummary] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [availableFYs, setAvailableFYs] = useState([]);

  const [outstandingData, setOutstandingData] = useState(null);
  const [isOutstandingLoading, setIsOutstandingLoading] = useState(false);
  const [outstandingError, setOutstandingError] = useState('');
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const [selectedFY, setSelectedFY] = useState('all');
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('billDate');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchBillData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError('');
    try {
      const params = { companyId };
      if (selectedFY && selectedFY !== 'all') params.financialYear = selectedFY;

      const [billRes, ledgerRes, fyRes] = await Promise.all([
        LedgerService.getCompanyBillSummary(params),
        LedgerService.getCompanyLedger({ companyId }),
        LedgerService.getCompanyFinancialYears({ companyId }),
      ]);

      setBillSummary(billRes.data);
      setLedgerData(ledgerRes.data);
      setAvailableFYs(fyRes.data.financialYears || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load company data.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedFY]);

  useEffect(() => {
    fetchBillData();
  }, [fetchBillData]);

  const fetchOutstandingData = useCallback(async () => {
    if (!companyId) return;
    setIsOutstandingLoading(true);
    setOutstandingError('');
    try {
      const params = { companyId };
      if (selectedFY && selectedFY !== 'all') params.financialYear = selectedFY;
      const res = await LedgerService.getCompanyOutstanding(params);
      setOutstandingData(res.data);
    } catch (err) {
      setOutstandingError(err.response?.data?.message || err.message || 'Failed to load outstanding data.');
    } finally {
      setIsOutstandingLoading(false);
    }
  }, [companyId, selectedFY]);

  useEffect(() => {
    if (activeTab === 'outstanding') {
      fetchOutstandingData();
    }
  }, [activeTab, fetchOutstandingData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFY, billStatusFilter, searchTerm, activeTab]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const filteredBills = useMemo(() => {
    if (!billSummary?.bills) return [];
    let bills = [...billSummary.bills];

    if (billStatusFilter !== 'all') {
      bills = bills.filter((b) => b.status === billStatusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      bills = bills.filter(
        (b) =>
          (b.billNumber && b.billNumber.toLowerCase().includes(term)) ||
          (b.challanNumber && b.challanNumber.toLowerCase().includes(term))
      );
    }

    bills.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'billNumber' || sortField === 'challanNumber') {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'outstanding') {
        valA = a.outstanding || 0;
        valB = b.outstanding || 0;
      } else {
        valA = valA || 0;
        valB = valB || 0;
      }
      if (sortField === 'billDate' || sortField === 'dueDate') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return bills;
  }, [billSummary?.bills, billStatusFilter, searchTerm, sortField, sortDir]);

  const totalPages = Math.ceil(filteredBills.length / PAGE_SIZE);
  const paginatedBills = filteredBills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filteredOutstandingBills = useMemo(() => {
    if (!outstandingData?.bills) return [];
    let bills = [...outstandingData.bills];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      bills = bills.filter(
        (b) =>
          (b.billNumber && b.billNumber.toLowerCase().includes(term)) ||
          (b.challanNumber && b.challanNumber.toLowerCase().includes(term))
      );
    }

    bills.sort((a, b) => (b.dueDays || 0) - (a.dueDays || 0));
    return bills;
  }, [outstandingData?.bills, searchTerm]);

  const filteredTotalBillAmount = filteredOutstandingBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const filteredTotalOutstanding = filteredOutstandingBills.reduce((sum, b) => sum + (b.outstanding || 0), 0);

  const handleDownloadOutstandingPDF = () => {
    if (!outstandingData || filteredOutstandingBills.length === 0) return;
    setIsPdfExporting(true);
    try {
      const rows = filteredOutstandingBills;
      const doc = new jsPDF('portrait', 'mm', 'a4');

      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 12;
      const MR = 12;

      const PURPLE = [107, 33, 168];
      const SLATE_D = [30, 41, 59];
      const SLATE_M = [71, 85, 105];
      const SLATE_B = [226, 232, 240];
      const WHITE = [255, 255, 255];

      const addFooter = () => {
        doc.setFillColor(...PURPLE);
        doc.rect(0, 0, PW, 10, 'F');
        doc.setFillColor(...SLATE_B);
        doc.rect(0, PH - 8, PW, 8, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_M);
        doc.text(
          `Outstanding Report  |  ${companyName}  |  ${selectedFY === 'all' ? 'All Financial Years' : `FY ${selectedFY}`}`,
          ML,
          PH - 3
        );
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, PW - MR, PH - 3, { align: 'right' });
      };

      addFooter();

      let y = 16;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PURPLE);
      doc.text('COMPANY OUTSTANDING REPORT', PW / 2, y, { align: 'center' });

      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE_M);
      doc.text(companyName, PW / 2, y, { align: 'center' });

      y += 5;
      doc.setFontSize(8);
      doc.text(`Financial Year: ${selectedFY === 'all' ? 'All' : selectedFY}`, PW / 2, y, { align: 'center' });

      y += 4;
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, PW / 2, y, { align: 'center' });

      y += 5;
      doc.setDrawColor(...SLATE_B);
      doc.setLineWidth(0.4);
      doc.line(ML, y, PW - MR, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SLATE_D);
      doc.text(`Outstanding Bills: ${rows.length}`, ML, y);
      doc.text(
        `Overdue Bills: ${rows.filter((b) => b.status === 'Overdue').length}`,
        PW / 2,
        y
      );
      doc.text(
        `Total Outstanding: ${formatCurrency(filteredTotalOutstanding)}`,
        PW - MR,
        y,
        { align: 'right' }
      );

      y += 5;

      autoTable(doc, {
        startY: y,
        head: [['Bill No', 'Date', 'Due Date', 'Bill Amount', 'Paid', 'Outstanding', 'Due Days', 'Status']],
        body: rows.map((b) => [
          b.billNumber || '-',
          formatDate(b.billDate),
          formatDate(b.dueDate),
          { content: formatCurrency(b.totalAmount), styles: { halign: 'right' } },
          { content: formatCurrency(b.totalPaidAmount), styles: { halign: 'right' } },
          { content: formatCurrency(b.outstanding), styles: { halign: 'right' } },
          b.dueDays > 0 ? `${b.dueDays} days left` : b.dueDays < 0 ? `${Math.abs(b.dueDays)} days` : 'Due today',
          b.status,
        ]),
        foot: [[
          'Total',
          '',
          '',
          { content: formatCurrency(filteredTotalBillAmount), styles: { halign: 'right' } },
          '',
          { content: formatCurrency(filteredTotalOutstanding), styles: { halign: 'right' } },
          '',
          '',
        ]],
        theme: 'grid',
        headStyles: { fillColor: PURPLE, fontSize: 8, textColor: WHITE },
        bodyStyles: { fontSize: 8 },
        footStyles: { fillColor: [241, 245, 249], textColor: SLATE_D, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: ML, right: MR },
        didDrawPage: () => addFooter(),
      });

      doc.save(
        `Outstanding_Report_${(companyName || 'Company').replace(/\s+/g, '_')}_${selectedFY === 'all' ? 'AllFY' : selectedFY}.pdf`
      );
    } catch (err) {
      console.error('Outstanding PDF export failed:', err);
      setOutstandingError('Failed to generate PDF.');
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleDownloadLedgerPDF = () => {
    if (!ledgerData || !ledgerData.ledgerEntries || ledgerData.ledgerEntries.length === 0) return;
    setIsPdfExporting(true);
    try {
      const entries = ledgerData.ledgerEntries;
      const summary = ledgerData.summary;

      const rupee = (v) =>
        v != null
          ? `Rs.${Math.abs(Number(v)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '-';

      const PURPLE = [107, 33, 168];
      const SLATE_D = [30, 41, 59];
      const SLATE_M = [71, 85, 105];
      const SLATE_B = [226, 232, 240];
      const STRIPE = [241, 245, 249];
      const WHITE = [255, 255, 255];
      const GREEN = [21, 128, 61];
      const RED = [185, 28, 28];
      const BLUE = [29, 78, 216];
      const BLUE_B = [219, 234, 254];
      const RED_B = [254, 226, 226];
      const PURPLE_L = [237, 233, 254];
      const AMBER = [146, 64, 14];
      const AMBER_B = [254, 243, 199];
      const ROSE = [159, 18, 57];
      const ROSE_B = [255, 228, 230];
      const EMERALD = [6, 95, 70];
      const EMERALD_B = [209, 250, 229];
      const ORANGE = [194, 65, 12];
      const ORANGE_B = [255, 237, 213];

      const typeColor = (type = '') => {
        if (type.includes('Sale')) return { text: [21, 128, 61], bg: [220, 252, 231] };
        if (type.includes('Purchase')) return { text: [185, 28, 28], bg: [254, 226, 226] };
        if (type.includes('Credit')) return { text: [107, 33, 168], bg: [237, 233, 254] };
        if (type.includes('Debit')) return { text: [146, 64, 14], bg: [254, 243, 199] };
        if (type.includes('Interest')) return { text: [159, 18, 57], bg: [255, 228, 230] };
        if (type.includes('Payment')) return { text: [29, 78, 216], bg: [219, 234, 254] };
        return { text: [71, 85, 105], bg: [248, 250, 252] };
      };

      const doc = new jsPDF('portrait', 'mm', 'a4');
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const ML = 12, MR = 12;
      const USE = PW - ML - MR;

      const fyLabel = selectedFY === 'all' ? 'All Financial Years' : `FY ${selectedFY}`;

      const addPageDecorations = () => {
        doc.setFillColor(...PURPLE);
        doc.rect(0, 0, PW, 10, 'F');
        doc.setFillColor(...SLATE_B);
        doc.rect(0, PH - 8, PW, 8, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...SLATE_M);
        doc.text(`Confidential  |  ${companyName}  |  ${fyLabel}`, ML, PH - 3);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, PW - MR, PH - 3, { align: 'right' });
      };

      addPageDecorations();

      let y = 16;
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PURPLE);
      doc.text('COMPANY LEDGER REPORT', PW / 2, y, { align: 'center' });
      y += 7;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SLATE_M);
      doc.text(companyName, PW / 2, y, { align: 'center' });
      y += 5;

      doc.setFontSize(8);
      doc.text(`Financial Year: ${fyLabel}`, PW / 2, y, { align: 'center' });
      y += 4;
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, PW / 2, y, { align: 'center' });
      y += 5;

      doc.setDrawColor(...SLATE_B);
      doc.setLineWidth(0.4);
      doc.line(ML, y, PW - MR, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PURPLE);
      doc.text('Financial Summary', ML, y);
      y += 5;

      const drawCard = (x, cy, w, h, label, value, fgColor, bgColor) => {
        doc.setFillColor(...bgColor);
        doc.roundedRect(x, cy, w, h, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...fgColor);
        doc.text(label, x + 3, cy + 5);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(value, x + 3, cy + 11);
      };

      const cardW = (USE - 6) / 3;
      const cardH = 14;
      const cardGap = 3;

      drawCard(ML, y, cardW, cardH, 'Total Sales', rupee(summary.totalSales), BLUE, BLUE_B);
      drawCard(ML + cardW + cardGap, y, cardW, cardH, 'Total Purchases', rupee(summary.totalPurchases), RED, RED_B);
      drawCard(ML + (cardW + cardGap) * 2, y, cardW, cardH, 'Credit Notes', rupee(summary.totalCreditNotes), PURPLE, PURPLE_L);
      y += cardH + 3;

      drawCard(ML, y, cardW, cardH, 'Debit Notes', rupee(summary.totalDebitNotes), AMBER, AMBER_B);
      drawCard(ML + cardW + cardGap, y, cardW, cardH, 'Interest Notes', rupee(summary.totalInterestNotes), ROSE, ROSE_B);
      drawCard(ML + (cardW + cardGap) * 2, y, cardW, cardH, 'Payments Received', rupee(summary.totalPaymentsReceived), EMERALD, EMERALD_B);
      y += cardH + 3;

      drawCard(ML, y, cardW, cardH, 'Payments Made', rupee(summary.totalPaymentsMade), RED, RED_B);
      drawCard(ML + cardW + cardGap, y, cardW, cardH, 'Adjusted Sales', rupee(summary.adjustedSales || 0), BLUE, BLUE_B);
      drawCard(ML + (cardW + cardGap) * 2, y, cardW, cardH, 'Adjusted Purchases', rupee(summary.adjustedPurchases || 0), ORANGE, ORANGE_B);
      y += cardH + 4;

      const isReceivable = summary.balanceType === 'Receivable';
      doc.setFillColor(...(isReceivable ? EMERALD : RED));
      doc.roundedRect(ML, y, USE, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(`NET BALANCE:  ${rupee(summary.netBalance)}  (${(summary.balanceType || '').toUpperCase()})`, PW / 2, y + 6.5, { align: 'center' });
      y += 16;

      doc.setDrawColor(...SLATE_B);
      doc.line(ML, y, PW - MR, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PURPLE);
      doc.text('Ledger Entries', ML, y);
      y += 4;

      const COL_W = [USE * 0.11, USE * 0.13, USE * 0.40, USE * 0.18, USE * 0.18];

      const tableBody = entries.map(entry => [
        formatDate(entry.date),
        entry.type || '',
        entry.description || '',
        entry.debit ? rupee(entry.debit) : '',
        entry.credit ? rupee(entry.credit) : '',
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Date', 'Type', 'Description', 'Debit', 'Credit']],
        body: tableBody,
        columnStyles: {
          0: { cellWidth: COL_W[0], halign: 'center', valign: 'middle' },
          1: { cellWidth: COL_W[1], halign: 'center', fontStyle: 'bold', valign: 'middle' },
          2: { cellWidth: COL_W[2], overflow: 'linebreak', valign: 'middle' },
          3: { cellWidth: COL_W[3], halign: 'right', fontStyle: 'bold', textColor: GREEN, valign: 'middle' },
          4: { cellWidth: COL_W[4], halign: 'right', fontStyle: 'bold', textColor: RED, valign: 'middle' },
        },
        headStyles: {
          fillColor: PURPLE,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: SLATE_D,
          cellPadding: { top: 4, bottom: 4, left: 2, right: 2 },
          lineColor: SLATE_B,
          lineWidth: 0.2,
        },
        alternateRowStyles: { fillColor: STRIPE },
        theme: 'grid',
        tableLineColor: SLATE_B,
        tableLineWidth: 0.25,
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 1) {
            const c = typeColor(data.cell.raw);
            data.cell.styles.textColor = c.text;
            data.cell.styles.fillColor = c.bg;
          }
        },
        didDrawPage() { addPageDecorations(); },
      });

      const lastY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...SLATE_M);
      doc.text(
        'This document is system-generated and confidential. All amounts are in INR. Debit = outflows, Credit = inflows.',
        PW / 2, lastY, { align: 'center', maxWidth: USE }
      );

      doc.save(`${companyName}_Ledger_${selectedFY === 'all' ? 'AllFY' : selectedFY}.pdf`);
    } catch (err) {
      console.error('Ledger PDF export failed:', err);
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return 'Rs.0.00';
    return `Rs.${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-700';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-700';
      case 'Overdue':
        return 'bg-red-100 text-red-700';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const summary = billSummary?.summary;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return (
      <ArrowUpDown className={`h-3 w-3 ${sortDir === 'asc' ? 'text-violet-600' : 'text-violet-600 rotate-180'}`} />
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] h-[92vh] flex flex-col overflow-hidden z-10"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 truncate">{companyName || 'Company Details'}</h2>
              <p className="text-xs text-slate-500">Bill Summary & Ledger Overview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 shrink-0">
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'bills'
                ? 'border-violet-600 text-violet-700 bg-violet-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Bill Summary
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'ledger'
                ? 'border-violet-600 text-violet-700 bg-violet-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'outstanding'
                ? 'border-violet-600 text-violet-700 bg-violet-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Outstanding
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-violet-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Loading data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200 max-w-md">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 font-medium mb-2">Error Loading Data</p>
                <p className="text-red-600 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchBillData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : activeTab === 'bills' ? (
            <div>
              {/* Summary Cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                  <SummaryCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Total Bills"
                    value={summary.totalBills}
                    gradient="from-blue-500 to-blue-600"
                    bgGradient="from-blue-50 to-blue-100"
                    textColor="text-blue-700"
                    isCount
                  />
                  <SummaryCard
                    icon={<CheckCircle className="h-4 w-4" />}
                    label="Paid Bills"
                    value={summary.paidBills}
                    gradient="from-emerald-500 to-emerald-600"
                    bgGradient="from-emerald-50 to-emerald-100"
                    textColor="text-emerald-700"
                    isCount
                  />
                  <SummaryCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Outstanding Bills"
                    value={summary.outstandingBills}
                    gradient="from-amber-500 to-amber-600"
                    bgGradient="from-amber-50 to-amber-100"
                    textColor="text-amber-700"
                    isCount
                  />
                  <SummaryCard
                    icon={<AlertTriangle className="h-4 w-4" />}
                    label="Overdue Bills"
                    value={summary.overdueBills}
                    gradient="from-red-500 to-red-600"
                    bgGradient="from-red-50 to-red-100"
                    textColor="text-red-700"
                    isCount
                  />
                  <SummaryCard
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Total Outstanding"
                    value={formatCurrency(summary.totalOutstandingAmount)}
                    gradient="from-rose-500 to-rose-600"
                    bgGradient="from-rose-50 to-rose-100"
                    textColor="text-rose-700"
                  />
                  <SummaryCard
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Total Received"
                    value={formatCurrency(summary.totalReceivedAmount)}
                    gradient="from-emerald-500 to-emerald-600"
                    bgGradient="from-emerald-50 to-emerald-100"
                    textColor="text-emerald-700"
                  />
                  <SummaryCard
                    icon={<Calendar className="h-4 w-4" />}
                    label="Last Bill Date"
                    value={formatDate(summary.lastBillDate)}
                    gradient="from-indigo-500 to-indigo-600"
                    bgGradient="from-indigo-50 to-indigo-100"
                    textColor="text-indigo-700"
                  />
                  <SummaryCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Avg. Payment Days"
                    value={summary.averagePaymentDays ? `${summary.averagePaymentDays} days` : 'N/A'}
                    gradient="from-purple-500 to-purple-600"
                    bgGradient="from-purple-50 to-purple-100"
                    textColor="text-purple-700"
                  />
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="all">All Financial Years</option>
                    {availableFYs.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={billStatusFilter}
                    onChange={(e) => setBillStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="all">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search bill/challan number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Bills Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th
                          onClick={() => handleSort('billNumber')}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <span className="flex items-center gap-1">
                            Bill No. <SortIcon field="billNumber" />
                          </span>
                        </th>
                        <th
                          onClick={() => handleSort('billDate')}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <span className="flex items-center gap-1">
                            Bill Date <SortIcon field="billDate" />
                          </span>
                        </th>
                        <th
                          onClick={() => handleSort('dueDate')}
                          className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <span className="flex items-center gap-1">
                            Due Date <SortIcon field="dueDate" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Challan No.
                        </th>
                        <th
                          onClick={() => handleSort('totalAmount')}
                          className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <span className="flex items-center justify-end gap-1">
                            Bill Amount <SortIcon field="totalAmount" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Paid
                        </th>
                        <th
                          onClick={() => handleSort('outstanding')}
                          className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none"
                        >
                          <span className="flex items-center justify-end gap-1">
                            Outstanding <SortIcon field="outstanding" />
                          </span>
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {paginatedBills.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center">
                            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 font-medium">No bills found</p>
                            <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedBills.map((bill) => (
                          <tr key={bill._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{bill.billNumber}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(bill.billDate)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(bill.dueDate)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{bill.challanNumber || '-'}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                              {formatCurrency(bill.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                              {formatCurrency(bill.totalPaidAmount)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                              {formatCurrency(bill.outstanding)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(bill.status)}`}>
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                    <p className="text-xs text-slate-500">
                      Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                      {Math.min(currentPage * PAGE_SIZE, filteredBills.length)} of {filteredBills.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-lg transition-all ${
                          currentPage === 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${
                              currentPage === pageNum
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded-lg transition-all ${
                          currentPage === totalPages
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'outstanding' ? (
            <div>
              {isOutstandingLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-violet-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Loading outstanding bills...</p>
                  </div>
                </div>
              ) : outstandingError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6 bg-red-50 rounded-xl border border-red-200 max-w-md">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 font-medium mb-2">Error Loading Outstanding</p>
                    <p className="text-red-600 text-sm mb-4">{outstandingError}</p>
                    <button
                      onClick={fetchOutstandingData}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {outstandingData?.summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                      <SummaryCard
                        icon={<Clock className="h-4 w-4" />}
                        label="Outstanding Bills"
                        value={outstandingData.summary.totalBills}
                        gradient="from-amber-500 to-amber-600"
                        bgGradient="from-amber-50 to-amber-100"
                        textColor="text-amber-700"
                        isCount
                      />
                      <SummaryCard
                        icon={<AlertTriangle className="h-4 w-4" />}
                        label="Overdue Bills"
                        value={outstandingData.summary.overdueBills}
                        gradient="from-red-500 to-red-600"
                        bgGradient="from-red-50 to-red-100"
                        textColor="text-red-700"
                        isCount
                      />
                      <SummaryCard
                        icon={<Clock className="h-4 w-4" />}
                        label="Pending"
                        value={outstandingData.summary.pendingBills}
                        gradient="from-yellow-500 to-yellow-600"
                        bgGradient="from-yellow-50 to-yellow-100"
                        textColor="text-yellow-700"
                        isCount
                      />
                      <SummaryCard
                        icon={<CreditCard className="h-4 w-4" />}
                        label="Partially Paid"
                        value={outstandingData.summary.partiallyPaidBills}
                        gradient="from-blue-500 to-blue-600"
                        bgGradient="from-blue-50 to-blue-100"
                        textColor="text-blue-700"
                        isCount
                      />
                      <SummaryCard
                        icon={<FileText className="h-4 w-4" />}
                        label="Total Bill Amount"
                        value={formatCurrency(outstandingData.summary.totalBillAmount)}
                        gradient="from-indigo-500 to-indigo-600"
                        bgGradient="from-indigo-50 to-indigo-100"
                        textColor="text-indigo-700"
                      />
                      <SummaryCard
                        icon={<DollarSign className="h-4 w-4" />}
                        label="Total Outstanding"
                        value={formatCurrency(outstandingData.summary.totalOutstanding)}
                        gradient="from-rose-500 to-rose-600"
                        bgGradient="from-rose-50 to-rose-100"
                        textColor="text-rose-700"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <select
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      >
                        <option value="all">All Financial Years</option>
                        {availableFYs.map((fy) => (
                          <option key={fy} value={fy}>
                            {fy}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search bill/challan number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                      />
                    </div>
                    <button
                      onClick={handleDownloadOutstandingPDF}
                      disabled={isPdfExporting || filteredOutstandingBills.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="h-4 w-4" />
                      {isPdfExporting ? 'Generating...' : 'Download PDF'}
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Bill No.
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Bill Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Bill Amount
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Paid
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Outstanding
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Due Days
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {filteredOutstandingBills.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center">
                                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 font-medium">No outstanding bills found</p>
                                <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
                              </td>
                            </tr>
                          ) : (
                            filteredOutstandingBills.map((bill) => (
                              <tr key={bill._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{bill.billNumber}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(bill.billDate)}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(bill.dueDate)}</td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                                  {formatCurrency(bill.totalAmount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                                  {formatCurrency(bill.totalPaidAmount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                                  {formatCurrency(bill.outstanding)}
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                  {bill.dueDays > 0 ? (
                                    <span className="font-semibold text-emerald-600">{bill.dueDays} days left</span>
                                  ) : bill.dueDays < 0 ? (
                                    <span className="font-semibold text-red-600">{Math.abs(bill.dueDays)} days</span>
                                  ) : (
                                    <span className="font-semibold text-slate-500">Due today</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(bill.status)}`}>
                                    {bill.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {filteredOutstandingBills.length > 0 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <p className="text-xs text-slate-500">
                          Total Bill Amount: <span className="font-semibold text-slate-700">{formatCurrency(filteredTotalBillAmount)}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Total Outstanding: <span className="font-semibold text-red-600">{formatCurrency(filteredTotalOutstanding)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Ledger Tab */
            <div>
              {ledgerData?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                  <SummaryCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Total Sales"
                    value={formatCurrency(ledgerData.summary.totalSales)}
                    gradient="from-blue-500 to-blue-600"
                    bgGradient="from-blue-50 to-blue-100"
                    textColor="text-blue-700"
                  />
                  <SummaryCard
                    icon={<BarChart3 className="h-4 w-4" />}
                    label="Total Purchases"
                    value={formatCurrency(ledgerData.summary.totalPurchases)}
                    gradient="from-orange-500 to-orange-600"
                    bgGradient="from-orange-50 to-orange-100"
                    textColor="text-orange-700"
                  />
                  <SummaryCard
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Payments Received"
                    value={formatCurrency(ledgerData.summary.totalPaymentsReceived)}
                    gradient="from-emerald-500 to-emerald-600"
                    bgGradient="from-emerald-50 to-emerald-100"
                    textColor="text-emerald-700"
                  />
                  <SummaryCard
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Payments Made"
                    value={formatCurrency(ledgerData.summary.totalPaymentsMade)}
                    gradient="from-red-500 to-red-600"
                    bgGradient="from-red-50 to-red-100"
                    textColor="text-red-700"
                  />
                  <SummaryCard
                    icon={<FileText className="h-4 w-4" />}
                    label="Credit Notes"
                    value={formatCurrency(ledgerData.summary.totalCreditNotes)}
                    gradient="from-purple-500 to-purple-600"
                    bgGradient="from-purple-50 to-purple-100"
                    textColor="text-purple-700"
                  />
                  <SummaryCard
                    icon={<DollarSign className="h-4 w-4" />}
                    label={`Net Balance (${ledgerData.summary.balanceType})`}
                    value={formatCurrency(ledgerData.summary.netBalance)}
                    gradient="from-violet-500 to-violet-600"
                    bgGradient="from-violet-50 to-violet-100"
                    textColor={ledgerData.summary.balanceType === 'Receivable' ? 'text-emerald-700' : 'text-red-700'}
                  />
                </div>
              )}

              {/* FY filter + Download PDF */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="all">All Financial Years</option>
                    {availableFYs.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleDownloadLedgerPDF}
                  disabled={isPdfExporting || !ledgerData?.ledgerEntries?.length}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {isPdfExporting ? 'Generating...' : 'Download PDF'}
                </button>
              </div>

              {ledgerData?.ledgerEntries?.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit'].map((header) => (
                            <th
                              key={header}
                              className={`px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider ${
                                header === 'Debit' || header === 'Credit' ? 'text-right' : ''
                              }`}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {ledgerData.ledgerEntries.map((entry, idx) => (
                          <tr key={`${entry.referenceId}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(entry.date)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`font-semibold ${
                                  entry.type.includes('Sale')
                                    ? 'text-green-600'
                                    : entry.type.includes('Purchase')
                                    ? 'text-red-600'
                                    : entry.type.includes('Credit') || entry.type.includes('Interest')
                                    ? 'text-orange-600'
                                    : 'text-slate-600'
                                }`}
                              >
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{entry.docNo}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 max-w-[250px] truncate" title={entry.description}>
                              {entry.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                              {entry.debit ? entry.debit.toFixed(2) : ''}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                              {entry.credit ? entry.credit.toFixed(2) : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-medium">No ledger entries found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const SummaryCard = ({ icon, label, value, gradient, bgGradient, textColor, isCount }) => (
  <div className={`relative p-3 bg-gradient-to-br ${bgGradient} rounded-xl border border-slate-200/50 overflow-hidden`}>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
        <span className="text-xs font-medium text-slate-600 truncate">{label}</span>
      </div>
      <p className={`text-sm font-bold ${textColor}`}>
        {isCount ? value : value}
      </p>
    </div>
  </div>
);

export default CompanyBillModal;
