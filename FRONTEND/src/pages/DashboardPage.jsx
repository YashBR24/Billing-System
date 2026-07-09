import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
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
  DollarSign,
  AlertTriangle,
  Clock,
  BarChart3,
  Activity,
  Package,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronRight,
  Sparkles,
  X,
  ExternalLink,
  FileMinus,
  FilePlus,
  Receipt,
  CalendarDays,
  Layers,
  Eye,
  ShieldAlert,
  IndianRupee,
  ArrowRightLeft,
} from "lucide-react";
import AuthService from "../services/AuthService";
import DashboardService from "../services/DashboardService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
    transition: { staggerChildren: 0.08, when: "beforeChildren" },
  },
};

function getFinancialYear(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}

function getLast3FY() {
  const current = getFinancialYear(new Date());
  const [startYear] = current.split("-").map(Number);
  return [
    current,
    `${startYear - 1}-${String(startYear).slice(-2)}`,
    `${startYear - 2}-${String(startYear - 1).slice(-2)}`,
  ];
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const [selectedFY, setSelectedFY] = useState(getFinancialYear(new Date()));
  const [fyList, setFyList] = useState(getLast3FY());
  const [chartType, setChartType] = useState("Bar");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [fySummary, setFySummary] = useState(null);
  const [fyComparison, setFyComparison] = useState(null);
  const [fyMonthly, setFyMonthly] = useState(null);
  const [materialFlow, setMaterialFlow] = useState(null);
  const [materialFlowCards, setMaterialFlowCards] = useState(null);
  const [allOverdue, setAllOverdue] = useState(null);

  const [loading, setLoading] = useState({
    summary: true,
    comparison: true,
    charts: true,
    overdue: true,
    materialFlow: true,
  });
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  const fetchData = useCallback(async (fy) => {
    setLoading({
      summary: true,
      comparison: true,
      charts: true,
      overdue: true,
      materialFlow: true,
    });
    setError("");

    try {
      const [
        summaryRes,
        comparisonRes,
        monthlyRes,
        matFlowRes,
        matCardsRes,
        overdueRes,
      ] = await Promise.all([
        DashboardService.getFYSummary(fy),
        DashboardService.getFYComparison(),
        DashboardService.getFYMonthlyBreakdown(fy),
        DashboardService.getFYMaterialFlow(fy),
        DashboardService.getMaterialFlowCards(fy),
        DashboardService.getAllOverdue(),
      ]);

      setFySummary(summaryRes.data);
      setFyComparison(comparisonRes.data);
      setFyMonthly(monthlyRes.data);
      setMaterialFlow(matFlowRes.data);
      setMaterialFlowCards(matCardsRes.data);
      setAllOverdue(overdueRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err.response?.data?.message || err.message || "Could not load dashboard data.");
    } finally {
      setLoading({
        summary: false,
        comparison: false,
        charts: false,
        overdue: false,
        materialFlow: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchData(selectedFY);
  }, [selectedFY, fetchData]);

  useEffect(() => {
    DashboardService.getFinancialYears()
      .then((res) => setFyList(res.data.available))
      .catch(() => setFyList(getLast3FY()));
  }, []);

  useEffect(() => {
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "superadmin")) {
    return null;
  }

  const formatCurrency = (amount) => {
    return (
      amount?.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) || "0.00"
    );
  };

  const formatShortCurrency = (amount) => {
    if (!amount) return "0";
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleItemClick = (item) => {
    setModalItem(item);
    setShowModal(true);
  };

  const handleNavigate = (item) => {
    setShowModal(false);
    if (item.type === "bill") {
      navigate(`/bills/${item._id}`);
    } else {
      navigate(`/purchases/${item._id}`);
    }
  };

  const fyLabels = fyComparison?.fyList || [];
  const fyComparisonData = fyComparison?.data || [];

  const comparisonChartData = {
    labels: fyLabels,
    datasets: [
      {
        label: "Income",
        data: fyComparisonData.map((d) => d.netIncome),
        backgroundColor: "rgba(16, 185, 129, 0.7)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: "Expense",
        data: fyComparisonData.map((d) => d.netExpense),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: "Profit",
        data: fyComparisonData.map((d) => d.netProfit),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: "500" } },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        ticks: {
          font: { size: 11 },
          callback: (v) => `₹${formatShortCurrency(v)}`,
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 12, weight: "600" } } },
    },
  };

  const monthlyChartData = fyMonthly
    ? {
        labels: fyMonthly.labels,
        datasets: [
          {
            label: "Income",
            data: fyMonthly.incomeData,
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(16, 185, 129, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
          },
          {
            label: "Expense",
            data: fyMonthly.expenseData,
            borderColor: "rgba(239, 68, 68, 1)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(239, 68, 68, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      }
    : null;

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: "500" } },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#fff",
        bodyColor: "#fff",
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString("en-IN")}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        ticks: {
          font: { size: 11 },
          callback: (v) => `₹${formatShortCurrency(v)}`,
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const materialFlowChartData = materialFlow
    ? {
        labels: materialFlow.labels,
        datasets: [
          {
            label: "Sold",
            data: materialFlow.soldData,
            backgroundColor: "rgba(59, 130, 246, 0.7)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: "Purchased",
            data: materialFlow.purchasedData,
            backgroundColor: "rgba(245, 158, 11, 0.7)",
            borderColor: "rgba(245, 158, 11, 1)",
            borderWidth: 2,
            borderRadius: 6,
          },
          {
            label: "Credit Note (Returns)",
            data: materialFlow.creditNoteData,
            backgroundColor: "rgba(168, 85, 247, 0.5)",
            borderColor: "rgba(168, 85, 247, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: "Debit Note (Returns)",
            data: materialFlow.debitNoteData,
            backgroundColor: "rgba(236, 72, 153, 0.5)",
            borderColor: "rgba(236, 72, 153, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      }
    : null;

  const materialFlowChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { usePointStyle: true, padding: 12, font: { size: 11, weight: "500" } },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("en-IN")} Kg`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        ticks: { font: { size: 11 }, callback: (v) => `${v} Kg` },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-5">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-200 flex-shrink-0">
              <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                Finance Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                FY-wise overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="appearance-none w-full bg-white border border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 pr-8 sm:pr-10 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent cursor-pointer"
              >
                {fyList.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
              <CalendarDays className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => fetchData(selectedFY)}
              className="p-2 sm:p-2.5 bg-white border border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 text-gray-600 ${loading.summary ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="mb-4 sm:mb-5 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700 text-xs sm:text-sm flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 truncate">{error}</span>
              <button onClick={() => setError("")} className="ml-auto flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FY Summary Cards */}
        {loading.summary ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg sm:rounded-2xl p-4 animate-pulse border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-28 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
            ))}
          </div>
        ) : fySummary ? (
          <motion.div
            className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <SummaryCard
              title="Net Income"
              value={`₹${formatShortCurrency(fySummary.invoices.netIncome)}`}
              subValue={`₹${formatCurrency(fySummary.invoices.netIncome)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              gradient="from-emerald-500 to-green-600"
              bg="bg-emerald-50"
              borderColor="border-emerald-100"
            />
            <SummaryCard
              title="Net Expense"
              value={`₹${formatShortCurrency(fySummary.invoices.netExpense)}`}
              subValue={`₹${formatCurrency(fySummary.invoices.netExpense)}`}
              icon={<TrendingDown className="h-5 w-5" />}
              gradient="from-red-500 to-rose-600"
              bg="bg-red-50"
              borderColor="border-red-100"
            />
            <SummaryCard
              title="Net Profit"
              value={`₹${formatShortCurrency(fySummary.invoices.netProfit)}`}
              subValue={`₹${formatCurrency(fySummary.invoices.netProfit)}`}
              icon={<DollarSign className="h-5 w-5" />}
              gradient={fySummary.invoices.netProfit >= 0 ? "from-blue-500 to-indigo-600" : "from-orange-500 to-red-600"}
              bg={fySummary.invoices.netProfit >= 0 ? "bg-blue-50" : "bg-orange-50"}
              borderColor={fySummary.invoices.netProfit >= 0 ? "border-blue-100" : "border-orange-100"}
            />
            <SummaryCard
              title="Current Month Balance"
              value={`₹${formatShortCurrency(fySummary.currentMonth.balance)}`}
              subValue={`${fySummary.currentMonth.month} · In: ₹${formatShortCurrency(fySummary.currentMonth.totalIn)}`}
              icon={<ArrowRightLeft className="h-5 w-5" />}
              gradient={fySummary.currentMonth.balance >= 0 ? "from-violet-500 to-purple-600" : "from-orange-500 to-red-600"}
              bg={fySummary.currentMonth.balance >= 0 ? "bg-violet-50" : "bg-orange-50"}
              borderColor={fySummary.currentMonth.balance >= 0 ? "border-violet-100" : "border-orange-100"}
            />
          </motion.div>
        ) : null}

        {/* 3 FY Comparison Chart */}
        <motion.div
          className="bg-white rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5 mb-4 sm:mb-6"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-5 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BarChart3 className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  3 FY Comparison
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  Income vs Expense vs Profit
                </p>
              </div>
            </div>
          </div>
          {loading.comparison ? (
            <div className="h-40 sm:h-64 bg-gray-50 rounded-lg sm:rounded-xl animate-pulse" />
          ) : (
            <div className={isMobile ? "h-40" : "h-64"}>
              <Bar data={comparisonChartData} options={comparisonChartOptions} />
            </div>
          )}
        </motion.div>

        {/* Monthly Trend + Material Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <motion.div
            className="bg-white rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Layers className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  Monthly Trend
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  Income vs Expense · FY {selectedFY}
                </p>
              </div>
            </div>
            {loading.charts ? (
              <div className="h-40 sm:h-60 bg-gray-50 rounded-lg sm:rounded-xl animate-pulse" />
            ) : monthlyChartData ? (
              <div className={isMobile ? "h-40" : "h-60"}>
                <Line data={monthlyChartData} options={monthlyChartOptions} />
              </div>
            ) : null}
          </motion.div>

          <motion.div
            className="bg-white rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-5"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Activity className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  Material Flow
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  Qty (Kg) · FY {selectedFY}
                </p>
              </div>
            </div>
            {loading.materialFlow ? (
              <div className="h-40 sm:h-60 bg-gray-50 rounded-lg sm:rounded-xl animate-pulse" />
            ) : materialFlowChartData ? (
              <div className={isMobile ? "h-40" : "h-60"}>
                <Bar data={materialFlowChartData} options={materialFlowChartOptions} />
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Material Flow Cards */}
        {loading.materialFlow ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg sm:rounded-2xl p-4 animate-pulse border border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-14" />
              </div>
            ))}
          </div>
        ) : materialFlowCards ? (
          <motion.div
            className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <MaterialFlowCard
              title="Sales"
              count={materialFlowCards.sales.count}
              total={materialFlowCards.sales.total}
              icon={<Receipt className="h-5 w-5" />}
              color="emerald"
              link="/bills"
            />
            <MaterialFlowCard
              title="Purchases"
              count={materialFlowCards.purchases.count}
              total={materialFlowCards.purchases.total}
              icon={<Package className="h-5 w-5" />}
              color="blue"
              link="/purchases"
            />
            <MaterialFlowCard
              title="Credit Notes"
              count={materialFlowCards.creditNotes.count}
              total={materialFlowCards.creditNotes.total}
              icon={<FileMinus className="h-5 w-5" />}
              color="purple"
              link="/credit-notes"
            />
            <MaterialFlowCard
              title="Debit Notes"
              count={materialFlowCards.debitNotes.count}
              total={materialFlowCards.debitNotes.total}
              icon={<FilePlus className="h-5 w-5" />}
              color="pink"
              link="/debit-notes"
            />
          </motion.div>
        ) : null}

        {/* Overdue Table */}
        <motion.div
          className="bg-white rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 sm:mb-6"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="p-3 sm:p-5 border-b border-gray-100">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                  <ShieldAlert className="h-4 sm:h-5 w-4 sm:w-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                    Overdue Payments
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {allOverdue?.total || 0} items
                  </p>
                </div>
              </div>
              {allOverdue && allOverdue.total > 0 && (
                <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-semibold flex-shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">{allOverdue.bills} bills · {allOverdue.purchases} purchases</span>
                  <span className="sm:hidden">{allOverdue.total} items</span>
                </span>
              )}
            </div>
          </div>

          {loading.overdue ? (
            <div className="p-4 sm:p-8 space-y-2 sm:space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 sm:h-14 bg-gray-50 rounded-lg sm:rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allOverdue && allOverdue.items.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80">
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Number</th>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Party</th>
                      <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Due Date</th>
                      <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Paid</th>
                      <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Days</th>
                      <th className="text-center px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allOverdue.items.slice(0, 20).map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              item.type === "bill"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.type === "bill" ? (
                              <FileText className="h-3 w-3" />
                            ) : (
                              <Package className="h-3 w-3" />
                            )}
                            {item.type === "bill" ? "Bill" : "Purchase"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 font-medium text-gray-900">
                          {item.number}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-gray-600 max-w-[120px] truncate">
                          {item.party}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-gray-500 hidden md:table-cell">
                          {formatDate(item.dueDate)}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right font-medium text-gray-900">
                          ₹{formatCurrency(item.totalAmount)}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-emerald-600 hidden md:table-cell">
                          ₹{formatCurrency(item.paidAmount)}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right font-semibold text-red-600">
                          ₹{formatCurrency(item.balance)}
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-center hidden lg:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700">
                            {item.daysOverdue}d
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-center">
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye className="h-4 w-4 text-gray-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-gray-100">
                {allOverdue.items.slice(0, 20).map((item) => (
                  <div
                    key={item._id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold flex-shrink-0 ${
                            item.type === "bill"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.type === "bill" ? (
                            <FileText className="h-3 w-3" />
                          ) : (
                            <Package className="h-3 w-3" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{item.number}</p>
                          <p className="text-xs text-gray-500 truncate">{item.party}</p>
                        </div>
                      </div>
                      <button className="p-1 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">Amount</p>
                        <p className="font-semibold text-gray-900">₹{formatShortCurrency(item.totalAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 mb-1">Balance</p>
                        <p className="font-semibold text-red-600">₹{formatShortCurrency(item.balance)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 mb-1">Overdue</p>
                        <p className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded inline-block">
                          {item.daysOverdue}d
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {allOverdue.items.length > 20 && (
                <div className="px-4 sm:px-5 py-2 sm:py-3 bg-gray-50/50 text-center text-xs text-gray-500 border-t border-gray-100">
                  Showing 20 of {allOverdue.items.length} overdue items
                </div>
              )}
            </>
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-12 sm:w-14 h-12 sm:h-14 mx-auto mb-3 sm:mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">No overdue payments</p>
            </div>
          )}
        </motion.div>

        {/* FY Comparison Table */}
        {fyComparisonData.length > 0 && (
          <motion.div
            className="bg-white rounded-lg sm:rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4 sm:mb-6"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="p-3 sm:p-5 border-b border-gray-100">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                  <IndianRupee className="h-4 sm:h-5 w-4 sm:w-5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                    FY-wise Summary
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    Income, Expense, Profit comparison
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">FY</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Income</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expense</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Profit</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cash In</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cash Out</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Bills</th>
                    <th className="text-right px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Purchases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fyComparisonData.map((row) => (
                    <tr key={row.fy} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 font-bold text-gray-900">{row.fy}</td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-emerald-600 font-medium">
                        ₹{formatShortCurrency(row.income)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-red-600 font-medium">
                        ₹{formatShortCurrency(row.expense)}
                      </td>
                      <td className={`px-4 sm:px-5 py-3 sm:py-3.5 text-right font-bold ${row.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        ₹{formatShortCurrency(row.netProfit)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-gray-700 hidden md:table-cell">
                        ₹{formatShortCurrency(row.cashIn)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-gray-700 hidden md:table-cell">
                        ₹{formatShortCurrency(row.cashOut)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-gray-600 hidden lg:table-cell">
                        {row.billCount}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right text-gray-600 hidden lg:table-cell">
                        {row.purchaseCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-gray-100">
              {fyComparisonData.map((row) => (
                <div key={row.fy} className="p-4 space-y-3">
                  <p className="font-bold text-gray-900 text-sm">FY {row.fy}</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-gray-500 mb-1">Income</p>
                      <p className="font-semibold text-emerald-600">₹{formatShortCurrency(row.income)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Expense</p>
                      <p className="font-semibold text-red-600">₹{formatShortCurrency(row.expense)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Profit</p>
                      <p className={`font-bold ${row.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        ₹{formatShortCurrency(row.netProfit)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="text-right">
                      <p className="text-gray-500 mb-1">Cash In</p>
                      <p className="font-medium text-gray-700">₹{formatShortCurrency(row.cashIn)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 mb-1">Cash Out</p>
                      <p className="font-medium text-gray-700">₹{formatShortCurrency(row.cashOut)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showModal && modalItem && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-white rounded-lg sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`p-4 sm:p-5 text-white flex-shrink-0 ${
                  modalItem.type === "bill"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600"
                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 bg-white/20 rounded-lg sm:rounded-xl flex-shrink-0">
                      {modalItem.type === "bill" ? (
                        <FileText className="h-4 sm:h-5 w-4 sm:w-5" />
                      ) : (
                        <Package className="h-4 sm:h-5 w-4 sm:w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold truncate">
                        {modalItem.type === "bill" ? "Bill" : "Purchase"} #{modalItem.number}
                      </h2>
                      <p className="text-white/80 text-xs sm:text-sm truncate">{modalItem.party}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(modalItem.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-red-600">
                      {formatDate(modalItem.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Total</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{formatCurrency(modalItem.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Paid</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      ₹{formatCurrency(modalItem.paidAmount)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs sm:text-sm text-gray-600">Outstanding</span>
                    <span className="text-base sm:text-lg font-bold text-red-600">
                      ₹{formatCurrency(modalItem.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Days overdue</span>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      {modalItem.daysOverdue} days
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 flex-shrink-0 flex gap-2 sm:gap-3">
                <button
                  onClick={() => handleNavigate(modalItem)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-violet-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:bg-violet-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">View</span>
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SummaryCard = ({ title, value, subValue, icon, gradient, bg, borderColor }) => (
  <motion.div
    className={`relative p-3 sm:p-4 lg:p-5 ${bg} ${borderColor} border rounded-lg sm:rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200`}
    variants={itemVariants}
    whileHover={{ y: -2 }}
  >
    <div className="flex items-center justify-between mb-2 sm:mb-3">
      <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}>
        {icon}
      </div>
    </div>
    <p className="text-xs font-medium text-gray-500 mb-1 truncate">{title}</p>
    <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">{value}</p>
    <p className="text-xs text-gray-400 mt-0.5 truncate">{subValue}</p>
  </motion.div>
);

const MaterialFlowCard = ({ title, count, total, icon, color, link }) => {
  const colors = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "bg-emerald-100 text-emerald-600", text: "text-emerald-600" },
    blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "bg-blue-100 text-blue-600", text: "text-blue-600" },
    purple: { bg: "bg-purple-50", border: "border-purple-100", icon: "bg-purple-100 text-purple-600", text: "text-purple-600" },
    pink: { bg: "bg-pink-50", border: "border-pink-100", icon: "bg-pink-100 text-pink-600", text: "text-pink-600" },
  };
  const c = colors[color];

  return (
    <motion.div variants={itemVariants} whileHover={{ y: -2 }}>
      <Link to={link}>
        <div className={`${c.bg} ${c.border} border rounded-lg sm:rounded-2xl p-3 sm:p-4 hover:shadow-md transition-all duration-200 cursor-pointer group`}>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className={`p-2 rounded-lg ${c.icon}`}>{icon}</div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
          <p className="text-xs font-medium text-gray-500 mb-1 truncate">{title}</p>
          <p className={`text-base sm:text-lg font-bold ${c.text} truncate`}>₹{(total || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-400 mt-0.5">{count || 0} entries</p>
        </div>
      </Link>
    </motion.div>
  );
};

export default DashboardPage;
