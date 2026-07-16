import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  ArrowLeft,
  RefreshCw,
  X,
  Sparkles,
  TrendingUp,
  Activity,
  ChevronRight,
} from "lucide-react";
import AdminService from "../services/AdminService";

const AdminPanelPage = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Handle window resize to detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setError("");
    try {
      const response = await AdminService.getAllUsers();
      setUsers(response.data);
    } catch (err) {
      handleFetchError(err, "Failed to fetch users.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchLogs = useCallback(async (page = 1, limit = 50) => {
    setIsLoadingLogs(true);
    setError("");
    try {
      const response = await AdminService.getAllLogs(page, limit);
      setLogs(response.data.logs);
      setLogPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalLogs: response.data.totalLogs,
      });
    } catch (err) {
      handleFetchError(err, "Failed to fetch logs.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const handleFetchError = (err, defaultMessage) => {
    const errMsg = err.response?.data?.message || err.message || defaultMessage;
    setError(errMsg);
    console.error(defaultMessage, err);
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab, fetchUsers, fetchLogs]);

  const handleLogPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= logPagination.totalPages) {
      fetchLogs(newPage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  const getLogLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "error":
        return "text-red-800 bg-red-100 border-red-200";
      case "warn":
        return "text-amber-800 bg-amber-100 border-amber-200";
      case "info":
        return "text-blue-800 bg-blue-100 border-blue-200";
      default:
        return "text-slate-800 bg-slate-100 border-slate-200";
    }
  };

  // Fallback message for very small screens
  const renderMobileFallback = () => (
    <motion.div
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
        <FileText className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">
        Table View Unavailable
      </h3>
      <p className="text-slate-500">
        To view the table, please open this page on a laptop or PC.
      </p>
    </motion.div>
  );

  if (isLoadingUsers && users.length === 0 && activeTab === "users") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
          <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading admin data...</p>
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
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-4">
        {/* Header Section */}
        <motion.div
          className="mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">
                  Manage system users and monitor logs
                </p>
              </div>
            </div>
          </div>
        </motion.div>

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
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-lg border border-slate-200/50 p-2.5 lg:p-6 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex flex-row items-center justify-between">
            <motion.button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Manage Users ({users.length})
              </div>
            </motion.button>
            <motion.button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 ${
                activeTab === "logs"
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                System Logs (
                {logPagination.totalLogs > 1000
                  ? `${Math.floor(logPagination.totalLogs / 1000)}k+`
                  : logPagination.totalLogs}
                )
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isLoadingUsers && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center items-center gap-3 text-slate-600">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-lg font-medium">Loading users...</span>
                </div>
              </motion.div>
            )}
            {!isLoadingUsers && users.length === 0 && !error && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                  <Users className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No users found
                </h3>
                <p className="text-slate-500">
                  There are no registered users in the system.
                </p>
              </motion.div>
            )}
            {!isLoadingUsers && users.length > 0 && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="p-6 border-b border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      Registered Users
                    </h3>
                  </div>
                </div>
                {isMobile ? (
                  // Mobile: Card-based layout
                  <div className="p-4 space-y-4">
                    {users.map((user, index) => (
                      <motion.div
                        key={user._id}
                        className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * index }}
                      >
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Username
                            </span>
                            <p className="text-sm font-medium text-slate-900">
                              {user.username}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Email
                            </span>
                            <p className="text-sm text-slate-600">
                              {user.email}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Role
                            </span>
                            <p>
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200">
                                {user.role}
                              </span>
                            </p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Created At
                            </span>
                            <p className="text-sm text-slate-600">
                              {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Desktop: Table layout
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Created At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((user, index) => (
                          <motion.tr
                            key={user._id}
                            className="hover:bg-slate-50 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * index }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">
                                {user.username}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-violet-100 text-violet-800 border border-violet-200">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              {formatDate(user.createdAt)}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isLoadingLogs && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center items-center gap-3 text-slate-600">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-lg font-medium">Loading logs...</span>
                </div>
              </motion.div>
            )}
            {!isLoadingLogs && logs.length === 0 && !error && (
              <motion.div
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                  <FileText className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  No logs found
                </h3>
                <p className="text-slate-500">
                  There are no system logs to display.
                </p>
              </motion.div>
            )}
            {!isLoadingLogs && logs.length > 0 && (
              <>
                <motion.div
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="p-6 border-b border-slate-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Activity className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        System Activity Logs
                      </h3>
                    </div>
                  </div>
                  {isMobile ? (
                    // Mobile: Card-based layout
                    <div className="p-4 space-y-4">
                      {logs.map((logEntry, index) => (
                        <motion.div
                          key={logEntry._id}
                          className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * index }}
                        >
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-slate-500">
                                Timestamp
                              </span>
                              <p className="text-sm text-slate-600">
                                {formatDate(logEntry.timestamp)}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-slate-500">
                                Level
                              </span>
                              <p>
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getLogLevelColor(
                                    logEntry.level
                                  )}`}
                                >
                                  {logEntry.level?.toUpperCase()}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-slate-500">
                                Message
                              </span>
                              <p className="text-sm text-slate-700">
                                {logEntry.message}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    // Desktop: Table layout
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Timestamp
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Level
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Message
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {logs.map((logEntry, index) => (
                            <motion.tr
                              key={logEntry._id}
                              className="hover:bg-slate-50 transition-colors"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: 0.05 * index,
                              }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                {formatDate(logEntry.timestamp)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border ${getLogLevelColor(
                                    logEntry.level
                                  )}`}
                                >
                                  {logEntry.level?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {logEntry.message}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>

                {/* Log Pagination */}
                {logPagination.totalPages > 1 && (
                  <div className="p-6 bg-slate-50 border-t border-slate-200">
                    <motion.div
                      className="flex flex-wrap justify-center items-center gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <motion.button
                        onClick={() =>
                          handleLogPageChange(logPagination.currentPage - 1)
                        }
                        disabled={
                          logPagination.currentPage === 1 || isLoadingLogs
                        }
                        className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Previous
                      </motion.button>
                      <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                        Page {logPagination.currentPage} of{" "}
                        {logPagination.totalPages}
                      </span>
                      <motion.button
                        onClick={() =>
                          handleLogPageChange(logPagination.currentPage + 1)
                        }
                        disabled={
                          logPagination.currentPage ===
                            logPagination.totalPages || isLoadingLogs
                        }
                        className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Next
                      </motion.button>
                    </motion.div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminPanelPage;
