import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import AttendanceService from '../../services/AttendanceService';
import WorkerService from '../../services/WorkerService';

const AttendanceReportsPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workers, setWorkers] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  const fetchAttendanceData = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      setReportData([]);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await AttendanceService.getAttendanceRecords({
        startDate,
        endDate,
        workerId: selectedWorkerId || undefined
      });
      
      if (Array.isArray(response)) {
        setReportData(response);
      } else {
        setReportData([]);
        setError("No attendance data available for selected period");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch report.';
      setError(errMsg);
      setReportData([]);
      console.error("Fetch report error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedWorkerId]);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await WorkerService.getAllWorkers({ active: true });
        setWorkers(response.data || []);
      } catch (err) {
        console.error("Failed to fetch workers:", err);
      }
    };
    fetchWorkers();
    if (startDate && endDate) {
      fetchAttendanceData();
    }
  }, [fetchAttendanceData, startDate, endDate]);

  const handleDownloadPdf = async () => {
    try {
      setError(''); // Clear any previous errors
      
      const response = await AttendanceService.getAttendanceRecords({
        startDate,
        endDate,
        workerId: selectedWorkerId || undefined,
        format: 'pdf'
      });
      
      // Check if we got a valid blob response
      if (!response.data || !(response.data instanceof Blob)) {
        throw new Error('Invalid PDF response received from server');
      }
      
      // Check if the blob is actually a PDF (not an error response)
      if (response.data.type === 'application/json') {
        // This means we got an error response as JSON instead of PDF
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Failed to generate PDF');
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('PDF download error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to download PDF.';
      setError(errMsg);
    }
  };

  const getStatusCellStyle = (status) => {
    if (!status) return 'bg-gray-50 text-gray-500';
    
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-700';
      case 'Absent': return 'bg-red-100 text-red-700';
      case 'Half Day': return 'bg-yellow-100 text-yellow-700';
      case 'Leave': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-50 text-gray-500';
    }
  };

  const computeSummary = (records) => {
    const summary = {
      day: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 },
      night: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 },
    };

    records.forEach(record => {
      const dayStatus = record?.shifts?.day?.status;
      if (dayStatus && summary.day[dayStatus] !== undefined) {
        summary.day[dayStatus]++;
      }

      const nightStatus = record?.shifts?.night?.status;
      if (nightStatus && summary.night[nightStatus] !== undefined) {
        summary.night[nightStatus]++;
      }
    });

    return summary;
  };

  // Group records by worker for display
  const groupedData = reportData.reduce((acc, record) => {
    if (!acc[record.worker._id]) {
      acc[record.worker._id] = {
        worker: record.worker,
        records: []
      };
    }
    acc[record.worker._id].records.push(record);
    return acc;
  }, {});

  // Get all unique dates in the report data
  const allDates = [...new Set(
    reportData.map(record => record.date.split('T')[0])
  )].sort();

  return (
    <motion.div
      className="container mx-auto p-6 md:p-10 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <motion.h1
          className="text-3xl sm:text-4xl font-extrabold text-gray-800"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Attendance Reports
        </motion.h1>
        <div className="flex items-center gap-3">
          <Link
            to="/attendance"
            className="text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
          >
            Mark Attendance →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Workers</option>
            {workers.map(w => (
              <option key={`worker-${w._id}`} value={w._id}>
                {w.name} ({w.workerId || 'N/A'})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end">
          <button
            onClick={fetchAttendanceData}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isLoading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {!isLoading && reportData.length > 0 && (
        <motion.div
          className="my-6 flex justify-start"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <button
            onClick={handleDownloadPdf}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Download PDF Report
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            className="mb-6 p-4 bg-red-50 text-red-500 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          className="text-center text-gray-600 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-center items-center gap-2">
            <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading report data...</span>
          </div>
        </motion.div>
      )}

      {!isLoading && reportData.length === 0 && !error && (
        <motion.div
          className="text-center text-gray-600 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          No attendance records found for the selected criteria.
        </motion.div>
      )}

      {!isLoading && reportData.length > 0 && (
        <motion.div
          className="bg-white shadow-lg rounded-xl overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <table className="min-w-full divide-y divide-gray-200 border">
            <thead className="bg-gray-100 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 bg-gray-100 z-30 px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Worker Name</th>
                <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">ID</th>
                {allDates.map(date => (
                  <th key={`date-header-${date}`} className="px-1.5 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">
                    {new Date(date).getUTCDate()}
                    <br />
                    <span className="text-xxs font-normal">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                    </span>
                  </th>
                ))}
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Day P</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Day A</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Day H</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Day L</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Night P</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Night A</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Night H</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-r">Night L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(groupedData).map(({ worker, records }) => {
                const summary = computeSummary(records);
                return (
                  <tr key={`worker-${worker._id}`} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white hover:bg-gray-50 z-10 px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-800 border-r">
                      {worker.name}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500 border-r">
                      {worker.workerId || 'N/A'}
                    </td>
                    {allDates.map(date => {
                      const record = records.find(r => r.date.split('T')[0] === date);
                      const dayStatus = record?.shifts?.day?.status;
                      const nightStatus = record?.shifts?.night?.status;
                      
                      return (
                        <td
                          key={`status-${worker._id}-${date}`}
                          className="px-1.5 py-2 text-center text-xs font-medium border-r"
                        >
                          {dayStatus && (
                            <div className={`mb-1 ${getStatusCellStyle(dayStatus)}`}>
                              D: {dayStatus.charAt(0)}
                            </div>
                          )}
                          {nightStatus && (
                            <div className={getStatusCellStyle(nightStatus)}>
                              N: {nightStatus.charAt(0)}
                            </div>
                          )}
                          {!dayStatus && !nightStatus && '-'}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.day.Present}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.day.Absent}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.day['Half Day']}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.day.Leave}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.night.Present}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.night.Absent}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.night['Half Day']}</td>
                    <td className="px-2 py-2 text-center text-xs font-medium border-r">{summary.night.Leave}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-800 transition-colors">
          ← Back to Dashboard
        </Link>
      </motion.div>
    </motion.div>
  );
};

export default AttendanceReportsPage;