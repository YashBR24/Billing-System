import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Calendar,
  RefreshCw,
  AlertTriangle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileBarChart,
} from "lucide-react";
import GSTService from "../services/GSTService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

const MONTHS = [
  { value: 1, label: "April" },
  { value: 2, label: "May" },
  { value: 3, label: "June" },
  { value: 4, label: "July" },
  { value: 5, label: "August" },
  { value: 6, label: "September" },
  { value: 7, label: "October" },
  { value: 8, label: "November" },
  { value: 9, label: "December" },
  { value: 10, label: "January" },
  { value: 11, label: "February" },
  { value: 12, label: "March" },
];

const GSTDashboard = () => {
  const now = new Date();
  const currentFY =
    now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

  const [viewMode, setViewMode] = useState("month");
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(
    now.getMonth() + 1 <= 3 ? now.getFullYear() : now.getFullYear()
  );
  const [availableFYs, setAvailableFYs] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [fyData, setFYData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState("Bar");
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const formatCurrency = (amount) => {
    return (
      amount?.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "0.00"
    );
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (viewMode === "month") {
        const res = await GSTService.getMonthlySummary(selectedYear, selectedMonth);
        setMonthlyData(res.data.data);
        setFYData(null);
      } else {
        const res = await GSTService.getFYSummary(selectedFY);
        setFYData(res.data.data);
        setMonthlyData(null);
      }
    } catch (err) {
      console.error("Failed to fetch GST data:", err);
      setError(err.response?.data?.message || err.message || "Could not load GST data.");
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedYear, selectedMonth, selectedFY]);

  useEffect(() => {
    const loadFYs = async () => {
      try {
        const res = await GSTService.getAvailableFYs();
        const fys = res.data.data;
        setAvailableFYs(fys);
        if (!fys.includes(selectedFY) && fys.length > 0) {
          setSelectedFY(fys[0]);
        }
      } catch (err) {
        console.error("Failed to load FYs:", err);
      }
    };
    loadFYs();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleExportExcel = async () => {
    try {
      const res = await GSTService.exportExcel(selectedYear, selectedMonth);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GST_Summary_${String(selectedMonth).padStart(2, "0")}-${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Excel export failed:", err);
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await GSTService.exportPDF(selectedYear, selectedMonth);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `GST_Summary_${String(selectedMonth).padStart(2, "0")}-${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  };

  const activeData = viewMode === "month" ? monthlyData : fyData;
  const periodLabel =
    viewMode === "month" && monthlyData
      ? monthlyData.period
      : fyData
      ? fyData.financialYear
      : "";

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 },
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, when: "beforeChildren" },
    },
  };

  const SummaryCard = ({ title, value, icon, gradient, subtitle, badge }) => (
    <motion.div
      className={`relative p-4 md:p-6 bg-gradient-to-br ${gradient} rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
      variants={itemVariants}
      whileHover={{ y: -2 }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-xl bg-white/20 text-white">{icon}</div>
          {badge && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white/20 text-white">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
        <p className="text-xl md:text-2xl font-bold text-white">Rs. {formatCurrency(value)}</p>
        {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );

  const buildChartData = () => {
    if (viewMode === "month" && monthlyData) {
      const labels = ["CGST", "SGST", "IGST"];
      const outputData = [monthlyData.sales.cgst, monthlyData.sales.sgst, monthlyData.sales.igst];
      const inputData = [monthlyData.purchases.cgst, monthlyData.purchases.sgst, monthlyData.purchases.igst];
      return { labels, outputData, inputData };
    }
    if (viewMode === "fy" && fyData) {
      const labels = fyData.months.map((m) => m.period);
      const outputData = fyData.months.map((m) => m.outputTax);
      const inputData = fyData.months.map((m) => m.inputTax);
      return { labels, outputData, inputData };
    }
    return { labels: [], outputData: [], inputData: [] };
  };

  const chartData = buildChartData();

  const chartConfig = {
    Bar: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Output Tax",
          data: chartData.outputData,
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
        {
          label: "Input Tax (ITC)",
          data: chartData.inputData,
          backgroundColor: "rgba(34, 197, 94, 0.6)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    Line: {
      labels: chartData.labels,
      datasets: [
        {
          label: "Output Tax",
          data: chartData.outputData,
          borderColor: "rgba(239, 68, 68, 1)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(239, 68, 68, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: "Input Tax (ITC)",
          data: chartData.inputData,
          borderColor: "rgba(34, 197, 94, 1)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(34, 197, 94, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    Doughnut: {
      labels: ["CGST", "SGST", "IGST"],
      datasets: [
        {
          data: [
            (monthlyData?.sales.cgst || 0) + (monthlyData?.purchases.cgst || 0),
            (monthlyData?.sales.sgst || 0) + (monthlyData?.purchases.sgst || 0),
            (monthlyData?.sales.igst || 0) + (monthlyData?.purchases.igst || 0),
          ],
          backgroundColor: ["rgba(59, 130, 246, 0.8)", "rgba(168, 85, 247, 0.8)", "rgba(245, 158, 11, 0.8)"],
          borderColor: ["rgba(59, 130, 246, 1)", "rgba(168, 85, 247, 1)", "rgba(245, 158, 11, 1)"],
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
  };

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: "500" } },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      titleColor: "#fff",
      bodyColor: "#fff",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (context) =>
          `${context.dataset.label}: Rs. ${context.parsed.y?.toLocaleString("en-IN") || context.parsed.toLocaleString("en-IN")}`,
      },
    },
  },
  scales: chartType === "Doughnut" ? {} : {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0, 0, 0, 0.05)" },
      ticks: {
        font: { size: 11 },
        callback: (value) => `Rs. ${value.toLocaleString("en-IN")}`,
      },
    },
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
  },
};

const renderGSTR3BTable = () => {
  if (viewMode !== "month" || !monthlyData) return null;
  const { gstr3b } = monthlyData;
    
    const gstrRows = [
      { label: "3.1 Outward taxable supplies", data: gstr3b.table31, color: "" },
      { label: "3.2 Outward taxable (reverse)", data: gstr3b.table32, color: "" },
      { label: "4.0 Eligible ITC", data: gstr3b.table40, color: "emerald" },
      { label: "4.1 ITC Reversed (Credit)", data: gstr3b.table41, color: "amber" },
      { label: "4.2 ITC Reversed (Debit)", data: gstr3b.table42, color: "rose" },
      { label: "6.1 Interest / Late fee", data: gstr3b.table61, color: "purple" },
    ];

    return (
      <motion.div
        className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-4 md:p-6"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">GSTR-3B Summary</h3>
            <p className="text-sm text-slate-500">{periodLabel}</p>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {gstrRows.map((row) => (
              <div key={row.label} className={`bg-slate-50 rounded-lg p-3 border-l-4 border-${row.color}-400`}>
                <p className="font-medium text-slate-800 text-sm mb-2">{row.label}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-slate-500">Taxable:</span> <span className="font-medium">{formatCurrency(row.data.taxableValue)}</span></div>
                  <div><span className="text-slate-500">CGST:</span> <span className="font-medium">{formatCurrency(row.data.cgst)}</span></div>
                  <div><span className="text-slate-500">SGST:</span> <span className="font-medium">{formatCurrency(row.data.sgst)}</span></div>
                  <div><span className="text-slate-500">IGST:</span> <span className="font-medium">{formatCurrency(row.data.igst)}</span></div>
                  <div className="col-span-2 pt-2 border-t border-slate-200"><span className="font-semibold">Total:</span> <span className={`font-bold ${row.color ? `text-${row.color}-600` : ''}`}>{formatCurrency(row.data.totalTax || row.data.totalReversed || row.data.totalITC)}</span></div>
                </div>
              </div>
            ))}
            <div className="bg-slate-100 rounded-lg p-3">
              <p className="font-bold text-slate-800">Net Tax Liability</p>
              <p className={`text-lg font-bold ${gstr3b.summary.netPayable < 0 ? "text-emerald-600" : "text-red-600"}`}>Rs. {formatCurrency(gstr3b.summary.netPayable)}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Nature of Supplies</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Taxable Value</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">CGST</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">SGST</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">IGST</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">3.1 Outward taxable supplies</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table31.taxableValue)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table31.cgst)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table31.sgst)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table31.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(gstr3b.table31.totalTax)}</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">3.2 Outward taxable (reverse charge)</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table32.taxableValue)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table32.cgst)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table32.sgst)}</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table32.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold">{formatCurrency(gstr3b.table32.totalTax)}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-emerald-50/50">
                  <td className="py-3 px-4 font-medium text-emerald-800">4.0 Eligible ITC</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4 text-emerald-700">{formatCurrency(gstr3b.table40.cgst)}</td>
                  <td className="text-right py-3 px-4 text-emerald-700">{formatCurrency(gstr3b.table40.sgst)}</td>
                  <td className="text-right py-3 px-4 text-emerald-700">{formatCurrency(gstr3b.table40.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold text-emerald-700">{formatCurrency(gstr3b.table40.totalITC)}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-amber-50/50">
                  <td className="py-3 px-4 font-medium text-amber-800">4.1 ITC Reversed (Credit Notes)</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4 text-amber-700">{formatCurrency(gstr3b.table41.cgst)}</td>
                  <td className="text-right py-3 px-4 text-amber-700">{formatCurrency(gstr3b.table41.sgst)}</td>
                  <td className="text-right py-3 px-4 text-amber-700">{formatCurrency(gstr3b.table41.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold text-amber-700">{formatCurrency(gstr3b.table41.totalReversed)}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-rose-50/50">
                  <td className="py-3 px-4 font-medium text-rose-800">4.2 ITC Reversed (Debit Notes)</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4 text-rose-700">{formatCurrency(gstr3b.table42.cgst)}</td>
                  <td className="text-right py-3 px-4 text-rose-700">{formatCurrency(gstr3b.table42.sgst)}</td>
                  <td className="text-right py-3 px-4 text-rose-700">{formatCurrency(gstr3b.table42.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold text-rose-700">{formatCurrency(gstr3b.table42.totalReversed)}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-purple-50/50">
                  <td className="py-3 px-4 font-medium text-purple-800">6.1 Interest / Late fee</td>
                  <td className="text-right py-3 px-4">{formatCurrency(gstr3b.table61.taxableValue)}</td>
                  <td className="text-right py-3 px-4 text-purple-700">{formatCurrency(gstr3b.table61.cgst)}</td>
                  <td className="text-right py-3 px-4 text-purple-700">{formatCurrency(gstr3b.table61.sgst)}</td>
                  <td className="text-right py-3 px-4 text-purple-700">{formatCurrency(gstr3b.table61.igst)}</td>
                  <td className="text-right py-3 px-4 font-semibold text-purple-700">{formatCurrency(gstr3b.table61.totalTax)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300">
                  <td className="py-3 px-4 font-bold text-slate-800">Net Tax Liability</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className="text-right py-3 px-4">-</td>
                  <td className={`text-right py-3 px-4 font-bold text-lg ${gstr3b.summary.netPayable < 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Rs. {formatCurrency(gstr3b.summary.netPayable)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div>
      <div className="max-w-7xl mx-auto px-4 xl:px-8 py-4">
        {/* Header */}
        <motion.div className="mb-6" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600">
                <IndianRupee className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg xl:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  GST Dashboard
                </h1>
                <p className="text-slate-500 text-xs xl:text-sm font-medium">
                  {periodLabel ? `Period: ${periodLabel}` : "Select a period to view GST summary"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === "month"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode("fy")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    viewMode === "fy"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Financial Year
                </button>
              </div>

              {/* FY Selector */}
              <select
                value={viewMode === "fy" ? selectedFY : selectedFY}
                onChange={(e) => {
                  setSelectedFY(e.target.value);
                  if (viewMode === "fy") return;
                  const fy = e.target.value;
                  const fyStartYear = parseInt(fy.split("-")[0], 10);
                  const calYear = selectedMonth <= 3 ? fyStartYear + 1 : fyStartYear;
                  setSelectedYear(calYear);
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {availableFYs.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>

              {/* Month Selector (monthly view) */}
              {viewMode === "month" && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>

              {/* Export Buttons */}
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg shadow-sm text-xs font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg shadow-sm text-xs font-medium hover:bg-red-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <motion.div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-8 text-center">
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Loading GST Summary...</span>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Summary Cards */}
            {activeData && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                {viewMode === "month" && monthlyData ? (
                  <>
                    <SummaryCard
                      title="Output Tax (Sales)"
                      value={monthlyData.outputTax}
                      icon={<TrendingUp className="w-5 h-5" />}
                      gradient="from-red-500 to-rose-600"
                      subtitle={`${monthlyData.sales.count} invoices`}
                    />
                    <SummaryCard
                      title="Input Tax (ITC)"
                      value={monthlyData.inputTax}
                      icon={<TrendingDown className="w-5 h-5" />}
                      gradient="from-emerald-500 to-green-600"
                      subtitle={`${monthlyData.purchases.count} purchases`}
                    />
                    <SummaryCard
                      title="Net Payable"
                      value={monthlyData.netPayable.netPayable}
                      icon={monthlyData.netPayable.netPayable < 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      gradient={monthlyData.netPayable.netPayable < 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
                      badge={monthlyData.netPayable.isRefund ? "REFUND" : "PAYABLE"}
                    />
                    <SummaryCard
                      title="Taxable Value"
                      value={monthlyData.sales.taxableValue}
                      icon={<Receipt className="w-5 h-5" />}
                      gradient="from-blue-500 to-indigo-600"
                      subtitle={`CGST: ${formatCurrency(monthlyData.sales.cgst)} | SGST: ${formatCurrency(monthlyData.sales.sgst)} | IGST: ${formatCurrency(monthlyData.sales.igst)}`}
                    />
                  </>
                ) : fyData ? (
                  <>
                    <SummaryCard
                      title="Total Output Tax"
                      value={fyData.totals.outputTax}
                      icon={<TrendingUp className="w-5 h-5" />}
                      gradient="from-red-500 to-rose-600"
                    />
                    <SummaryCard
                      title="Total Input Tax"
                      value={fyData.totals.inputTax}
                      icon={<TrendingDown className="w-5 h-5" />}
                      gradient="from-emerald-500 to-green-600"
                    />
                    <SummaryCard
                      title="Net FY Payable"
                      value={fyData.totals.netPayable}
                      icon={fyData.totals.netPayable < 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      gradient={fyData.totals.netPayable < 0 ? "from-green-500 to-emerald-600" : "from-red-500 to-rose-600"}
                      badge={fyData.totals.netPayable < 0 ? "REFUND" : "PAYABLE"}
                    />
                    <SummaryCard
                      title="Total Taxable Value"
                      value={fyData.totals.taxableValue}
                      icon={<Receipt className="w-5 h-5" />}
                      gradient="from-blue-500 to-indigo-600"
                    />
                  </>
                ) : null}
              </div>
            )}

            {/* Detail Breakdown Cards */}
            {viewMode === "month" && monthlyData && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
                {[
                  { label: "Sales", data: monthlyData.sales, color: "red", icon: <FileText className="h-4 w-4" /> },
                  { label: "Purchases (ITC)", data: monthlyData.purchases, color: "emerald", icon: <Receipt className="h-4 w-4" /> },
                  { label: "Credit Notes", data: monthlyData.creditNotes, color: "amber", icon: <ArrowDownRight className="h-4 w-4" /> },
                  { label: "Debit Notes", data: monthlyData.debitNotes, color: "rose", icon: <ArrowUpRight className="h-4 w-4" /> },
                  { label: "Interest Notes", data: monthlyData.interestNotes, color: "purple", icon: <Calendar className="h-4 w-4" /> },
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    className={`bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/50 p-4 hover:shadow-lg transition-all`}
                    variants={itemVariants}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-1.5 rounded-lg bg-${item.color}-100 text-${item.color}-600`}>
                        {item.icon}
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">{item.label}</h4>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Taxable</span>
                        <span className="font-medium text-slate-800">{formatCurrency(item.data.taxableValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CGST</span>
                        <span className="font-medium text-slate-800">{formatCurrency(item.data.cgst || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">SGST</span>
                        <span className="font-medium text-slate-800">{formatCurrency(item.data.sgst || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IGST</span>
                        <span className="font-medium text-slate-800">{formatCurrency(item.data.igst || 0)}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-100">
                        <span className="font-semibold text-slate-700">Total Tax</span>
                        <span className={`font-bold text-${item.color}-600`}>{formatCurrency(item.data.totalTax)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Chart */}
            {chartData.labels.length > 0 && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-6"
                variants={itemVariants}
              >
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <FileBarChart className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        {viewMode === "month" ? "Output vs Input Tax" : "Monthly GST Trend"}
                      </h3>
                      <p className="text-sm text-slate-500">{periodLabel}</p>
                    </div>
                  </div>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Bar">Bar Chart</option>
                    <option value="Line">Line Chart</option>
                    {viewMode === "month" && <option value="Doughnut">Doughnut Chart</option>}
                  </select>
                </div>
                <div style={{ height: isMobile ? "250px" : "300px" }}>
                  {chartType === "Bar" && <Bar data={chartConfig.Bar} options={chartOptions} />}
                  {chartType === "Line" && <Line data={chartConfig.Line} options={chartOptions} />}
                  {chartType === "Doughnut" && <Doughnut data={chartConfig.Doughnut} options={chartOptions} />}
                </div>
              </motion.div>
            )}

            {/* GSTR-3B Table */}
            {renderGSTR3BTable()}

            {/* FY Monthly Breakdown Table */}
            {viewMode === "fy" && fyData && fyData.months.length > 0 && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mt-6"
                variants={itemVariants}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Monthly Breakdown - FY {fyData.financialYear}</h3>
                    <p className="text-sm text-slate-500">Month-wise GST summary</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Month</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Output Tax</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Input Tax</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Net Payable</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Sales Count</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Purchase Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fyData.months.map((month, idx) => (
                        <tr
                          key={month.period}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <td className="py-3 px-4 font-medium text-slate-800">{month.period}</td>
                          <td className="text-right py-3 px-4 text-red-600">{formatCurrency(month.outputTax)}</td>
                          <td className="text-right py-3 px-4 text-emerald-600">{formatCurrency(month.inputTax)}</td>
                          <td className={`text-right py-3 px-4 font-semibold ${month.netPayable.netPayable < 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatCurrency(month.netPayable.netPayable)}
                          </td>
                          <td className="text-right py-3 px-4 text-slate-600">{month.sales.count}</td>
                          <td className="text-right py-3 px-4 text-slate-600">{month.purchases.count}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                        <td className="py-3 px-4 font-bold text-slate-800">FY Total</td>
                        <td className="text-right py-3 px-4 font-bold text-red-600">{formatCurrency(fyData.totals.outputTax)}</td>
                        <td className="text-right py-3 px-4 font-bold text-emerald-600">{formatCurrency(fyData.totals.inputTax)}</td>
                        <td className={`text-right py-3 px-4 font-bold text-lg ${fyData.totals.netPayable < 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatCurrency(fyData.totals.netPayable)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-slate-700">
                          {fyData.months.reduce((sum, m) => sum + m.sales.count, 0)}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-slate-700">
                          {fyData.months.reduce((sum, m) => sum + m.purchases.count, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};


export default GSTDashboard;
