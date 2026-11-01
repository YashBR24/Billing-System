import React from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { theme, getStatusColor } from '../styles/theme';

/**
 * Modern Table Component - Use this pattern across your project
 * Features: Glass morphism, animations, consistent styling
 */
const ModernTable = ({ 
  data = [], 
  columns = [], 
  title = "Data Table",
  onAdd,
  onEdit,
  onDelete,
  onView,
  loading = false,
  emptyMessage = "No data available"
}) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="modern-spinner"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="modern-card p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {data.length} {data.length === 1 ? 'record' : 'records'} found
          </p>
        </div>
        
        {onAdd && (
          <motion.button
            onClick={onAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 
                     hover:from-blue-600 hover:to-blue-700 text-white font-medium 
                     px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 
                     hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaPlus className="h-4 w-4" />
            Add New
          </motion.button>
        )}
      </div>

      {/* Table */}
      {data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-slate-400 text-lg mb-2">📋</div>
          <p className="text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="modern-table">
            <table className="w-full">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <motion.th
                      key={column.key}
                      variants={itemVariants}
                      className="text-left font-semibold text-slate-200"
                    >
                      {column.label}
                    </motion.th>
                  ))}
                  <motion.th 
                    variants={itemVariants}
                    className="text-right font-semibold text-slate-200"
                  >
                    Actions
                  </motion.th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <motion.tr
                    key={row.id || rowIndex}
                    variants={itemVariants}
                    whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}
                    className="transition-colors duration-200"
                  >
                    {columns.map((column) => (
                      <td key={`${row.id}-${column.key}`} className="text-slate-300">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {onView && (
                          <motion.button
                            onClick={() => onView(row)}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 
                                     hover:bg-blue-500/20 hover:text-blue-400 
                                     transition-all duration-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <FaEye className="h-4 w-4" />
                          </motion.button>
                        )}
                        {onEdit && (
                          <motion.button
                            onClick={() => onEdit(row)}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 
                                     hover:bg-green-500/20 hover:text-green-400 
                                     transition-all duration-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <FaEdit className="h-4 w-4" />
                          </motion.button>
                        )}
                        {onDelete && (
                          <motion.button
                            onClick={() => onDelete(row)}
                            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 
                                     hover:bg-red-500/20 hover:text-red-400 
                                     transition-all duration-200"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <FaTrash className="h-4 w-4" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Modern Modal Component
 */
export const ModernModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      
      {/* Modal */}
      <motion.div
        className={`relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 
                   backdrop-blur-xl border border-slate-700/50 rounded-2xl 
                   shadow-2xl w-full ${sizeClasses[size]}`}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            {title && (
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

/**
 * Modern Button Component
 */
export const ModernButton = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  loading = false,
  icon: Icon,
  ...props 
}) => {
  const variants = {
    primary: theme.components.button.primary,
    secondary: theme.components.button.secondary,
    success: theme.components.button.success,
    error: theme.components.button.error,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      className={`${variants[variant]} ${sizes[size]} relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed`}
      whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
      disabled={loading}
      {...props}
    >
      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <div className={`flex items-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </div>
    </motion.button>
  );
};

/**
 * Modern Input Component
 */
export const ModernInput = ({ 
  label, 
  error, 
  icon: Icon, 
  className = '',
  ...props 
}) => {
  return (
    <div className="modern-form-group">
      {label && (
        <label className="modern-label">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <input
          className={`modern-input w-full ${Icon ? 'pl-11' : ''} ${error ? 'border-red-500 focus:border-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Modern Status Badge Component
 */
export const StatusBadge = ({ status, text }) => {
  return (
    <span className={`status-badge ${getStatusColor(status)}`}>
      {text || status}
    </span>
  );
};

export default ModernTable;
