import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Phone, 
  MapPin, 
  FileText, 
  Users, 
  ArrowLeft,
  X,
  Sparkles,
  TrendingUp,
  Building,
  UserCheck,
  Briefcase
} from 'lucide-react';
import CompanyService from '../../services/CompanyService';
import CompanyForm from '../Company/CompanyForm';

const CompanyPage = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
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

  const fetchCompanies = useCallback(async (filterType = 'All') => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const params = {};
      if (filterType !== 'All') {
        params.companyType = filterType;
      }
      const response = await CompanyService.getAllCompanies(params);
      setCompanies(response.data);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch companies.';
      setError(errMsg);
      console.error("Fetch companies error:", errMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies(activeFilter);
  }, [fetchCompanies, activeFilter]);

  const handleAddCompany = () => {
    setEditingCompany(null);
    setShowFormModal(true);
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setShowFormModal(true);
  };

  const handleDeleteCompany = async (companyId) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        await CompanyService.deleteCompany(companyId);
        setCompanies(companies.filter(c => c._id !== companyId));
        setSuccessMessage('Company deleted successfully!');
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete company.';
        setError(errMsg);
        console.error("Delete company error:", errMsg);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFormSubmit = async (companyData) => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (editingCompany) {
        await CompanyService.updateCompany(editingCompany._id, companyData);
        setSuccessMessage('Company updated successfully!');
      } else {
        await CompanyService.createCompany(companyData);
        setSuccessMessage('Company added successfully!');
      }
      setShowFormModal(false);
      setEditingCompany(null);
      fetchCompanies(activeFilter);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || (editingCompany ? 'Failed to update company.' : 'Failed to create company.');
      setError(errMsg);
      console.error("Form submit error:", errMsg);
      setIsLoading(false);
      return Promise.reject(err);
    }
  };

  const handleCancelForm = () => {
    setShowFormModal(false);
    setEditingCompany(null);
    setError('');
  };

  // Filter companies based on search term
const filteredCompanies = companies.filter(company => {
  // 🔹 Company type filter
  if (activeFilter !== 'All' && company.companyType !== activeFilter) {
    return false;
  }

  // 🔹 Search filter
  const search = searchTerm.toLowerCase();

  return (
    company.name.toLowerCase().includes(search) ||
    company.address?.toLowerCase().includes(search) ||
    company.gstNumber?.toLowerCase().includes(search)
  );
});


  // Get company type statistics
  const getCompanyStats = () => {
    const stats = {
      total: companies.length,
      buyer: companies.filter(c => c.companyType === 'Buyer').length,
      seller: companies.filter(c => c.companyType === 'Seller').length,
      both: companies.filter(c => c.companyType === 'Both').length,    };
    return stats;
  };

  const stats = getCompanyStats();

  const getCompanyTypeIcon = (type) => {
    switch (type) {
      case 'Buyer': return <UserCheck className="h-4 w-4" />;
      case 'Seller': return <Briefcase className="h-4 w-4" />;
      case 'Both': return <Building className="h-4 w-4" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const getCompanyTypeColor = (type) => {
    switch (type) {
      case 'Buyer': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Seller': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'Both': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (isLoading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading companies...</p>
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
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Company Management
                </h1>
                <p className="text-slate-500 text-xs lg:text-sm font-medium">
                  Manage your business partners and clients
                </p>
              </div>
            </div>
            
            <div className='hidden lg:block'>
            <motion.button
              onClick={handleAddCompany}
              className="px-3 py-1.5 lg:px-6 lg:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-sm lg:text-md font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-5 w-5" />
              Add New Company
            </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <motion.div
          className="grid grid-cols-3 lg:grid-cols-4 gap-4 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <StatCard
            title="Total Companies"
            value={stats.total}
            icon={<Building2 className="h-5 w-5" />}
            gradient="from-slate-500 to-slate-600"
            bgGradient="from-slate-50 to-slate-100"
          />
          <StatCard
            title="Buyers"
            value={stats.buyer}
            icon={<UserCheck className="h-5 w-5" />}
            gradient="from-emerald-500 to-emerald-600"
            bgGradient="from-emerald-50 to-emerald-100"
          />
          <StatCard
            title="Sellers"
            value={stats.seller}
            icon={<Briefcase className="h-5 w-5" />}
            gradient="from-violet-500 to-violet-600"
            bgGradient="from-violet-50 to-violet-100"
          />
          <StatCard
            title="Both"
            value={stats.both}
            icon={<Building className="h-5 w-5" />}
            gradient="from-blue-500 to-blue-600"
            bgGradient="from-blue-50 to-blue-100"
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
                  placeholder="Search companies by name, address, or GST number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-black bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {['All', 'Buyer', 'Seller', 'Both'].map((type) => (    
                <motion.button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeFilter === type
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {type === 'All' ? 'All Companies' : type}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Modal for Add/Edit Company */}
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
                className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {editingCompany ? 'Edit Company' : 'Add New Company'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelForm}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div>
                  <CompanyForm
                    onSubmit={handleFormSubmit}
                    initialData={editingCompany}
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
        {!isLoading && filteredCompanies.length === 0 && !error && (
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
              <Building2 className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              {searchTerm ? 'No companies found' : 'No companies yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or filters.' 
                : 'Get started by adding your first company.'
              }
            </p>
          </motion.div>
        )}

        {/* Companies Grid/List */}
        {filteredCompanies.length > 0 && (
          <motion.div
            className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 lg:grid-cols-3'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {filteredCompanies.map((company, index) => (
              <motion.div
                key={company._id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 hover:shadow-xl transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg text-black bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-violet-100 group-hover:to-blue-100 transition-all duration-300">
                      {getCompanyTypeIcon(company.companyType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg group-hover:text-violet-600 transition-colors duration-300">
                        {company.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getCompanyTypeColor(company.companyType)}`}>
                        {getCompanyTypeIcon(company.companyType)}
                        {company.companyType}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => handleEditCompany(company)}
                      className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Edit Company"
                    >
                      <Edit3 className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDeleteCompany(company._id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete Company"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>

                <div className="space-y-3">
                  {company.address && (
                    <div className="flex items-start gap-3 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{company.address}</span>
                    </div>
                  )}
                  
                  {company.gstNumber && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="font-mono">{company.gstNumber}</span>
                    </div>
                  )}
                  
                  {company.mobileNumber && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Phone className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span>{company.mobileNumber}</span>
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
            onClick={handleAddCompany}
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
    className={`relative p-4 bg-gradient-to-br ${bgGradient} rounded-xl shadow-lg border border-slate-200/50 overflow-hidden group hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -2 }}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          {icon}
        </div>
        <TrendingUp className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors duration-300" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  </motion.div>
);

export default CompanyPage;