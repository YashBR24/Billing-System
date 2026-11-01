// import React, { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   Eye,
//   Download,
//   FileText,
//   ChevronLeft,
//   ChevronRight,
//   Filter,
//   RefreshCw,
//   ArrowLeft,
//   X,
//   Building2,
//   DollarSign,
//   TrendingUp,
//   BarChart3,
//   Sparkles,
//   Calendar,
//   SlidersHorizontal
// } from 'lucide-react';
// import LedgerService from '../../services/ComapnyLedgerService';
// import CompanyService from '../../services/CompanyService';
// import moment from 'moment';

// const LedgerListPage = () => {
//   const [ledgerData, setLedgerData] = useState(null);
//   const [companiesSummary, setCompaniesSummary] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [isExporting, setIsExporting] = useState(false);
//   const [exportError, setExportError] = useState('');
//   const [selectedEntry, setSelectedEntry] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [companies, setCompanies] = useState([]);
//   const [filterCompanyId, setFilterCompanyId] = useState('all');
//   const [filterStartDate, setFilterStartDate] = useState('');
//   const [filterEndDate, setFilterEndDate] = useState('');
//   const [filterMonth, setFilterMonth] = useState('');
//   const [filterYear, setFilterYear] = useState('');
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   const [showFilters, setShowFilters] = useState(false);

//   // Handle window resize
//   useEffect(() => {
//     const handleResize = () => {
//       setIsMobile(window.innerWidth < 768);
//       if (window.innerWidth >= 768) {
//         setShowFilters(true);
//       } else {
//         setShowFilters(false);
//       }
//     };

//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   // Helper function to format dates for input fields (YYYY-MM-DD)
//   const formatDateForInput = (date) => {
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const day = String(date.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   };

//   // Set initial date filters to current month
//   useEffect(() => {
//     const today = new Date();
//     const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     setFilterStartDate(formatDateForInput(firstDay));
//     setFilterEndDate(formatDateForInput(lastDay));
//     setFilterMonth(String(today.getMonth() + 1).padStart(2, '0'));
//     setFilterYear(String(today.getFullYear()));
//   }, []);

//   // Fetch companies and initial summary
//   useEffect(() => {
//     const fetchInitialData = async () => {
//       setIsLoading(true);
//       try {
//         const companyRes = await CompanyService.getAllCompanies();
//         setCompanies(companyRes.data);
//         const summaryRes = await LedgerService.getCompaniesLedgerSummary();
//         setCompaniesSummary(summaryRes.data.companiesSummary || []);
//       } catch {
//         setError('Failed to load initial page data.');
//       }
//       setIsLoading(false);
//     };
//     fetchInitialData();
//   }, []);

//   // Fetch ledger data based on filters
//   const fetchLedgerData = useCallback(async () => {
//     setIsLoading(true);
//     setError('');
//     const params = {};
//     if (filterCompanyId && filterCompanyId !== 'all') {
//       params.companyId = filterCompanyId;
//     }
//     if (filterStartDate && filterEndDate) {
//       params.startDate = filterStartDate;
//       params.endDate = filterEndDate;
//     } else if (filterMonth && filterYear) {
//       params.month = filterMonth;
//       params.year = filterYear;
//     }
//     try {
//       let response;
//       if (filterCompanyId === 'all') {
//         response = await LedgerService.getCompaniesLedgerSummary(params);
//         const aggregatedEntriesArrays = await Promise.all(
//           response.data.companiesSummary.map(async summary => {
//             const company = summary.company;
//             const ledgerRes = await LedgerService.getCompanyLedger({ companyId: company._id, ...params });
//             return ledgerRes.data.ledgerEntries.map(entry => ({
//               ...entry,
//               companyName: company.name
//             }));
//           })
//         );
//         const aggregatedEntries = aggregatedEntriesArrays.flat();
//         setLedgerData({
//           company: { name: 'All Companies' },
//           ledgerEntries: aggregatedEntries.sort((a, b) => new Date(a.date) - new Date(b.date)),
//           summary: response.data.grandTotals,
//           dateRange: response.data.dateRange
//         });
//       } else {
//         response = await LedgerService.getCompanyLedger(params);
//         setLedgerData({
//           ...response.data,
//           ledgerEntries: response.data.ledgerEntries.map(entry => ({
//             ...entry,
//             companyName: response.data.company.name
//           }))
//         });
//       }
//     } catch (err) {
//       const errMsg = err.response?.data?.message || err.message || 'Failed to fetch ledger data.';
//       setError(errMsg);
//       setLedgerData(null);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [filterCompanyId, filterStartDate, filterEndDate, filterMonth, filterYear]);

//   useEffect(() => {
//     fetchLedgerData();
//   }, [fetchLedgerData]);

//   // Handle month navigation
//   const handleMonthChange = (direction) => {
//     let newMonth = parseInt(filterMonth, 10);
//     let newYear = parseInt(filterYear, 10);
//     if (direction === 'prev') {
//       newMonth--;
//       if (newMonth < 1) {
//         newMonth = 12;
//         newYear--;
//       }
//     } else {
//       newMonth++;
//       if (newMonth > 12) {
//         newMonth = 1;
//         newYear++;
//       }
//     }
//     const newFirstDay = new Date(newYear, newMonth - 1, 1);
//     const newLastDay = new Date(newYear, newMonth, 0);
//     setFilterMonth(String(newMonth).padStart(2, '0'));
//     setFilterYear(String(newYear));
//     setFilterStartDate(formatDateForInput(newFirstDay));
//     setFilterEndDate(formatDateForInput(newLastDay));
//   };

//   // Export functions
//   const handleExportExcel = async () => {
//     setIsExporting(true);
//     setExportError('');
//     try {
//       const params = buildExportParams();
//       const fileName = `${ledgerData?.company?.name || 'ledger'}_Ledger_${filterStartDate}_to_${filterEndDate}.xlsx`;
//       const response = await LedgerService.downloadCompanyLedgerExcel(params);
//       LedgerService.triggerDownload(response.data, fileName);
//     } catch (err) {
//       setExportError(err.response?.data?.message || 'Failed to export to Excel');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const handleExportPDF = async () => {
//     setIsExporting(true);
//     setExportError('');

//     try {
//       if (!filterStartDate || !filterEndDate) {
//         throw new Error('Please select a date range');
//       }

//       const response = await LedgerService.downloadCompanyLedgerPDF({
//         companyId: filterCompanyId,
//         startDate: filterStartDate,
//         endDate: filterEndDate,
//         month: filterMonth,
//         year: filterYear
//       });

//       const fileName = `Ledger_${
//         filterCompanyId === 'all' ? 'All_Companies' : ledgerData?.company?.name || ''
//       }_${moment(filterStartDate).format('YYYYMMDD')}-${moment(filterEndDate).format('YYYYMMDD')}.pdf`;

//       const url = window.URL.createObjectURL(new Blob([response.data]));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', fileName);
//       document.body.appendChild(link);
//       link.click();
//       link.parentNode.removeChild(link);

//     } catch (error) {
//       const errorMsg = error.response?.data?.message ||
//                      error.message ||
//                      'Failed to export PDF';
//       setExportError(errorMsg);
//       console.error('Export error:', error);
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   const buildExportParams = () => {
//     const params = {};
//     params.companyId = filterCompanyId || 'all';

//     if (filterStartDate && filterEndDate) {
//       params.startDate = filterStartDate;
//       params.endDate = filterEndDate;
//     } else if (filterMonth && filterYear) {
//       params.month = filterMonth;
//       params.year = filterYear;
//     }
//     return params;
//   };

//   // View ledger entry details
//   const handleViewEntry = (entry) => {
//     setSelectedEntry(entry);
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setSelectedEntry(null);
//   };

//   // Close modal on Escape key press
//   useEffect(() => {
//     const handleEsc = (event) => {
//       if (event.key === 'Escape' && isModalOpen) {
//         closeModal();
//       }
//     };
//     window.addEventListener('keydown', handleEsc);
//     return () => window.removeEventListener('keydown', handleEsc);
//   }, [isModalOpen]);

//   const formatDisplayDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     return new Date(dateString).toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric'
//     });
//   };

//   const clearFilters = () => {
//     setFilterCompanyId('all');
//     const today = new Date();
//     const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
//     const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
//     setFilterStartDate(formatDateForInput(firstDay));
//     setFilterEndDate(formatDateForInput(lastDay));
//     setFilterMonth(String(today.getMonth() + 1).padStart(2, '0'));
//     setFilterYear(String(today.getFullYear()));
//     if (isMobile) setShowFilters(false);
//   };

//   if (isLoading && !ledgerData && companiesSummary.length === 0) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
//         <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
//           <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
//           <p className="text-slate-600 font-medium">Loading ledger data...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <motion.div
//       className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.5 }}
//     >
//       <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
//         {/* Header Section */}
//         <motion.div
//           className="mb-4"
//           initial={{ y: -20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ duration: 0.4 }}
//         >
//           <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
//             <div className="flex items-center gap-3">
//               <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
//                 <FileText className="h-6 w-6 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
//                   Company Ledger
//                 </h1>
//                 <p className="text-slate-500 text-xs lg:text-sm font-medium">
//                   Track and manage company transactions
//                 </p>
//               </div>
//             </div>

//             <div className="flex flex-wrap gap-3">
//               {isMobile && (
//                 <motion.button
//                   onClick={() => setShowFilters(!showFilters)}
//                   className={`px-3 py-2 rounded-xl font-semibold text-xs transition-all duration-200 ${
//                     showFilters
//                       ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
//                       : "bg-white text-slate-700 hover:bg-slate-50 shadow-md border border-slate-200"
//                   }`}
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                 >
//                   {showFilters ? (
//                     <>
//                       <X className="h-4 w-4 mr-2 inline" />
//                       Hide Filters
//                     </>
//                   ) : (
//                     <>
//                       <SlidersHorizontal className="h-4 w-4 mr-2 inline" />
//                       Filters
//                     </>
//                   )}
//                 </motion.button>
//               )}
//             </div>
//           </div>
//         </motion.div>

//         {/* Summary Cards */}
//         <motion.div
//           className="grid grid-cols-3 lg:grid-cols-3 gap-4 mb-8"
//           initial={{ y: 20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ duration: 0.5, delay: 0.1 }}
//         >
//           <StatCard
//             title="Total Sales"
//             value={ledgerData?.summary?.totalSales || 0}
//             icon={<TrendingUp className="h-5 w-5" />}
//             gradient="from-blue-500 to-blue-600"
//             bgGradient="from-blue-50 to-blue-100"
//             isLoading={isLoading}
//           />
//           <StatCard
//             title="Total Purchases"
//             value={ledgerData?.summary?.totalPurchases || 0}
//             icon={<BarChart3 className="h-5 w-5" />}
//             gradient="from-orange-500 to-orange-600"
//             bgGradient="from-orange-50 to-orange-100"
//             isLoading={isLoading}
//           />
//           <StatCard
//             title="Net Balance"
//             value={ledgerData?.summary?.netBalance || 0}
//             subtitle={ledgerData?.summary?.balanceType}
//             icon={<DollarSign className="h-5 w-5" />}
//             gradient="from-emerald-500 to-emerald-600"
//             bgGradient="from-emerald-50 to-emerald-100"
//             isLoading={isLoading}
//           />
//         </motion.div>

//         {/* Export Error Display */}
//         <AnimatePresence>
//           {exportError && (
//             <motion.div
//               className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//             >
//               <div className="p-1 rounded-full bg-red-100">
//                 <X className="h-4 w-4" />
//               </div>
//               Export Error: {exportError}
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Filters Section */}
//         <AnimatePresence>
//           {(showFilters || !isMobile) && (
//             <motion.div
//               className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8"
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: "auto" }}
//               exit={{ opacity: 0, height: 0 }}
//               transition={{ duration: 0.3 }}
//             >
//               <div className="flex items-center justify-between mb-6">
//                 <div className="flex items-center gap-3">
//                   <div className="p-2.5 bg-violet-50 rounded-xl">
//                     <Filter className="h-5 w-5 text-violet-600" />
//                   </div>
//                   <h2 className="text-lg font-bold text-slate-800">Filters & Export</h2>
//                 </div>

//                 {/* Action Buttons Desktop */}
//                 <div className="hidden lg:flex flex-wrap gap-3">
//                   <motion.button
//                     onClick={fetchLedgerData}
//                     className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
//                     disabled={isLoading}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <Filter className="h-4 w-4" />
//                     <span>Apply Filters</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={clearFilters}
//                     className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
//                     disabled={isLoading}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <X className="h-4 w-4" />
//                     <span>Reset</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={handleExportExcel}
//                     className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2"
//                     disabled={isLoading || isExporting}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <Download className="h-4 w-4" />
//                     <span>Excel</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={handleExportPDF}
//                     className="px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2"
//                     disabled={isLoading || isExporting}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <FileText className="h-4 w-4" />
//                     <span>PDF</span>
//                   </motion.button>
//                 </div>
//               </div>

//               <div className="flex md:flex-row flex-col md:items-end items-start gap-4 md:flex-wrap">
//                 {/* Action Buttons Mobile */}
//                 <div className="lg:hidden flex flex-wrap gap-2 lg:gap-3">
//                   <motion.button
//                     onClick={fetchLedgerData}
//                     className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center"
//                     disabled={isLoading}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <Filter className="h-4 w-4 mr-2" />
//                     <span className="text-xs">Apply</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={clearFilters}
//                     className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
//                     disabled={isLoading}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <X className="h-4 w-4" />
//                     <span className="text-xs">Clear</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={handleExportExcel}
//                     className="px-3 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2"
//                     disabled={isLoading || isExporting}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <Download className="h-4 w-4" />
//                     <span className="text-xs">Excel</span>
//                   </motion.button>

//                   <motion.button
//                     onClick={handleExportPDF}
//                     className="px-3 py-2 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2"
//                     disabled={isLoading || isExporting}
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     <FileText className="h-4 w-4" />
//                     <span className="text-xs">PDF</span>
//                   </motion.button>
//                 </div>

//                 {/* Date Range */}
//                 <div className="w-full md:flex-1">
//                   <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
//                   <div className="flex items-center space-x-2">
//                     <motion.button
//                       onClick={() => handleMonthChange("prev")}
//                       className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
//                       disabled={isLoading}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                     >
//                       <ChevronLeft className="h-4 w-4 text-slate-600" />
//                     </motion.button>

//                     <div className="flex space-x-2 flex-1">
//                       <input
//                         type="date"
//                         value={filterStartDate}
//                         onChange={(e) => setFilterStartDate(e.target.value)}
//                         className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
//                       />
//                       <input
//                         type="date"
//                         value={filterEndDate}
//                         onChange={(e) => setFilterEndDate(e.target.value)}
//                         className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
//                       />
//                     </div>

//                     <motion.button
//                       onClick={() => handleMonthChange("next")}
//                       className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
//                       disabled={isLoading}
//                       whileHover={{ scale: 1.05 }}
//                       whileTap={{ scale: 0.95 }}
//                     >
//                       <ChevronRight className="h-4 w-4 text-slate-600" />
//                     </motion.button>
//                   </div>
//                 </div>

//                 {/* Company Filter */}
//                 <div className="w-full md:flex-1 md:min-w-[200px]">
//                   <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
//                   <select
//                     value={filterCompanyId}
//                     onChange={(e) => setFilterCompanyId(e.target.value)}
//                     className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
//                   >
//                     <option value="all">All Companies</option>
//                     {companies.map((company) => (
//                       <option key={company._id} value={company._id}>
//                         {company.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Modal for Ledger Entry Details */}
//         <AnimatePresence>
//           {isModalOpen && selectedEntry && (
//             <motion.div
//               className="fixed inset-0 z-50 flex items-center justify-center p-4"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//             >
//               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
//               <motion.div
//                 className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-6 z-10 overflow-auto max-h-[80vh]"
//                 initial={{ scale: 0.95, y: 20 }}
//                 animate={{ scale: 1, y: 0 }}
//                 exit={{ scale: 0.95, y: 20 }}
//                 transition={{ duration: 0.3 }}
//                 onClick={(e) => e.stopPropagation()}
//               >
//                 <div className="flex items-start justify-between mb-4">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-violet-50">
//                       <FileText className="h-5 w-5 text-violet-600" />
//                     </div>
//                     <div>
//                       <h3 className="text-lg font-bold text-slate-800">Ledger Entry Details</h3>
//                       <p className="text-sm text-slate-500">Entry information</p>
//                     </div>
//                   </div>
//                   <button
//                     onClick={closeModal}
//                     className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
//                   >
//                     <X className="h-5 w-5" />
//                   </button>
//                 </div>

//                 <div className="space-y-3">
//                   <div className="p-3 bg-slate-50 rounded-lg">
//                     <p className="text-xs text-slate-500 mb-1">Company</p>
//                     <p className="text-sm font-medium text-slate-800">{selectedEntry.companyName || 'N/A'}</p>
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div className="p-3 bg-slate-50 rounded-lg">
//                       <p className="text-xs text-slate-500 mb-1">Date</p>
//                       <p className="text-sm font-medium text-slate-800">{formatDisplayDate(selectedEntry.date)}</p>
//                     </div>
//                     <div className="p-3 bg-slate-50 rounded-lg">
//                       <p className="text-xs text-slate-500 mb-1">Type</p>
//                       <p className="text-sm font-medium text-slate-800">{selectedEntry.type}</p>
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div className="p-3 bg-slate-50 rounded-lg">
//                       <p className="text-xs text-slate-500 mb-1">Document No.</p>
//                       <p className="text-sm font-medium text-slate-800">{selectedEntry.docNo}</p>
//                     </div>
//                     <div className="p-3 bg-slate-50 rounded-lg">
//                       <p className="text-xs text-slate-500 mb-1">Reference Type</p>
//                       <p className="text-sm font-medium text-slate-800">{selectedEntry.referenceType}</p>
//                     </div>
//                   </div>

//                   <div className="p-3 bg-slate-50 rounded-lg">
//                     <p className="text-xs text-slate-500 mb-1">Description</p>
//                     <p className="text-sm font-medium text-slate-800">{selectedEntry.description}</p>
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
//                       <p className="text-xs text-emerald-600 mb-1">Debit</p>
//                       <p className="text-sm font-semibold text-emerald-700">
//                         {selectedEntry.debit ? `₹${selectedEntry.debit.toFixed(2)}` : 'N/A'}
//                       </p>
//                     </div>
//                     <div className="p-3 bg-red-50 rounded-lg border border-red-200">
//                       <p className="text-xs text-red-600 mb-1">Credit</p>
//                       <p className="text-sm font-semibold text-red-700">
//                         {selectedEntry.credit ? `₹${selectedEntry.credit.toFixed(2)}` : 'N/A'}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="p-3 bg-slate-50 rounded-lg">
//                     <p className="text-xs text-slate-500 mb-1">Reference ID</p>
//                     <p className="text-sm font-mono text-slate-800">{selectedEntry.referenceId}</p>
//                   </div>
//                 </div>

//                 <div className="mt-6 flex justify-end">
//                   <motion.button
//                     onClick={closeModal}
//                     className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
//                     whileHover={{ scale: 1.02 }}
//                     whileTap={{ scale: 0.98 }}
//                   >
//                     Close
//                   </motion.button>
//                 </div>
//               </motion.div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Error Display */}
//         <AnimatePresence>
//           {error && (
//             <motion.div
//               className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//             >
//               <div className="p-1 rounded-full bg-red-100">
//                 <X className="h-4 w-4" />
//               </div>
//               Error: {error}
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Ledger Table */}
//         {ledgerData?.ledgerEntries?.length > 0 ? (
//           <motion.div
//             className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden mb-8"
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5 }}
//           >
//             {isMobile ? (
//               <div className="divide-y divide-slate-100">
//                 {ledgerData.ledgerEntries.map((entry, index) => (
//                   <motion.div
//                     key={`${entry.referenceId}-${index}`}
//                     className="p-6 hover:bg-slate-50 transition-colors"
//                     initial={{ opacity: 0, x: -20 }}
//                     animate={{ opacity: 1, x: 0 }}
//                     transition={{ duration: 0.3, delay: index * 0.05 }}
//                   >
//                     <div className="flex justify-between items-start mb-4">
//                       <div>
//                         <button
//                           onClick={() => handleViewEntry(entry)}
//                           className="text-lg font-bold text-violet-600 hover:text-violet-800"
//                         >
//                           {entry.companyName}
//                         </button>
//                         <p className="text-slate-500 text-sm">{entry.docNo}</p>
//                       </div>
//                       <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
//                         entry.type.includes('Sale') || entry.type.includes('Made')
//                           ? 'bg-emerald-100 text-emerald-700'
//                           : 'bg-red-100 text-red-700'
//                       }`}>
//                         {entry.type}
//                       </span>
//                     </div>

//                     <div className="space-y-2 mb-4">
//                       <div className="flex justify-between text-sm">
//                         <span className="text-slate-500">Date:</span>
//                         <span className="text-slate-600">{formatDisplayDate(entry.date)}</span>
//                       </div>
//                       <div className="flex justify-between text-sm">
//                         <span className="text-slate-500">Debit:</span>
//                         <span className="font-semibold text-emerald-700">
//                           {entry.debit ? `₹${entry.debit.toFixed(2)}` : '-'}
//                         </span>
//                       </div>
//                       <div className="flex justify-between text-sm">
//                         <span className="text-slate-500">Credit:</span>
//                         <span className="font-semibold text-red-700">
//                           {entry.credit ? `₹${entry.credit.toFixed(2)}` : '-'}
//                         </span>
//                       </div>
//                     </div>

//                     <motion.button
//                       onClick={() => handleViewEntry(entry)}
//                       className="w-full px-4 py-2 bg-violet-50 text-violet-700 rounded-xl font-medium hover:bg-violet-100 transition-colors flex items-center justify-center gap-2"
//                       whileTap={{ scale: 0.95 }}
//                     >
//                       <Eye className="h-4 w-4" />
//                       <span className="text-sm">View Details</span>
//                     </motion.button>
//                   </motion.div>
//                 ))}
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-slate-200">
//                   <thead className="bg-slate-50">
//                     <tr>
//                       {['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Debit', 'Credit', 'Actions'].map((header) => (
//                         <th
//                           key={header}
//                           className={`px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider ${
//                             header === 'Debit' || header === 'Credit' || header === 'Actions' ? 'text-right' : ''
//                           }`}
//                         >
//                           {header}
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-slate-200">
//                     {ledgerData.ledgerEntries.map((entry, index) => (
//                       <motion.tr
//                         key={`${entry.referenceId}-${index}`}
//                         className="hover:bg-slate-50 transition-colors"
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.3, delay: index * 0.03 }}
//                       >
//                         <td className="px-6 py-4 text-sm text-slate-600 font-medium">{entry.companyName}</td>
//                         <td className="px-6 py-4 text-sm text-slate-600">{formatDisplayDate(entry.date)}</td>
//                         <td className="px-6 py-4 text-sm">
//                           <span className={`font-semibold ${
//                             entry.type.includes('Sale') || entry.type.includes('Made')
//                               ? 'text-emerald-600'
//                               : 'text-red-600'
//                           }`}>
//                             {entry.type}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 text-sm text-slate-600">{entry.docNo}</td>
//                         <td className="px-6 py-4 text-sm text-slate-700 max-w-[200px] truncate" title={entry.description}>
//                           {entry.description}
//                         </td>
//                         <td className="px-6 py-4 text-sm text-right font-semibold text-emerald-700">
//                           {entry.debit ? entry.debit.toFixed(2) : ''}
//                         </td>
//                         <td className="px-6 py-4 text-sm text-right font-semibold text-red-700">
//                           {entry.credit ? entry.credit.toFixed(2) : ''}
//                         </td>
//                         <td className="px-6 py-4 text-right text-sm font-medium">
//                           <motion.button
//                             onClick={() => handleViewEntry(entry)}
//                             className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
//                             whileHover={{ scale: 1.1 }}
//                             whileTap={{ scale: 0.9 }}
//                             title="View Details"
//                           >
//                             <Eye className="h-4 w-4" />
//                           </motion.button>
//                         </td>
//                       </motion.tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </motion.div>
//         ) : (
//           !isLoading && (
//             <motion.div
//               className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5 }}
//             >
//               <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
//                 <FileText className="h-12 w-12 text-slate-400" />
//               </div>
//               <h3 className="text-xl font-semibold text-slate-800 mb-2">No ledger entries found</h3>
//               <p className="text-slate-500">No ledger entries found matching your criteria.</p>
//             </motion.div>
//           )
//         )}

//         {/* Companies Summary Table */}
//         {companiesSummary.length > 0 && (
//           <motion.div
//             className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden mb-8"
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.5 }}
//           >
//             <div className="p-6 border-b border-slate-200">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-slate-100 rounded-lg">
//                   <Building2 className="h-5 w-5 text-slate-600" />
//                 </div>
//                 <h2 className="text-lg font-semibold text-slate-800">Companies Ledger Summary</h2>
//               </div>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-slate-200">
//                 <thead className="bg-slate-50">
//                   <tr>
//                     {['Company', 'Total Sales', 'Total Purchases', 'Payments Received', 'Payments Made', 'Net Balance'].map((header) => (
//                       <th
//                         key={header}
//                         className={`px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider ${
//                           header.includes('Total') || header.includes('Payments') || header === 'Net Balance' ? 'text-right' : ''
//                         }`}
//                       >
//                         {header}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-slate-200">
//                   {companiesSummary.map((summary, index) => (
//                     <motion.tr
//                       key={summary.company._id}
//                       className="hover:bg-slate-50 transition-colors"
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ duration: 0.3, delay: index * 0.05 }}
//                     >
//                       <td className="px-6 py-4 text-sm text-slate-600 font-medium">{summary.company.name}</td>
//                       <td className="px-6 py-4 text-sm text-right font-semibold text-blue-700">
//                         ₹{summary.totals.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                       </td>
//                       <td className="px-6 py-4 text-sm text-right font-semibold text-orange-700">
//                         ₹{summary.totals.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                       </td>
//                       <td className="px-6 py-4 text-sm text-right font-semibold text-emerald-700">
//                         ₹{summary.totals.totalPaymentsReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                       </td>
//                       <td className="px-6 py-4 text-sm text-right font-semibold text-red-700">
//                         ₹{summary.totals.totalPaymentsMade.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                       </td>
//                       <td className={`px-6 py-4 text-sm text-right font-bold ${
//                         summary.totals.balanceType === 'Receivable' ? 'text-emerald-700' : 'text-red-700'
//                       }`}>
//                         ₹{summary.totals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
//                         <span className="text-xs ml-1">({summary.totals.balanceType})</span>
//                       </td>
//                     </motion.tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </motion.div>
//         )}

//         {/* Back to Dashboard Link */}
//         <motion.div
//           className="mt-8 text-center"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.3, delay: 0.5 }}
//         >
//           <Link
//             to="/dashboard"
//             className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-medium transition-colors duration-200"
//           >
//             <ArrowLeft className="h-4 w-4" />
//             Back to Dashboard
//           </Link>
//         </motion.div>
//       </div>
//     </motion.div>
//   );
// };

// // Reusable StatCard Component
// const StatCard = ({ title, value, subtitle, icon, gradient, bgGradient, isLoading }) => (
//   <motion.div
//     className={`relative p-4 lg:p-6 bg-gradient-to-br ${bgGradient} rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
//     whileHover={{ y: -2 }}
//   >
//     <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

//     <div className="relative z-10">
//       <div className="flex items-center justify-center lg:justify-between mb-4">
//         <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
//           {icon}
//         </div>
//         <TrendingUp className="h-5 w-5 hidden lg:block text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
//       </div>
//       <div className='text-center lg:text-left'>
//         {isLoading ? (
//           <p className="text-slate-400">Loading...</p>
//         ) : (
//           <>
//             <p className="text-2xl font-bold text-slate-800 mb-1">
//               ₹{typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
//             </p>
//             <p className="text-sm font-medium text-slate-600">
//               {title}
//               {subtitle && <span className="text-xs ml-1">({subtitle})</span>}
//             </p>
//           </>
//         )}
//       </div>
//     </div>
//   </motion.div>
// );

// export default LedgerListPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  ArrowLeft,
  X,
  Building2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Sparkles,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import LedgerService from '../../services/ComapnyLedgerService';
import CompanyService from '../../services/CompanyService';
import moment from 'moment';

const LedgerListPage = () => {
  const [ledgerData, setLedgerData] = useState(null);
  const [companiesSummary, setCompaniesSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [currentSummaryIndex, setCurrentSummaryIndex] = useState(0);

  // Reset indices when data changes
  useEffect(() => {
    setCurrentEntryIndex(0);
  }, [ledgerData?.ledgerEntries]);

  useEffect(() => {
    setCurrentSummaryIndex(0);
  }, [companiesSummary]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowFilters(true);
      } else {
        setShowFilters(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper function to format dates for input fields (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set initial date filters to current month
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
    setFilterMonth(String(today.getMonth() + 1).padStart(2, '0'));
    setFilterYear(String(today.getFullYear()));
  }, []);

  // Fetch companies and initial summary
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const companyRes = await CompanyService.getAllCompanies();
        setCompanies(companyRes.data);
        const summaryRes = await LedgerService.getCompaniesLedgerSummary();
        setCompaniesSummary(summaryRes.data.companiesSummary || []);
      } catch {
        setError('Failed to load initial page data.');
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  // Fetch ledger data based on filters
  const fetchLedgerData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const params = {};
    if (filterCompanyId && filterCompanyId !== 'all') {
      params.companyId = filterCompanyId;
    }
    if (filterStartDate && filterEndDate) {
      params.startDate = filterStartDate;
      params.endDate = filterEndDate;
    } else if (filterMonth && filterYear) {
      params.month = filterMonth;
      params.year = filterYear;
    }
    try {
      let response;
      if (filterCompanyId === 'all') {
        response = await LedgerService.getCompaniesLedgerSummary(params);
        const aggregatedEntriesArrays = await Promise.all(
          response.data.companiesSummary.map(async summary => {
            const company = summary.company;
            const ledgerRes = await LedgerService.getCompanyLedger({ companyId: company._id, ...params });
            return ledgerRes.data.ledgerEntries.map(entry => ({
              ...entry,
              companyName: company.name
            }));
          })
        );
        const aggregatedEntries = aggregatedEntriesArrays.flat();
        const filteredEntries = filterType !== 'all'
          ? aggregatedEntries.filter(entry => filterType === 'Transaction'
            ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
            : entry.type === filterType)
          : aggregatedEntries;
        setLedgerData({
          company: { name: 'All Companies' },
          ledgerEntries: filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date)),
          summary: response.data.grandTotals,
          dateRange: response.data.dateRange
        });
      } else {
        response = await LedgerService.getCompanyLedger(params);
        const entries = response.data.ledgerEntries.map(entry => ({
          ...entry,
          companyName: response.data.company.name
        }));
        const filteredEntries = filterType !== 'all'
          ? entries.filter(entry => filterType === 'Transaction'
            ? (entry.type === 'Payment Received' || entry.type === 'Payment Made')
            : entry.type === filterType)
          : entries;
        setLedgerData({
          ...response.data,
          ledgerEntries: filteredEntries
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch ledger data.';
      setError(errMsg);
      setLedgerData(null);
    } finally {
      setIsLoading(false);
    }
  }, [filterCompanyId, filterStartDate, filterEndDate, filterMonth, filterYear, filterType]);

  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);

  // Handle month navigation
  const handleMonthChange = (direction) => {
    let newMonth = parseInt(filterMonth, 10);
    let newYear = parseInt(filterYear, 10);
    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }
    const newFirstDay = new Date(newYear, newMonth - 1, 1);
    const newLastDay = new Date(newYear, newMonth, 0);
    setFilterMonth(String(newMonth).padStart(2, '0'));
    setFilterYear(String(newYear));
    setFilterStartDate(formatDateForInput(newFirstDay));
    setFilterEndDate(formatDateForInput(newLastDay));
  };

  // Export functions
  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const entries = ledgerData.ledgerEntries;
      const summary = ledgerData.summary;
      const companyName = ledgerData.company.name;

      const wb = XLSX.utils.book_new();

      const wsData = [
        [`Company Ledger - ${companyName}`],
        [`Period: ${filterStartDate} to ${filterEndDate}`],
        [],
        ['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Amount', 'Credit (In)', 'Debit (Out)'],
      ];

      entries.forEach(entry => {
        wsData.push([
          entry.companyName || companyName,
          formatDisplayDate(entry.date),
          entry.type,
          entry.docNo || '',
          entry.description || '',
          entry.amount || 0,
          entry.credit || '',
          entry.debit || ''
        ]);
      });

      wsData.push([]);
      wsData.push(['Summary']);
      wsData.push(['Total Sales:', summary.totalSales || 0]);
      wsData.push(['Total Purchases:', summary.totalPurchases || 0]);
      wsData.push(['Payments Received:', summary.totalPaymentsReceived || 0]);
      wsData.push(['Payments Made:', summary.totalPaymentsMade || 0]);
      wsData.push(['Credit Notes:', summary.totalCreditNotes || 0]);
      wsData.push(['Debit Notes:', summary.totalDebitNotes || 0]);
      wsData.push(['Interest Notes:', summary.totalInterestNotes || 0]);
      wsData.push(['Net Balance:', `${summary.netBalance || 0} (${summary.balanceType || ''})`]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      XLSX.writeFile(wb, `${companyName}_Ledger_${filterStartDate}_to_${filterEndDate}.xlsx`);
    } catch (err) {
      setExportError(err.message || 'Failed to export to Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const entries = ledgerData.ledgerEntries;
      const summary = ledgerData.summary;
      const companyName = ledgerData.company.name;

      const doc = new jsPDF('portrait', 'mm', 'a4');

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const usableWidth = pageWidth - (margin * 2);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Company Ledger', pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(companyName, pageWidth / 2, 22, { align: 'center' });

      doc.setFontSize(8);
      doc.text(`Period: ${filterStartDate} to ${filterEndDate}`, margin, 30);
      if (filterType !== 'all') {
        doc.text(`Type: ${filterType}`, pageWidth - margin, 30, { align: 'right' });
      }

      const tableData = entries.map(entry => [
        entry.companyName || companyName,
        formatDisplayDate(entry.date),
        entry.type,
        entry.docNo || '',
        entry.description || '',
        entry.amount ? `₹${entry.amount.toFixed(2)}` : '',
        entry.credit ? `₹${entry.credit.toFixed(2)}` : '',
        entry.debit ? `₹${entry.debit.toFixed(2)}` : ''
      ]);

      autoTable(doc, {
        startY: 34,
        margin: { left: margin, right: margin },
        head: [['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Amount', 'Credit (In)', 'Debit (Out)']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [107, 33, 168],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2
        },
        bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: usableWidth * 0.18, fontStyle: 'bold' },
          1: { cellWidth: usableWidth * 0.09, halign: 'center' },
          2: { cellWidth: usableWidth * 0.12, fontStyle: 'bold', halign: 'center' },
          3: { cellWidth: usableWidth * 0.12, halign: 'center' },
          4: { cellWidth: usableWidth * 0.22 },
          5: { cellWidth: usableWidth * 0.09, halign: 'right' },
          6: { cellWidth: usableWidth * 0.09, halign: 'right', textColor: [0, 128, 0], fontStyle: 'bold' },
          7: { cellWidth: usableWidth * 0.09, halign: 'right', textColor: [200, 0, 0], fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 2) {
            const val = data.cell.raw;
            if (val === 'Sale') data.cell.styles.textColor = [0, 128, 0];
            else if (val === 'Purchase') data.cell.styles.textColor = [200, 0, 0];
          }
        },
        didDrawPage: function() {
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            pageWidth - margin,
            doc.internal.pageSize.getHeight() - 5,
            { align: 'right' }
          );
        }
      });

      const finalY = doc.lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', margin, finalY);

      doc.setDrawColor(107, 33, 168);
      doc.setLineWidth(0.5);
      doc.line(margin, finalY + 2, pageWidth - margin, finalY + 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const summaryLines = [
        `Total Sales: ₹${(summary.totalSales || 0).toFixed(2)}`,
        `Total Purchases: ₹${(summary.totalPurchases || 0).toFixed(2)}`,
        `Payments Received: ₹${(summary.totalPaymentsReceived || 0).toFixed(2)}`,
        `Payments Made: ₹${(summary.totalPaymentsMade || 0).toFixed(2)}`,
        `Credit Notes: ₹${(summary.totalCreditNotes || 0).toFixed(2)}`,
        `Debit Notes: ₹${(summary.totalDebitNotes || 0).toFixed(2)}`,
        `Interest Notes: ₹${(summary.totalInterestNotes || 0).toFixed(2)}`,
        `Net Balance: ₹${(summary.netBalance || 0).toFixed(2)} (${summary.balanceType || ''})`
      ];

      const col1X = margin;
      const col2X = pageWidth / 2;
      let y = finalY + 10;

      summaryLines.forEach((line, i) => {
        if (i < 4) {
          doc.text(line, col1X, y + (i * 7));
        } else {
          doc.text(line, col2X, y + ((i - 4) * 7));
        }
      });

      doc.save(`${companyName}_Ledger_${filterStartDate}_to_${filterEndDate}.pdf`);
    } catch (error) {
      setExportError(error.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const buildExportParams = () => {
    const params = {};
    params.companyId = filterCompanyId || 'all';

    if (filterStartDate && filterEndDate) {
      params.startDate = filterStartDate;
      params.endDate = filterEndDate;
    } else if (filterMonth && filterYear) {
      params.month = filterMonth;
      params.year = filterYear;
    }
    if (filterType && filterType !== 'all') {
      params.type = filterType;
    }
    return params;
  };

  // View ledger entry details
  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen]);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const clearFilters = () => {
    setFilterCompanyId('all');
    setFilterType('all');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFilterStartDate(formatDateForInput(firstDay));
    setFilterEndDate(formatDateForInput(lastDay));
    setFilterMonth(String(today.getMonth() + 1).padStart(2, '0'));
    setFilterYear(String(today.getFullYear()));
    if (isMobile) setShowFilters(false);
  };

  if (isLoading && !ledgerData && companiesSummary.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
          <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading ledger data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
        {/* Header Section */}
        <motion.div
          className="mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Company Ledger
                </h1>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">
                  Track and manage company transactions
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {isMobile && (
                <>
                <motion.button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-xl font-semibold text-xs transition-all duration-200 ${
                    showFilters
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-md border border-slate-200"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {showFilters ? (
                    <>
                      <X className="h-4 w-4 mr-2 inline" />
                      Hide Filters
                    </>
                  ) : (
                    <>
                      <SlidersHorizontal className="h-4 w-4 mr-2 inline" />
                      Filters
                    </>
                  )}
                </motion.button>
                <motion.button
                    onClick={handleExportExcel}
                    className="px-3 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-xs">Excel</span>
                  </motion.button>

                  <motion.button
                    onClick={handleExportPDF}
                    className="px-3 py-2 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">PDF</span>
                  </motion.button>
                  </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Export Error Display */}
        <AnimatePresence>
          {exportError && (
            <motion.div
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-1 rounded-full bg-red-100">
                <X className="h-4 w-4" />
              </div>
              Export Error: {exportError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Section */}
        <AnimatePresence>
          {(showFilters || !isMobile) && (
            <motion.div
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-violet-50 rounded-xl">
                    <Filter className="h-5 w-5 text-violet-600" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Filters</h2>
                </div>

                {/* Action Buttons Desktop */}
                <div className="hidden lg:flex flex-wrap gap-3">
                  <motion.button
                    onClick={fetchLedgerData}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4" />
                    <span>Apply Filters</span>
                  </motion.button>

                  <motion.button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" />
                    <span>Reset</span>
                  </motion.button>

                  <motion.button
                    onClick={handleExportExcel}
                    className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Download className="h-4 w-4" />
                    <span>Excel</span>
                  </motion.button>

                  <motion.button
                    onClick={handleExportPDF}
                    className="px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all flex items-center space-x-2"
                    disabled={isLoading || isExporting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileText className="h-4 w-4" />
                    <span>PDF</span>
                  </motion.button>
                </div>
              </div>

              <div className="flex md:flex-row flex-col md:items-end items-start gap-4 md:flex-wrap">
                {/* Action Buttons Mobile */}
                <div className="lg:hidden flex flex-wrap gap-2 lg:gap-3">
                  <motion.button
                    onClick={fetchLedgerData}
                    className="px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="text-xs">Apply</span>
                  </motion.button>

                  <motion.button
                    onClick={clearFilters}
                    className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all flex items-center space-x-2"
                    disabled={isLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <X className="h-4 w-4" />
                    <span className="text-xs">Clear</span>
                  </motion.button>
                </div>

                {/* Date Range */}
                <div className="w-full md:flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={() => handleMonthChange("prev")}
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      disabled={isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </motion.button>

                    <div className="flex space-x-2 flex-1">
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
                      />
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="px-2 py-2.5 text-sm border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white md:w-40 w-full"
                      />
                    </div>

                    <motion.button
                      onClick={() => handleMonthChange("next")}
                      className="p-2 lg:p-3 rounded-lg lg:rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                      disabled={isLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </motion.button>
                  </div>
                </div>

                {/* Company Filter */}
                <div className="w-full md:flex-1 md:min-w-[200px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                  <select
                    value={filterCompanyId}
                    onChange={(e) => setFilterCompanyId(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="all">All Companies</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div className="w-full md:flex-1 md:min-w-[200px]">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-2 py-2.5 lg:px-4 lg:py-3 border border-slate-200 text-black rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="Sale">Sale</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Transaction">Transaction</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Interest Note">Interest Note</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Tip */}
            <div className=" lg:hidden flex items-center justify-center gap-2 text-slate-500 text-xs mt-6 pb-6 px-4">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <span>For better experience, view on desktop</span>
            </div>

        {/* Summary Cards */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCard
            title="Total Sales"
            value={ledgerData?.summary?.totalSales || 0}
            icon={<TrendingUp className="h-5 w-5" />}
            gradient="from-blue-500 to-blue-600"
            bgGradient="from-blue-50 to-blue-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Purchases"
            value={ledgerData?.summary?.totalPurchases || 0}
            icon={<BarChart3 className="h-5 w-5" />}
            gradient="from-orange-500 to-orange-600"
            bgGradient="from-orange-50 to-orange-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Credit Notes"
            value={ledgerData?.summary?.totalCreditNotes || 0}
            subtitle={ledgerData?.summary?.processedCreditNotes !== undefined ? `₹${(ledgerData.summary.processedCreditNotes || 0).toFixed(2)} processed` : ''}
            icon={<FileText className="h-5 w-5" />}
            gradient="from-purple-500 to-purple-600"
            bgGradient="from-purple-50 to-purple-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Debit Notes"
            value={ledgerData?.summary?.totalDebitNotes || 0}
            subtitle={ledgerData?.summary?.processedDebitNotes !== undefined ? `₹${(ledgerData.summary.processedDebitNotes || 0).toFixed(2)} processed` : ''}
            icon={<FileText className="h-5 w-5" />}
            gradient="from-amber-500 to-amber-600"
            bgGradient="from-amber-50 to-amber-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Interest Notes"
            value={ledgerData?.summary?.totalInterestNotes || 0}
            subtitle={ledgerData?.summary?.paidInterestNotes !== undefined ? `₹${(ledgerData.summary.paidInterestNotes || 0).toFixed(2)} paid` : ''}
            icon={<Calendar className="h-5 w-5" />}
            gradient="from-rose-500 to-rose-600"
            bgGradient="from-rose-50 to-rose-100"
            isLoading={isLoading}
          />
          <StatCard
            title="Net Balance"
            value={ledgerData?.summary?.netBalance || 0}
            subtitle={ledgerData?.summary?.balanceType}
            icon={<DollarSign className="h-5 w-5" />}
            gradient="from-emerald-500 to-emerald-600"
            bgGradient="from-emerald-50 to-emerald-100"
            isLoading={isLoading}
          />
        </motion.div>

        {/* Modal for Ledger Entry Details */}
        <AnimatePresence>
          {isModalOpen && selectedEntry && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-auto p-6 z-10 overflow-auto max-h-[80vh]"
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-50">
                      <FileText className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Ledger Entry Details</h3>
                      <p className="text-sm text-slate-500">Entry information</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Company</p>
                    <p className="text-sm font-medium text-slate-800">{selectedEntry.companyName || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Date</p>
                      <p className="text-sm font-medium text-slate-800">{formatDisplayDate(selectedEntry.date)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Type</p>
                      <p className="text-sm font-medium text-slate-800">{selectedEntry.type}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Document No.</p>
                      <p className="text-sm font-medium text-slate-800">{selectedEntry.docNo}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Reference Type</p>
                      <p className="text-sm font-medium text-slate-800">{selectedEntry.referenceType}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Description</p>
                    <p className="text-sm font-medium text-slate-800">{selectedEntry.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Amount</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedEntry.amount ? `₹${selectedEntry.amount.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <p className="text-sm font-semibold">
                        {selectedEntry.status ? (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            selectedEntry.status === 'Processed' || selectedEntry.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : selectedEntry.status === 'Cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {selectedEntry.status}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                            Posted
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <p className="text-xs text-emerald-600 mb-1">Debit</p>
                      <p className="text-sm font-semibold text-emerald-700">
                        {selectedEntry.debit ? `₹${selectedEntry.debit.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-600 mb-1">Credit</p>
                      <p className="text-sm font-semibold text-red-700">
                        {selectedEntry.credit ? `₹${selectedEntry.credit.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Reference ID</p>
                    <p className="text-sm font-mono text-slate-800">{selectedEntry.referenceId}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <motion.button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-1 rounded-full bg-red-100">
                <X className="h-4 w-4" />
              </div>
              Error: {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* === DESKTOP VIEW === */}
        {!isMobile && (
          <>
            {/* Ledger Table */}
            {ledgerData?.ledgerEntries?.length > 0 ? (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Company', 'Date', 'Type', 'Doc No.', 'Description', 'Amount', 'Credit (In)', 'Debit (Out)', 'Actions'].map((header) => (
                          <th
                            key={header}
                            className={`px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider ${
                             header === 'Amount' || header === 'Credit (In)' || header === 'Debit (Out)' || header === 'Actions' ? 'text-right' : ''
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {ledgerData.ledgerEntries.map((entry, index) => (
                        <motion.tr
                          key={`${entry.referenceId}-${index}`}
                          className="hover:bg-slate-50 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.03 }}
                        >
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{entry.companyName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{formatDisplayDate(entry.date)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`font-semibold ${
                              entry.type.includes('Sale')
                                ? 'text-green-600'
                                : entry.type.includes('Purchase')
                                ? 'text-red-600'
                                : entry.type.includes('Credit') || entry.type.includes('Interest')
                                ? 'text-orange-600'
                                : 'text-slate-600'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{entry.docNo}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 max-w-[200px] truncate" title={entry.description}>
                            {entry.description}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-slate-700">
                            {entry.amount ? entry.amount.toFixed(2) : ''}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-emerald-700">
                            {entry.credit ? entry.credit.toFixed(2) : ''}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold text-red-700">
                            {entry.debit ? entry.debit.toFixed(2) : ''}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <motion.button
                              onClick={() => handleViewEntry(entry)}
                              className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </motion.button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ) : (
              !isLoading && (
                <motion.div
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                    <FileText className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No ledger entries found</h3>
                  <p className="text-slate-500">No ledger entries found matching your criteria.</p>
                </motion.div>
              )
            )}

            {/* Companies Summary Table */}
            {companiesSummary.length > 0 && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800">Companies Ledger Summary</h2>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Company', 'Total Sales', 'Total Purchases', 'Credit Notes', 'Debit Notes', 'Interest Notes', 'Payments Rec.', 'Payments Made', 'Net Balance'].map((header) => (
                          <th
                            key={header}
                            className={`px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider ${
                              header.includes('Total') || header.includes('Payments') || header.includes('Credit') || header.includes('Debit') || header.includes('Interest') || header === 'Net Balance' ? 'text-right' : ''
                            }`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {companiesSummary.map((summary, index) => (
                        <motion.tr
                          key={summary.company._id}
                          className="hover:bg-slate-50 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <td className="px-4 py-3 text-sm text-slate-600 font-medium">{summary.company.name}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-blue-700">
                            ₹{summary.totals.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-orange-700">
                            ₹{summary.totals.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-purple-700">
                            ₹{(summary.totals.totalCreditNotes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-amber-700">
                            ₹{(summary.totals.totalDebitNotes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-rose-700">
                            ₹{(summary.totals.totalInterestNotes || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-emerald-700">
                            ₹{summary.totals.totalPaymentsReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-red-700">
                            ₹{summary.totals.totalPaymentsMade.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-bold ${
                            summary.totals.balanceType === 'Receivable' ? 'text-emerald-700' : 'text-red-700'
                          }`}>
                            ₹{summary.totals.netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-xs ml-1">({summary.totals.balanceType})</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* === MOBILE VIEW: Card Layout with Navigation === */}
        {isMobile && (
          <>
            {/* Mobile Navigation */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-6">
              <div className="top-0 z-10 px-2 pb-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 uppercase">Ledger Entries</h3>
                <p className="text-xs text-slate-500">{currentEntryIndex + 1} of {ledgerData?.ledgerEntries?.length || 0}</p>
              </div>
            </div>

            {/* Ledger Cards */}
            {ledgerData?.ledgerEntries?.length > 0 ? (
              <div className="relative">
                <motion.div
                  key={`${ledgerData.ledgerEntries[currentEntryIndex].referenceId}-${currentEntryIndex}`}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 text-base truncate">
                        {ledgerData.ledgerEntries[currentEntryIndex].companyName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {ledgerData.ledgerEntries[currentEntryIndex].docNo}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-lg ${
                      ledgerData.ledgerEntries[currentEntryIndex].type.includes('Sale') || ledgerData.ledgerEntries[currentEntryIndex].type.includes('Debit') || ledgerData.ledgerEntries[currentEntryIndex].type.includes('Made')
                        ? 'bg-emerald-100 text-emerald-700' 
                        : ledgerData.ledgerEntries[currentEntryIndex].type.includes('Credit') || ledgerData.ledgerEntries[currentEntryIndex].type.includes('Interest')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {ledgerData.ledgerEntries[currentEntryIndex].type}
                    </span>
                    {ledgerData.ledgerEntries[currentEntryIndex].status && (
                      <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-lg ${
                        ledgerData.ledgerEntries[currentEntryIndex].status === 'Processed' || ledgerData.ledgerEntries[currentEntryIndex].status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : ledgerData.ledgerEntries[currentEntryIndex].status === 'Cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ledgerData.ledgerEntries[currentEntryIndex].status}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-slate-600 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="font-medium">
                          {formatDisplayDate(ledgerData.ledgerEntries[currentEntryIndex].date)}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Type</p>
                        <p className="font-medium">
                          {ledgerData.ledgerEntries[currentEntryIndex].type}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="font-medium truncate">
                        {ledgerData.ledgerEntries[currentEntryIndex].description || '-'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="font-medium">
                          {ledgerData.ledgerEntries[currentEntryIndex].amount ? `₹${ledgerData.ledgerEntries[currentEntryIndex].amount.toFixed(2)}` : '-'}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="font-medium">
                          {ledgerData.ledgerEntries[currentEntryIndex].status || 'Posted'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => handleViewEntry(ledgerData.ledgerEntries[currentEntryIndex])}
                      className="flex-1 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg font-medium hover:bg-violet-100 transition-colors flex items-center justify-center gap-1.5"
                      whileTap={{ scale: 0.97 }}
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">View Details</span>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-4 px-2">
                  <motion.button
                    onClick={() => setCurrentEntryIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentEntryIndex === 0}
                    className={`p-2 rounded-lg ${
                      currentEntryIndex === 0
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                    } transition-colors`}
                    whileHover={currentEntryIndex !== 0 ? { scale: 1.05 } : {}}
                    whileTap={currentEntryIndex !== 0 ? { scale: 0.95 } : {}}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </motion.button>
                  <div className="flex items-center gap-2">
                    {[...Array(Math.min(5, ledgerData.ledgerEntries.length))].map((_, i) => {
                      const pageIndex = Math.floor(currentEntryIndex / 5) * 5 + i;
                      if (pageIndex >= ledgerData.ledgerEntries.length) return null;
                      return (
                        <motion.button
                          key={pageIndex}
                          onClick={() => setCurrentEntryIndex(pageIndex)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            currentEntryIndex === pageIndex
                              ? 'bg-violet-600 scale-125'
                              : 'bg-slate-300 hover:bg-violet-400'
                          }`}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.8 }}
                        />
                      );
                    })}
                  </div>
                  <motion.button
                    onClick={() => setCurrentEntryIndex(prev => 
                      Math.min(ledgerData.ledgerEntries.length - 1, prev + 1)
                    )}
                    disabled={currentEntryIndex === ledgerData.ledgerEntries.length - 1}
                    className={`p-2 rounded-lg ${
                      currentEntryIndex === ledgerData.ledgerEntries.length - 1
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                    } transition-colors`}
                    whileHover={currentEntryIndex !== ledgerData.ledgerEntries.length - 1 ? { scale: 1.05 } : {}}
                    whileTap={currentEntryIndex !== ledgerData.ledgerEntries.length - 1 ? { scale: 0.95 } : {}}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No ledger entries found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters</p>
              </div>
            )}
            </div>

            {/* Companies Summary Cards with Navigation */}
            {companiesSummary.length > 0 && (
              <>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 mb-8"> 
                <div className="top-0 z-10 px-2 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 uppercase">Companies Summary</h3>
                    <p className="text-xs text-slate-500">{currentSummaryIndex + 1} of {companiesSummary.length}</p>
                  </div>
                </div>
                <div className="relative">
                  <motion.div
                    key={companiesSummary[currentSummaryIndex].company._id}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                        <Building2 className="h-4 w-4 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-slate-800 text-base truncate">
                        {companiesSummary[currentSummaryIndex].company.name}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-blue-600">Sales</p>
                        <p className="font-medium text-blue-700 truncate">
                          ₹{companiesSummary[currentSummaryIndex].totals.totalSales.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <p className="text-xs text-orange-600">Purchases</p>
                        <p className="font-medium text-orange-700 truncate">
                          ₹{companiesSummary[currentSummaryIndex].totals.totalPurchases.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xs text-purple-600">Credit Notes</p>
                        <p className="font-medium text-purple-700 truncate">
                          ₹{(companiesSummary[currentSummaryIndex].totals.totalCreditNotes || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-xs text-amber-600">Debit Notes</p>
                        <p className="font-medium text-amber-700 truncate">
                          ₹{(companiesSummary[currentSummaryIndex].totals.totalDebitNotes || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2">
                        <p className="text-xs text-rose-600">Interest</p>
                        <p className="font-medium text-rose-700 truncate">
                          ₹{(companiesSummary[currentSummaryIndex].totals.totalInterestNotes || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-emerald-50 rounded-lg p-2">
                        <p className="text-xs text-emerald-600">Received</p>
                        <p className="font-medium text-emerald-700 truncate">
                          ₹{companiesSummary[currentSummaryIndex].totals.totalPaymentsReceived.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-xs text-red-600">Paid</p>
                        <p className="font-medium text-red-700 truncate">
                          ₹{companiesSummary[currentSummaryIndex].totals.totalPaymentsMade.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-lg ${
                      companiesSummary[currentSummaryIndex].totals.balanceType === 'Receivable'
                        ? 'bg-emerald-50'
                        : 'bg-red-50'
                    }`}>
                      <p className={`text-xs ${
                        companiesSummary[currentSummaryIndex].totals.balanceType === 'Receivable'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>Net Balance</p>
                      <p className={`font-semibold ${
                        companiesSummary[currentSummaryIndex].totals.balanceType === 'Receivable'
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      } truncate`}>
                        ₹{companiesSummary[currentSummaryIndex].totals.netBalance.toLocaleString('en-IN')}
                        ({companiesSummary[currentSummaryIndex].totals.balanceType})
                      </p>
                    </div>
                  </motion.div>

                  {/* Summary Navigation */}
                  <div className="flex items-center justify-between mt-4 px-2">
                    <motion.button
                      onClick={() => setCurrentSummaryIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentSummaryIndex === 0}
                      className={`p-2 rounded-lg ${
                        currentSummaryIndex === 0
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                      } transition-colors`}
                      whileHover={currentSummaryIndex !== 0 ? { scale: 1.05 } : {}}
                      whileTap={currentSummaryIndex !== 0 ? { scale: 0.95 } : {}}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </motion.button>
                    <div className="flex items-center gap-2">
                      {[...Array(Math.min(5, companiesSummary.length))].map((_, i) => {
                        const pageIndex = Math.floor(currentSummaryIndex / 5) * 5 + i;
                        if (pageIndex >= companiesSummary.length) return null;
                        return (
                          <motion.button
                            key={pageIndex}
                            onClick={() => setCurrentSummaryIndex(pageIndex)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              currentSummaryIndex === pageIndex
                                ? 'bg-violet-600 scale-125'
                                : 'bg-slate-300 hover:bg-violet-400'
                            }`}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                          />
                        );
                      })}
                    </div>
                    <motion.button
                      onClick={() => setCurrentSummaryIndex(prev => 
                        Math.min(companiesSummary.length - 1, prev + 1)
                      )}
                      disabled={currentSummaryIndex === companiesSummary.length - 1}
                      className={`p-2 rounded-lg ${
                        currentSummaryIndex === companiesSummary.length - 1
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                      } transition-colors`}
                      whileHover={currentSummaryIndex !== companiesSummary.length - 1 ? { scale: 1.05 } : {}}
                      whileTap={currentSummaryIndex !== companiesSummary.length - 1 ? { scale: 0.95 } : {}}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
                </div>
              </>
            )}

            
          </>
        )}
      </div>
    </motion.div>
  );
};

// Reusable StatCard Component
const StatCard = ({ title, value, subtitle, icon, gradient, bgGradient, isLoading }) => (
  <motion.div
    className={`relative p-3 sm:p-4 bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -2 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <TrendingUp className=" h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
      </div>
      <div className="hidden sm:block text-center lg:text-left">
        {isLoading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            <p className="text-sm lg:text-2xl font-bold text-slate-800 mb-1">
              ₹{typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
            <p className="text-xs font-medium text-slate-600">
              {title}
              {subtitle && <span className="text-xs ml-1">({subtitle})</span>}
            </p>
          </>
        )}
      </div>
      <div className="sm:hidden flex flex-row text-left justify-between mt-6">
        {isLoading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">
              {title}
              {subtitle && <span className="text-xs ml-1">({subtitle})</span>}
            </p>
            <p className="text-xl lg:text-2xl font-bold text-slate-800">
              ₹{typeof value === 'number' ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </p>
          </>
        )}
      </div>
    </div>
  </motion.div>
);

export default LedgerListPage;