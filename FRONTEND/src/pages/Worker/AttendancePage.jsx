import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Coffee,
  Download,
  Filter,
  RefreshCw,
  ArrowLeft,
  UserCheck,
  UserX,
  CalendarDays,
  FileText,
  BarChart3,
  Sparkles,
  TrendingUp,
  Activity,
  Target
} from 'lucide-react';
import AttendanceService from '../../services/AttendanceService';
import WorkerService from '../../services/WorkerService';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const groupDatesIntoWeeks = (dates) => {
  if (!dates.length) return [];
  const sorted = [...dates].sort();
  const firstDate = new Date(sorted[0] + 'T00:00:00');
  const firstDow = firstDate.getDay(); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0

  const weeks = [];
  let week = [];
  for (let i = 0; i < offset; i++) week.push(null);

  sorted.forEach(ds => {
    const d = new Date(ds + 'T00:00:00');
    const dow = d.getDay();
    const monDow = dow === 0 ? 6 : dow - 1;
    if (monDow === 0 && week.length > 0 && week.length < 7) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
      week = [];
    }
    week.push(ds);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
};

const CalendarCell = ({ dateStr, dayStatus, nightStatus }) => {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : null;
  const dayNum = d ? d.getDate() : '';
  const hasAny = dayStatus || nightStatus;

  const getBg = (s) => s === 'Present' ? 'bg-emerald-100 text-emerald-700'
    : s === 'Absent' ? 'bg-red-100 text-red-700'
    : s === 'Half Day' ? 'bg-amber-100 text-amber-700'
    : s === 'Leave' ? 'bg-blue-100 text-blue-700'
    : 'bg-white text-slate-400';

  const hasBoth = dayStatus && nightStatus;
  const dayBg = getBg(dayStatus);
  const nightBg = getBg(nightStatus);

  // Determine dominant border color from whichever status is present
  const borderColor = dayStatus ? dayBg.split(' ')[0] : (nightStatus ? nightBg.split(' ')[0] : 'border-slate-200');

  return (
    <div className={`w-10 h-10 sm:w-11 sm:h-11 flex flex-col items-center justify-center rounded-md border ${borderColor} text-[9px] leading-tight relative`}>
      <span className="text-[8px] font-semibold text-slate-500 absolute top-0.5 left-1">{dayNum}</span>
      {hasBoth ? (
        <div className="flex flex-col items-center mt-1 gap-0.5">
          <span className={`px-1 rounded text-[7px] font-bold ${dayBg}`}>D:{dayStatus[0]}</span>
          <span className={`px-1 rounded text-[7px] font-bold ${nightBg}`}>N:{nightStatus[0]}</span>
        </div>
      ) : dayStatus ? (
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${dayBg}`}>{dayStatus[0]}</span>
      ) : nightStatus ? (
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${nightBg}`}>{nightStatus[0]}</span>
      ) : (
        <span className="text-[8px] text-slate-400 mt-1">—</span>
      )}
    </div>
  );
};

const AttendanceTable = ({ groupedData, allDates, getStatusCellStyle, computeSummary }) => {
  const totalSummary = Object.values(groupedData).reduce((acc, { records }) => {
    const s = computeSummary(records);
    acc.day.Present += s.day.Present;
    acc.day.Absent += s.day.Absent;
    acc.day['Half Day'] += s.day['Half Day'];
    acc.day.Leave += s.day.Leave;
    acc.night.Present += s.night.Present;
    acc.night.Absent += s.night.Absent;
    acc.night['Half Day'] += s.night['Half Day'];
    acc.night.Leave += s.night.Leave;
    return acc;
  }, { day: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 }, night: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 } });

  return (
    <div className="bg-white">
      {/* Overall Summary Header */}
      <div className="p-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-violet-600" />
          <span className="text-xs font-semibold text-slate-700">Overall Summary</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-slate-500">Day:</span>
            {['Present','Absent','Half Day','Leave'].map(s => {
              const val = totalSummary.day[s];
              const cls = s === 'Present' ? 'bg-emerald-50 text-emerald-700'
                : s === 'Absent' ? 'bg-red-50 text-red-700'
                : s === 'Half Day' ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700';
              return <span key={s} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{s[0]} {val}</span>;
            })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-slate-500">Night:</span>
            {['Present','Absent','Half Day','Leave'].map(s => {
              const val = totalSummary.night[s];
              const cls = s === 'Present' ? 'bg-emerald-50 text-emerald-700'
                : s === 'Absent' ? 'bg-red-50 text-red-700'
                : s === 'Half Day' ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700';
              return <span key={s} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>{s[0]} {val}</span>;
            })}
          </div>
        </div>
      </div>

      {/* Per-Worker Calendar Grid + Summary */}
      <div className="divide-y divide-slate-200">
        {Object.values(groupedData).map(({ worker, records }) => {
          const summary = computeSummary(records);
          const weeks = groupDatesIntoWeeks(allDates);
          const totalDays = summary.day.Present + summary.day.Absent + summary.day['Half Day'] + summary.day.Leave;
          const totalNights = summary.night.Present + summary.night.Absent + summary.night['Half Day'] + summary.night.Leave;

          return (
            <div key={worker._id} className="p-3">
              {/* Worker Header */}
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs text-slate-500 font-mono">{worker.workerId || 'N/A'}</span>
                <span className="text-sm font-semibold text-slate-800">{worker.name}</span>
              </div>

              <div className="flex flex-col lg:flex-row gap-4">
                {/* Calendar Grid */}
                <div className="flex-shrink-0">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-[2px] mb-[2px]">
                    {DAYS_SHORT.map(d => (
                      <div key={d} className="w-10 sm:w-11 text-center text-[9px] font-semibold text-slate-400 uppercase">{d}</div>
                    ))}
                  </div>
                  {/* Week rows */}
                  <div className="space-y-[2px]">
                    {weeks.map((week, wi) => (
                      <div key={wi} className="grid grid-cols-7 gap-[2px]">
                        {week.map((dateStr, di) => {
                          if (!dateStr) return <div key={`e-${di}`} className="w-10 sm:w-11 h-10 sm:h-11" />;
                          const record = records.find(r => r.date.split('T')[0] === dateStr);
                          return (
                            <CalendarCell
                              key={dateStr}
                              dateStr={dateStr}
                              dayStatus={record?.shifts?.day?.status}
                              nightStatus={record?.shifts?.night?.status}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Side Panel */}
                <div className="flex flex-row lg:flex-col gap-3 flex-shrink-0">
                  {/* Day Shift */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 mb-1">Day</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">P {summary.day.Present}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">A {summary.day.Absent}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">H {summary.day['Half Day']}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">L {summary.day.Leave}</span>
                    </div>
                  </div>
                  {/* Night Shift */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 mb-1">Night</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">P {summary.night.Present}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">A {summary.night.Absent}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">H {summary.night['Half Day']}</span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">L {summary.night.Leave}</span>
                    </div>
                  </div>
                  {/* Total */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-slate-500">Total:</span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                      {totalDays + totalNights}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CombinedAttendancePage = () => {
  const [mode, setMode] = useState('mark'); // 'mark' or 'report'
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- Mark attendance state ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedShift, setSelectedShift] = useState('day');
  const [workers, setWorkers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const attendanceStatuses = ['Present', 'Absent', 'Half Day', 'Leave'];
  const shifts = ['day', 'night'];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDataForDate = useCallback(async () => {
    if (!selectedDate) return;
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const workerRes = await WorkerService.getAllWorkers({ active: true });
      const sortedWorkers = [...(workerRes.data || [])].sort((a, b) => {
        const idA = parseInt(a.workerId?.replace(/\D/g, '') || '0', 10);
        const idB = parseInt(b.workerId?.replace(/\D/g, '') || '0', 10);
        return idA - idB;
      });
      setWorkers(sortedWorkers);
      const attendanceRes = await AttendanceService.getAttendanceRecords({ specificDate: selectedDate, shift: selectedShift });
      const recordsMap = {};
      (attendanceRes.data || []).forEach(record => {
        if (record.worker && record.worker._id) {
          recordsMap[record.worker._id] = {
            status: record.shifts?.[selectedShift]?.status || '',
            notes: record.shifts?.[selectedShift]?.notes || ''
          };
        }
      });
      setAttendanceRecords(recordsMap);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch data.';
      setError(errMsg);
      console.error('Error fetching attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedShift]);

  useEffect(() => { if (mode === 'mark') fetchDataForDate(); }, [fetchDataForDate, mode]);

  const handleStatusChange = (workerId, field, value) => {
    setAttendanceRecords(prev => ({ ...prev, [workerId]: { ...(prev[workerId] || {}), [field]: value } }));
  };

  const handleSaveAttendance = async () => {
    if (Object.keys(attendanceRecords).length === 0 && workers.length > 0) {
      setError('No attendance changes to save. Mark attendance for at least one worker.');
      return;
    }
    setIsSaving(true); setError(''); setSuccessMessage('');
    const dataToSave = workers.filter(w => attendanceRecords[w._id]?.status).map(w => ({ workerId: w._id, status: attendanceRecords[w._id].status, notes: attendanceRecords[w._id].notes || '', shift: selectedShift }));
    if (dataToSave.length === 0) { setError('No attendance marked to save.'); setIsSaving(false); return; }
    try {
      await AttendanceService.recordBulkAttendance({ date: selectedDate, shift: selectedShift, attendanceData: dataToSave });
      setSuccessMessage('Attendance saved successfully!');
      fetchDataForDate();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save attendance.';
      setError(errMsg);
    } finally { setIsSaving(false); }
  };

  // --- Report state ---
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [workersForReport, setWorkersForReport] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const toLocalDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(toLocalDateStr(start));
    setEndDate(toLocalDateStr(end));
  }, []);

  const fetchAttendanceReport = useCallback(async () => {
    if (!startDate || !endDate) { setError('Please select both start and end dates.'); setReportData([]); return; }
    setIsReportLoading(true); setError('');
    try {
      const response = await AttendanceService.getAttendanceRecords({ startDate, endDate, workerId: selectedWorkerId || undefined });
      if (Array.isArray(response)) setReportData(response); else { setReportData([]); setError('No attendance data available for selected period'); }
    } catch (err) { const errMsg = err.response?.data?.message || err.message || 'Failed to fetch report.'; setError(errMsg); setReportData([]); console.error('Fetch report error:', err); }
    finally { setIsReportLoading(false); }
  }, [startDate, endDate, selectedWorkerId]);

  useEffect(() => {
    const loadWorkers = async () => {
      try { const res = await WorkerService.getAllWorkers({ active: true }); setWorkersForReport(res.data || []); } catch (e) { console.error('Failed to fetch workers for report', e); }
    };
    loadWorkers();
    if (startDate && endDate && mode === 'report') fetchAttendanceReport();
  }, [fetchAttendanceReport, startDate, endDate, mode]);

  const handleDownloadPdf = async () => {
    try {
      setError('');
      const response = await AttendanceService.getAttendanceRecords({ startDate, endDate, workerId: selectedWorkerId || undefined, format: 'pdf' });
      if (!response.data || !(response.data instanceof Blob)) throw new Error('Invalid PDF response received from server');
      if (response.data.type === 'application/json') { const text = await response.data.text(); const errorData = JSON.parse(text); throw new Error(errorData.message || 'Failed to generate PDF'); }
      const blob = new Blob([response.data], { type: 'application/pdf' }); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `attendance-report-${startDate}-to-${endDate}.pdf`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { console.error('PDF download error:', err); const errMsg = err.response?.data?.message || err.message || 'Failed to download PDF.'; setError(errMsg); }
  };

  // Utilities for report UI
  const getStatusCellStyle = (status) => {
    if (!status) return 'bg-slate-50 text-slate-500';
    switch (status) { 
      case 'Present': return 'bg-emerald-100 text-emerald-700 border border-emerald-200'; 
      case 'Absent': return 'bg-red-100 text-red-700 border border-red-200'; 
      case 'Half Day': return 'bg-amber-100 text-amber-700 border border-amber-200'; 
      case 'Leave': return 'bg-blue-100 text-blue-700 border border-blue-200'; 
      default: return 'bg-slate-50 text-slate-500'; 
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present': return <CheckCircle className="h-4 w-4" />;
      case 'Absent': return <XCircle className="h-4 w-4" />;
      case 'Half Day': return <AlertCircle className="h-4 w-4" />;
      case 'Leave': return <Coffee className="h-4 w-4" />;
      default: return null;
    }
  };

  const computeSummary = (records) => {
    const summary = { day: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 }, night: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 } };
    records.forEach(record => { const dayStatus = record?.shifts?.day?.status; if (dayStatus && summary.day[dayStatus] !== undefined) summary.day[dayStatus]++; const nightStatus = record?.shifts?.night?.status; if (nightStatus && summary.night[nightStatus] !== undefined) summary.night[nightStatus]++; });
    return summary;
  };

  const groupedData = (() => {
    const map = {};
    reportData.forEach(record => {
      if (!map[record.worker._id]) {
        map[record.worker._id] = { worker: record.worker, records: [] };
      }
      map[record.worker._id].records.push(record);
    });
    // Only add workers without records when showing ALL workers
    if (!selectedWorkerId) {
      workersForReport.forEach(w => {
        if (!map[w._id]) {
          map[w._id] = { worker: w, records: [] };
        }
      });
    }
    return Object.values(map).sort((a, b) => {
      const idA = parseInt(a.worker.workerId?.replace(/\D/g, '') || '0', 10);
      const idB = parseInt(b.worker.workerId?.replace(/\D/g, '') || '0', 10);
      return idA - idB;
    });
  })();
  const allDates = (() => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const parts = startDate.split('-').map(Number);
    const eparts = endDate.split('-').map(Number);
    const cur = new Date(parts[0], parts[1] - 1, parts[2]);
    const end = new Date(eparts[0], eparts[1] - 1, eparts[2]);
    while (cur <= end) {
      dates.push(toLocalDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  })();

  // Get attendance statistics for mark attendance mode
  const getAttendanceStats = () => {
    const totalWorkers = workers.length;
    const markedAttendance = Object.keys(attendanceRecords).filter(id => attendanceRecords[id]?.status).length;
    const presentCount = Object.values(attendanceRecords).filter(record => record.status === 'Present').length;
    const absentCount = Object.values(attendanceRecords).filter(record => record.status === 'Absent').length;
    
    return { totalWorkers, markedAttendance, presentCount, absentCount };
  };

  const stats = getAttendanceStats();

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
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  {mode === 'mark' ? 'Mark Attendance' : 'Attendance Reports'}
                </h1>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">
                  {mode === 'mark' ? 'Track daily worker attendance' : 'View and analyze attendance data'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <motion.button
                onClick={() => setMode(mode === 'mark' ? 'report' : 'mark')}
                className="px-3 py-1.5 lg:px-6 lg:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-sm lg:text-md font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {mode === 'mark' ? <BarChart3 className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                {mode === 'mark' ? 'View Reports' : 'Mark Attendance'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Mark Attendance Mode */}
        {mode === 'mark' && (
          <>
            {/* Statistics Cards for Mark Attendance */}
            <motion.div
              className="grid grid-cols-4 lg:grid-cols-4 gap-3 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <StatCard
                title="Total Workers"
                value={stats.totalWorkers}
                icon={<Users className="h-5 w-5" />}
                gradient="from-slate-500 to-slate-600"
                bgGradient="from-slate-50 to-slate-100"
              />
              <StatCard
                title="Marked Today"
                value={stats.markedAttendance}
                icon={<UserCheck className="h-5 w-5" />}
                gradient="from-blue-500 to-blue-600"
                bgGradient="from-blue-50 to-blue-100"
              />
              <StatCard
                title="Present"
                value={stats.presentCount}
                icon={<CheckCircle className="h-5 w-5" />}
                gradient="from-emerald-500 to-emerald-600"
                bgGradient="from-emerald-50 to-emerald-100"
              />
              <StatCard
                title="Absent"
                value={stats.absentCount}
                icon={<XCircle className="h-5 w-5" />}
                gradient="from-red-500 to-red-600"
                bgGradient="from-red-50 to-red-100"
              />
            </motion.div>

            {/* Date and Shift Selection */}
            <motion.div
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold text-slate-800">Attendance Settings</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)} 
                    className="w-full text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-3 text-black bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Shift</label>
                  <select 
                    value={selectedShift} 
                    onChange={(e) => setSelectedShift(e.target.value)} 
                    className="w-full text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-3 text-black bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                  >
                    {shifts.map(shift => (
                      <option key={shift} value={shift}>
                        {shift === 'day' ? 'Day Shift' : 'Night Shift'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <motion.button 
                    onClick={fetchDataForDate} 
                    disabled={isLoading}
                    className="w-full text-sm lg:text-base px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Filter className="h-5 w-5" />}
                    {isLoading ? 'Loading...' : 'Load Data'}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Success/Error Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-1 rounded-full bg-red-100">
                    <XCircle className="h-4 w-4" />
                  </div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {successMessage && (
                <motion.div
                  className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-1 rounded-full bg-emerald-100">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  {successMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Workers Attendance Section */}
            {!isLoading && workers.length > 0 && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="p-6 border-b border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <h3 className="text-base lg:text-lg font-semibold text-slate-800">Worker Attendance</h3>
                    </div>
                    <motion.button
                      onClick={() => {
                        const newRecords = {};
                        workers.forEach(w => {
                          newRecords[w._id] = { status: 'Present', notes: '' };
                        });
                        setAttendanceRecords(newRecords);
                      }}
                      className="px-2 py-1 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors duration-200 flex items-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark All Present
                    </motion.button>
                  </div>
                </div>

                {isMobile ? (
                  <div className="grid grid-cols-1 gap-6 p-6">
                    {workers.map((worker, index) => (
                      <motion.div
                        key={worker._id}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -4 }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-violet-100 group-hover:to-blue-100 transition-all duration-300">
                              <Users className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className='flex flex-row gap-3'>
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-slate-100 text-slate-800 border-slate-200">
                                Worker ID {worker.workerId || 'N/A'}
                              </span>
                              <h3 className="font-semibold text-slate-800 text-base group-hover:text-violet-600 transition-colors duration-300">
                                {worker.name}
                              </h3>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <span>Status: </span>
                            {attendanceRecords[worker._id]?.status ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getStatusCellStyle(attendanceRecords[worker._id]?.status)}`}>
                                {getStatusIcon(attendanceRecords[worker._id]?.status)}
                                {attendanceRecords[worker._id]?.status}
                              </span>
                            ) : (
                              <span className="text-slate-400">Not Marked</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <input 
                              type="text" 
                              value={attendanceRecords[worker._id]?.notes || ''} 
                              onChange={(e) => handleStatusChange(worker._id, 'notes', e.target.value)} 
                              placeholder="Add notes..." 
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 text-sm w-full"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {attendanceStatuses.map(status => (
                              <motion.button
                                key={status}
                                onClick={() => handleStatusChange(worker._id, 'status', status)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                                  attendanceRecords[worker._id]?.status === status
                                    ? `bg-${status === 'Present' ? 'emerald' : status === 'Absent' ? 'red' : status === 'Half Day' ? 'amber' : 'blue'}-500 text-white shadow-lg shadow-${status === 'Present' ? 'emerald' : status === 'Absent' ? 'red' : status === 'Half Day' ? 'amber' : 'blue'}-500/25`
                                    : `bg-${status === 'Present' ? 'emerald' : status === 'Absent' ? 'red' : status === 'Half Day' ? 'amber' : 'blue'}-50 text-${status === 'Present' ? 'emerald' : status === 'Absent' ? 'red' : status === 'Half Day' ? 'amber' : 'blue'}-600 hover:bg-${status === 'Present' ? 'emerald' : status === 'Absent' ? 'red' : status === 'Half Day' ? 'amber' : 'blue'}-100`
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {getStatusIcon(status)}
                                {status.charAt(0)}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Worker Name</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Worker ID</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {workers.map((worker, index) => (
                          <motion.tr 
                            key={worker._id} 
                            className="hover:bg-slate-50 text-black transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                  <Users className="h-4 w-4 text-slate-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-900">{worker.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {worker.workerId || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {attendanceRecords[worker._id]?.isExisting ? (
                                <div className="flex items-center gap-2">
                                  <div className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                                    attendanceRecords[worker._id]?.status === 'Present'
                                      ? 'bg-emerald-500 text-white'
                                      : attendanceRecords[worker._id]?.status === 'Absent'
                                      ? 'bg-red-500 text-white'
                                      : attendanceRecords[worker._id]?.status === 'Half Day'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-blue-500 text-white'
                                  }`}>
                                    {attendanceRecords[worker._id]?.status === 'Present' && <CheckCircle className="h-4 w-4" />}
                                    {attendanceRecords[worker._id]?.status === 'Absent' && <XCircle className="h-4 w-4" />}
                                    {attendanceRecords[worker._id]?.status === 'Half Day' && <Clock className="h-4 w-4" />}
                                    {attendanceRecords[worker._id]?.status === 'Leave' && <Calendar className="h-4 w-4" />}
                                    {attendanceRecords[worker._id]?.status}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    onClick={() => handleStatusChange(worker._id, 'status', 'Present')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                                      attendanceRecords[worker._id]?.status === 'Present'
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                    P
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleStatusChange(worker._id, 'status', 'Absent')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                                      attendanceRecords[worker._id]?.status === 'Absent'
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <XCircle className="h-4 w-4" />
                                    A
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleStatusChange(worker._id, 'status', 'Half Day')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                                      attendanceRecords[worker._id]?.status === 'Half Day'
                                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Clock className="h-4 w-4" />
                                    H
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleStatusChange(worker._id, 'status', 'Leave')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all duration-200 ${
                                      attendanceRecords[worker._id]?.status === 'Leave'
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Calendar className="h-4 w-4" />
                                    L
                                  </motion.button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input 
                                type="text" 
                                value={attendanceRecords[worker._id]?.notes || ''} 
                                onChange={(e) => handleStatusChange(worker._id, 'notes', e.target.value)} 
                                placeholder="Add notes..." 
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 text-sm w-full max-w-xs"
                              />
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-6 bg-slate-50 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm text-slate-500 font-medium">Button Legend:</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">P - Present</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-1.5 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">A - Absent</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">H - Half Day</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm font-medium">L - Leave</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!Object.values(attendanceRecords).some(record => record.isExisting) && (
                      <motion.button
                        onClick={handleSaveAttendance}
                        disabled={isSaving || isLoading}
                        className="text-sm lg:text-base px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isSaving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                        {isSaving ? 'Saving...' : 'Save Attendance'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Empty State for Mark Attendance */}
            {!isLoading && workers.length === 0 && !error && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                  <Users className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Active Workers Found</h3>
                <p className="text-slate-500 mb-6">
                  Add workers to start marking attendance.
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Reports Mode */}
        {mode === 'report' && (
          <>
            {/* Report Filters */}
            <motion.div
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <Filter className="h-5 w-5" />
                </div>
                <h3 className="text-base lg:text-lg font-semibold text-slate-800">Report Filters</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-3 text-black bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-3 text-black bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Worker</label>
                  <select 
                    value={selectedWorkerId} 
                    onChange={(e) => setSelectedWorkerId(e.target.value)} 
                    className="w-full text-sm lg:text-base px-3 py-2 lg:px-4 lg:py-3 text-black bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                  >
                    <option value="">All Workers</option>
                    {workersForReport.map(w => (
                      <option key={`worker-${w._id}`} value={w._id}>
                        {w.name} ({w.workerId || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <motion.button 
                    onClick={fetchAttendanceReport} 
                    disabled={isReportLoading} 
                    className="flex-1 text-sm lg:text-base px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isReportLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <BarChart3 className="h-5 w-5" />}
                    {isReportLoading ? 'Loading...' : 'Generate'}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Download PDF Buttons */}
            {!isReportLoading && reportData.length > 0 && (
              <motion.div 
                className="mb-6 flex flex-wrap gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <motion.button 
                  onClick={handleDownloadPdf} 
                  className="text-sm lg:text-base px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download className="h-5 w-5" />
                  Download All PDF
                </motion.button>
              </motion.div>
            )}

            {/* Error Message for Reports */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="p-1 rounded-full bg-red-100">
                    <XCircle className="h-4 w-4" />
                  </div>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State for Reports */}
            {isReportLoading && (
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center items-center gap-3 text-slate-600">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-lg font-medium">Loading report data...</span>
                </div>
              </motion.div>
            )}

            {/* Empty State for Reports */}
            {!isReportLoading && reportData.length === 0 && !error && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                  <FileText className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">No Attendance Records Found</h3>
                <p className="text-slate-500">
                  No attendance records found for the selected criteria.
                </p>
              </motion.div>
            )}

            {/* Attendance Report Section */}
            {!isReportLoading && (reportData.length > 0 || workersForReport.length > 0) && (
              <motion.div 
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="p-6 border-b border-slate-200/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-violet-500/10 to-blue-500/10 rounded-lg lg:rounded-xl text-violet-600">
                        <Activity className="lg:h-6 lg:w-6 h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base lg:text-lg font-semibold text-slate-800">Attendance Report</h3>
                        <p className="text-xs lg:text-sm text-slate-500 mt-0.5">
                          {allDates.length} days • {Object.keys(groupedData).length} workers
                        </p>
                      </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg">P: Present</span>
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded-lg">A: Absent</span>
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg">H: Half Day</span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">L: Leave</span>
                      </div>
                    </div>
                  </div>

                  {isMobile ? (
                    <div className="grid grid-cols-1 gap-6 p-6">
                      {Object.values(groupedData).map(({ worker, records }, index) => {
                        const summary = computeSummary(records);
                        return (
                          <motion.div
                            key={`worker-${worker._id}`}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 group"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ y: -4 }}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-violet-100 group-hover:to-blue-100 transition-all duration-300">
                                  <Users className="h-4 w-4 text-slate-600" />
                                </div>
                                <div className='flex flex-row gap-3'>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-slate-100 text-slate-800 border-slate-200">
                                    Worker ID {worker.workerId || 'N/A'}
                                  </span>
                                  <h3 className="font-semibold text-slate-800 text-base group-hover:text-violet-600 transition-colors duration-300">
                                    {worker.name}
                                  </h3>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="overflow-x-auto">
                                <div className="flex gap-3 pb-2">
                                  {allDates.map(date => {
                                    const record = records.find(r => r.date.split('T')[0] === date);
                                    const dayStatus = record?.shifts?.day?.status;
                                    const nightStatus = record?.shifts?.night?.status;
                                    return (
                                      <div 
                                        key={`status-${worker._id}-${date}`} 
                                        className="flex-shrink-0 w-[120px] bg-slate-50 rounded-lg p-2"
                                      >
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                          <span className="text-xs font-medium text-slate-600">
                                            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          {dayStatus && (
                                            <div className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium ${getStatusCellStyle(dayStatus)}`}>
                                              <span>Day</span>
                                              <span>{dayStatus[0]}</span>
                                            </div>
                                          )}
                                          {nightStatus && (
                                            <div className={`flex items-center justify-between px-2 py-1 rounded text-xs font-medium ${getStatusCellStyle(nightStatus)}`}>
                                              <span>Night</span>
                                              <span>{nightStatus[0]}</span>
                                            </div>
                                          )}
                                          {!dayStatus && !nightStatus && (
                                            <div className="px-2 py-1 text-slate-400 text-xs text-center">No data</div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="pt-3 border-t border-slate-200/50">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-sm font-medium text-slate-600 mb-2">Day Shift Summary</div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-emerald-700" />
                                        <span className="text-emerald-700">{summary.day.Present} Present</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <XCircle className="h-4 w-4 text-red-700" />
                                        <span className="text-red-700">{summary.day.Absent} Absent</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <AlertCircle className="h-4 w-4 text-amber-700" />
                                        <span className="text-amber-700">{summary.day['Half Day']} Half Day</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Coffee className="h-4 w-4 text-blue-700" />
                                      <span className="text-blue-700">{summary.day.Leave} Leave</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-600 mb-2">Night Shift Summary</div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm">
                                      <CheckCircle className="h-4 w-4 text-emerald-700" />
                                      <span className="text-emerald-700">{summary.night.Present} Present</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <XCircle className="h-4 w-4 text-red-700" />
                                      <span className="text-red-700">{summary.night.Absent} Absent</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <AlertCircle className="h-4 w-4 text-amber-700" />
                                      <span className="text-amber-700">{summary.night['Half Day']} Half Day</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Coffee className="h-4 w-4 text-blue-700" />
                                      <span className="text-blue-700">{summary.night.Leave} Leave</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <motion.div 
                    className="bg-white backdrop-blur-sm overflow-hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <AttendanceTable 
                      groupedData={groupedData}
                      allDates={allDates}
                      getStatusCellStyle={getStatusCellStyle}
                      computeSummary={computeSummary}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

// Reusable StatCard Component
const StatCard = ({ title, value, icon, gradient, bgGradient }) => (
  <motion.div
    className={`relative p-4 lg:p-6 bg-gradient-to-br ${bgGradient} rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -2 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-center lg:justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <TrendingUp className="h-5 w-5 hidden lg:block text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
      </div>
      <div className='text-center lg:text-left'>
        <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  </motion.div>
);

export default CombinedAttendancePage;