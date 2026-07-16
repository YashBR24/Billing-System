import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Phone, 
  Calendar, 
  UserCheck, 
  UserX,
  ArrowLeft,
  X,
  Sparkles,
  TrendingUp,
  User,
  Clock,
  Badge,
  RefreshCw,
  Eye,
  ChevronRight
} from 'lucide-react';
import WorkerService from '../../services/WorkerService';
import WorkerForm from '../Worker/WorkerForm';

const WorkerPage = () => {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [filterActive, setFilterActive] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchWorkers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    const params = {};
    if (filterActive !== 'all') {
      params.active = filterActive;
    }
    try {
      const response = await WorkerService.getAllWorkers(params);
      setWorkers(response.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch workers.';
      setError(errMsg);
      console.error("Fetch workers error:", errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [filterActive]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleAddWorker = () => {
    setEditingWorker(null);
    setShowFormModal(true);
  };

  const handleEditWorker = (worker) => {
    setEditingWorker(worker);
    setShowFormModal(true);
  };

  const handleDeleteWorker = async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker? This may affect historical attendance data if not handled carefully.')) {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        await WorkerService.deleteWorker(workerId);
        setWorkers(workers.filter(w => w._id !== workerId));
        setSuccessMessage('Worker deleted successfully!');
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete worker.';
        setError(errMsg);
        console.error("Delete worker error:", errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFormSubmit = async (workerData) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (editingWorker) {
        await WorkerService.updateWorker(editingWorker._id, workerData);
        setSuccessMessage('Worker updated successfully!');
      } else {
        await WorkerService.createWorker(workerData);
        setSuccessMessage('Worker added successfully!');
      }
      setShowFormModal(false);
      setEditingWorker(null);
      fetchWorkers();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || (editingWorker ? 'Failed to update worker.' : 'Failed to create worker.');
      setError(errMsg);
      setIsLoading(false);
      return Promise.reject(err);
    }
  };

  const handleCancelForm = () => {
    setShowFormModal(false);
    setEditingWorker(null);
    setError('');
  };

  // Filter workers based on search term
  const filteredWorkers = workers.filter(worker =>
    worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.workerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.contactNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get worker statistics
  const getWorkerStats = () => {
    const stats = {
      total: workers.length,
      active: workers.filter(w => w.isActive).length,
      inactive: workers.filter(w => !w.isActive).length,
    };
    return stats;
  };

  const stats = getWorkerStats();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  if (isLoading && workers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
          <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading workers...</p>
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
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Worker Management
                </h1>
                <p className="text-slate-500 text-xs xl:text-sm font-medium">
                  Manage your workforce and employee records
                </p>
              </div>
            </div>
            
            <div className='hidden xl:block'>
            <motion.button
              onClick={handleAddWorker}
              className="px-3 py-1.5 xl:px-6 xl:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-sm xl:text-md font-semibold rounded-lg xl:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              Add New Worker
            </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-3 xl:grid-cols-3 gap-6 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCard
            title="Total Workers"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            gradient="from-slate-500 to-slate-600"
            bgGradient="from-slate-50 to-slate-100"
          />
          <StatCard
            title="Active Workers"
            value={stats.active}
            icon={<UserCheck className="h-5 w-5" />}
            gradient="from-emerald-500 to-emerald-600"
            bgGradient="from-emerald-50 to-emerald-100"
          />
          <StatCard
            title="Inactive Workers"
            value={stats.inactive}
            icon={<UserX className="h-5 w-5" />}
            gradient="from-red-500 to-red-600"
            bgGradient="from-red-50 to-red-100"
          />
        </motion.div>

        {/* Filters and Search Section */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workers by name, worker ID, or contact number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-black bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Workers' },
                { key: 'true', label: 'Active' },
                { key: 'false', label: 'Inactive' }
              ].map((filter) => (
                <motion.button
                  key={filter.key}
                  onClick={() => setFilterActive(filter.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filterActive === filter.key
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {filter.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Modal for Add/Edit Worker */}
        <AnimatePresence>
          {showFormModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelForm}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {editingWorker ? 'Edit Worker' : 'Add New Worker'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelForm}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <WorkerForm
                    onSubmit={handleFormSubmit}
                    initialData={editingWorker}
                    onCancel={handleCancelForm}
                    isLoading={isLoading}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <X className="h-4 w-4" />
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

        {/* Empty State */}
        {!isLoading && filteredWorkers.length === 0 && !error && (
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? 'No workers found' : 'No workers yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or filters.' 
                : 'Get started by adding your first worker.'
              }
            </p>
          </motion.div>
        )}

        {/* Workers Grid/List */}
        {filteredWorkers.length > 0 && (
          <motion.div
            className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {filteredWorkers.map((worker, index) => (
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
                    <div className="p-3 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-violet-100 group-hover:to-blue-100 transition-all duration-300">
                      <User className="h-6 w-6 text-slate-600 group-hover:text-violet-600 transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg group-hover:text-violet-600 transition-colors duration-300">
                        {worker.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                        worker.isActive 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {worker.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {worker.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleEditWorker(worker)}
                      className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Edit Worker"
                    >
                      <Edit3 className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteWorker(worker._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete Worker"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-3">
                  {worker.workerId && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Badge className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="font-mono">ID: {worker.workerId}</span>
                    </div>
                  )}
                  
                  {worker.contactNumber && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span>{worker.contactNumber}</span>
                    </div>
                  )}
                  
                  {worker.joiningDate && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span>Joined: {formatDate(worker.joiningDate)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Mobile Floating Action Button */}
        {window.innerWidth < 1080 && (
          <motion.button
            onClick={handleAddWorker}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <Plus className="h-6 w-6" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

// Reusable StatCard Component
const StatCard = ({ title, value, icon, gradient, bgGradient }) => (
  <motion.div
    className={`relative p-4 xl:p-6 bg-gradient-to-br ${bgGradient} rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -2 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-center xl:justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <TrendingUp className="h-5 w-5 hidden lg:block text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
      </div>
      <div className='text-center xl:text-left'>
        <p className="text-3xl font-bold text-slate-800 mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  </motion.div>
);

export default WorkerPage;