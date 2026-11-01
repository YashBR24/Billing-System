// import React, { useState, useEffect, useCallback } from 'react';
// import { Link } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Settings as SettingsIcon, Percent, Package, Plus, Edit3, Trash2, ArrowLeft, X, Sparkles, TrendingUp, RefreshCw, FileText } from 'lucide-react';
// import SettingsService from '../../services/SettingsService';
// import ItemConfigForm from '../../components/ItemConfigForm';

// const SettingsPage = () => {
//   const [settings, setSettings] = useState({
//     sgstPercentage: 0,
//     cgstPercentage: 0,
//     igstPercentage: 0,
//     jobCgstPercentage: 0,
//     jobSgstPercentage: 0,
//     itemConfigurations: [],
//   });
//   const [initialLoadError, setInitialLoadError] = useState('');
//   const [isPageLoading, setIsPageLoading] = useState(true);
//   const [isUpdatingGST, setIsUpdatingGST] = useState(false);
//   const [gstUpdateMessage, setGstUpdateMessage] = useState({ type: '', text: '' });

//   const [showItemFormModal, setShowItemFormModal] = useState(false);
//   const [editingItemConfig, setEditingItemConfig] = useState(null);
//   const [isItemFormLoading, setIsItemFormLoading] = useState(false);
//   const [itemFormError, setItemFormError] = useState('');

//   const fetchSettings = useCallback(async () => {
//     setIsPageLoading(true);
//     setInitialLoadError('');
//     try {
//       const response = await SettingsService.getSettings();
//       setSettings(response.data || { 
//         sgstPercentage: 0, 
//         cgstPercentage: 0, 
//         igstPercentage: 0,
//         jobCgstPercentage: 0,
//         jobSgstPercentage: 0,
//         itemConfigurations: [] 
//       });
//     } catch (err) {
//       const errMsg = err.response?.data?.message || err.message || 'Failed to fetch settings.';
//       setInitialLoadError(errMsg);
//       console.error("Fetch settings error:", errMsg);
//     } finally {
//       setIsPageLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchSettings();
//   }, [fetchSettings]);

//   const handleGSTChange = (e) => {
//     const { name, value } = e.target;
//     setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
//   };

//   const handleSaveGSTPercentages = async (e) => {
//     e.preventDefault();
//     setIsUpdatingGST(true);
//     setGstUpdateMessage({ type: '', text: '' });
//     try {
//       const { 
//         sgstPercentage, 
//         cgstPercentage, 
//         igstPercentage,
//         jobCgstPercentage,
//         jobSgstPercentage
//       } = settings;
//       await SettingsService.updateSettings({ 
//         sgstPercentage, 
//         cgstPercentage, 
//         igstPercentage,
//         jobCgstPercentage,
//         jobSgstPercentage
//       });
//       setGstUpdateMessage({ type: 'success', text: 'GST percentages updated successfully!' });
//       fetchSettings();
//       setTimeout(() => {
//         setGstUpdateMessage({ type: '', text: '' });
//       }, 3000);
//     } catch (err) {
//       const errMsg = err.response?.data?.message || err.message || 'Failed to update GST percentages.';
//       setGstUpdateMessage({ type: 'error', text: errMsg });
//       setTimeout(() => {
//         setGstUpdateMessage({ type: '', text: '' });
//       }, 5000);
//     } finally {
//       setIsUpdatingGST(false);
//     }
//   };

//   const handleAddItemConfig = () => {
//     setEditingItemConfig(null);
//     setItemFormError('');
//     setShowItemFormModal(true);
//   };

//   const handleEditItemConfig = (item) => {
//     setEditingItemConfig(item);
//     setItemFormError('');
//     setShowItemFormModal(true);
//   };

//   const handleDeleteItemConfig = async (itemId) => {
//     if (window.confirm('Are you sure you want to delete this item configuration?')) {
//       setIsItemFormLoading(true);
//       setItemFormError('');
//       try {
//         await SettingsService.deleteItemConfiguration(itemId);
//         setSettings(prev => ({
//           ...prev,
//           itemConfigurations: prev.itemConfigurations.filter(item => item._id !== itemId),
//         }));
//       } catch (err) {
//         const errMsg = err.response?.data?.message || err.message || 'Failed to delete item configuration.';
//         setItemFormError(errMsg);
//       } finally {
//         setIsItemFormLoading(false);
//       }
//     }
//   };

//   const handleItemFormSubmit = async (itemData) => {
//     setIsItemFormLoading(true);
//     setItemFormError('');
//     try {
//       if (editingItemConfig) {
//         await SettingsService.updateItemConfiguration(editingItemConfig._id, itemData);
//       } else {
//         await SettingsService.addItemConfiguration(itemData);
//       }
//       setShowItemFormModal(false);
//       setEditingItemConfig(null);
//       fetchSettings();
//     } catch (err) {
//       const errMsg = err.response?.data?.message || err.message || (editingItemConfig ? 'Failed to update item.' : 'Failed to add item.');
//       setItemFormError(errMsg);
//       setIsItemFormLoading(false);
//       return Promise.reject(err);
//     }
//   };

//   const handleCancelItemForm = () => {
//     setShowItemFormModal(false);
//     setEditingItemConfig(null);
//     setItemFormError('');
//   };

//   if (isPageLoading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
//         <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
//           <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
//           <p className="text-slate-600 font-medium">Loading settings...</p>
//         </div>
//       </div>
//     );
//   }

//   if (initialLoadError) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
//         <motion.div
//           className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200/50"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ duration: 0.5 }}
//         >
//           <div className="p-4 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 w-fit mx-auto mb-6">
//             <X className="h-12 w-12 text-red-600" />
//           </div>
//           <h3 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Settings</h3>
//           <p className="text-red-600">{initialLoadError}</p>
//         </motion.div>
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
//       <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-4">
//         {/* Header Section */}
//         <motion.div
//           className="mb-4"
//           initial={{ y: -20, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ duration: 0.4 }}
//         >
//           <div className="flex items-center gap-3">
//             <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
//               <SettingsIcon className="h-6 w-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
//                 Application Settings
//               </h1>
//               <p className="text-slate-500 text-xs lg:text-sm font-medium">
//                 Configure GST rates and item details
//               </p>
//             </div>
//           </div>
//         </motion.div>

//         {/* GST Percentages Section */}
//         <motion.div
//           className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8 hover:shadow-xl transition-all duration-300"
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5, delay: 0.1 }}
//         >
//           <div className="flex items-center gap-3 mb-6">
//             <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
//               <Percent className="h-5 w-5" />
//             </div>
//             <h2 className="text-xl font-semibold text-slate-800">Default GST Percentages</h2>
//           </div>
//         <form onSubmit={handleSaveGSTPercentages} className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label htmlFor="sgstPercentage" className="block text-sm font-medium text-gray-700">SGST (%)</label>
//               <input
//                 type="number"
//                 name="sgstPercentage"
//                 id="sgstPercentage"
//                 value={settings.sgstPercentage}
//                 onChange={handleGSTChange}
//                 step="0.01"
//                 min="0"
//                 max="100"
//                 className="mt-1 block w-full px-4 py-3 text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
//               />
//             </div>
//             <div>
//               <label htmlFor="cgstPercentage" className="block text-sm font-medium text-gray-700">CGST (%)</label>
//               <input
//                 type="number"
//                 name="cgstPercentage"
//                 id="cgstPercentage"
//                 value={settings.cgstPercentage}
//                 onChange={handleGSTChange}
//                 step="0.01"
//                 min="0"
//                 max="100"
//                 className="mt-1 block w-full px-4 py-3 text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
//               />
//             </div>
//             <div>
//               <label htmlFor="igstPercentage" className="block text-sm font-medium text-gray-700">IGST (%)</label>
//               <input
//                 type="number"
//                 name="igstPercentage"
//                 id="igstPercentage"
//                 value={settings.igstPercentage}
//                 onChange={handleGSTChange}
//                 step="0.01"
//                 min="0"
//                 max="100"
//                 className="mt-1 block w-full px-4 py-3 text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
//               />
//             </div>
//           </div>
          
//           <h3 className="text-lg font-semibold text-slate-700 mt-6 mb-4">Job GST Percentages</h3>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label htmlFor="jobCgstPercentage" className="block text-sm font-medium text-gray-700">Job CGST (%)</label>
//               <input
//                 type="number"
//                 name="jobCgstPercentage"
//                 id="jobCgstPercentage"
//                 value={settings.jobCgstPercentage}
//                 onChange={handleGSTChange}
//                 step="0.01"
//                 min="0"
//                 max="100"
//                 className="mt-1 block w-full px-4 py-3 text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
//               />
//             </div>
//             <div>
//               <label htmlFor="jobSgstPercentage" className="block text-sm font-medium text-gray-700">Job SGST (%)</label>
//               <input
//                 type="number"
//                 name="jobSgstPercentage"
//                 id="jobSgstPercentage"
//                 value={settings.jobSgstPercentage}
//                 onChange={handleGSTChange}
//                 step="0.01"
//                 min="0"
//                 max="100"
//                 className="mt-1 block w-full px-4 py-3 text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
//               />
//             </div>
//           </div>

//           <div className="flex justify-end">
//             <motion.button
//               type="submit"
//               disabled={isUpdatingGST}
//               className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 rounded-xl shadow-lg hover:shadow-xl focus:ring-2 focus:ring-violet-500 disabled:opacity-50 transition-all duration-300 flex items-center gap-2"
//               whileHover={{ scale: 1.02, y: -2 }}
//               whileTap={{ scale: 0.98 }}
//             >
//               {isUpdatingGST ? (
//                 <>
//                   <RefreshCw className="h-5 w-5 animate-spin" />
//                   Saving...
//                 </>
//               ) : (
//                 'Save GST Settings'
//               )}
//             </motion.button>
//           </div>
//           <AnimatePresence>
//             {gstUpdateMessage.text && (
//               <motion.div
//                 className={`mt-4 p-4 rounded-xl text-sm flex items-center gap-3 ${
//                   gstUpdateMessage.type === 'success'
//                     ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
//                     : 'bg-red-50 border border-red-200 text-red-700'
//                 }`}
//                 initial={{ opacity: 0, y: -10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -10 }}
//               >
//                 <div className={`p-1 rounded-full ${
//                   gstUpdateMessage.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
//                 }`}>
//                   {gstUpdateMessage.type === 'success' ? (
//                     <Sparkles className="h-4 w-4" />
//                   ) : (
//                     <X className="h-4 w-4" />
//                   )}
//                 </div>
//                 {gstUpdateMessage.text}
//               </motion.div>
//             )}
//           </AnimatePresence>
//         </form>
//         </motion.div>

//         {/* Item Configurations Section */}
//         <motion.div
//           className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5, delay: 0.2 }}
//         >
//           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
//             <div className="flex items-center gap-3">
//               <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
//                 <Package className="h-5 w-5" />
//               </div>
//               <h2 className="text-xl font-semibold text-slate-800">Item Configurations</h2>
//             </div>
//             <motion.button
//               onClick={handleAddItemConfig}
//               className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
//               whileHover={{ scale: 1.02, y: -2 }}
//               whileTap={{ scale: 0.98 }}
//             >
//               <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
//               Add Item Config
//             </motion.button>
//           </div>

//           {isItemFormLoading && settings.itemConfigurations.length === 0 && (
//             <motion.div
//               className="text-center py-8"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.3 }}
//             >
//               <div className="flex justify-center items-center gap-3 text-slate-600">
//                 <RefreshCw className="h-6 w-6 animate-spin" />
//                 <span className="font-medium">Loading items...</span>
//               </div>
//             </motion.div>
//           )}

//           <AnimatePresence>
//             {itemFormError && (
//               <motion.div
//                 className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
//                 initial={{ opacity: 0, y: -10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -10 }}
//               >
//                 <div className="p-1 rounded-full bg-red-100">
//                   <X className="h-4 w-4" />
//                 </div>
//                 {itemFormError}
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {settings.itemConfigurations.length === 0 && !isItemFormLoading && (
//             <motion.div
//               className="text-center py-12"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.3 }}
//             >
//               <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
//                 <Package className="h-12 w-12 text-slate-400" />
//               </div>
//               <h3 className="text-xl font-semibold text-slate-800 mb-2">No item configurations</h3>
//               <p className="text-slate-500">Add your first item configuration to get started.</p>
//             </motion.div>
//           )}

//           {settings.itemConfigurations.length > 0 && (
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-slate-200">
//                 <thead className="bg-slate-50">
//                   <tr>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">HSN/SAC</th>
//                     <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Default Rate</th>
//                     <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-slate-200">
//                   <AnimatePresence>
//                     {settings.itemConfigurations.map((item, index) => (
//                       <motion.tr
//                         key={item._id || item.description + item.hsnSacCode}
//                         className="hover:bg-slate-50 transition-colors"
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -10 }}
//                         transition={{ duration: 0.3, delay: index * 0.05 }}
//                       >
//                         <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.description}</td>
//                         <td className="px-6 py-4 text-sm text-slate-600">{item.hsnSacCode}</td>
//                         <td className="px-6 py-4 text-sm text-slate-600">{item.defaultRate !== undefined ? item.defaultRate.toFixed(2) : 'N/A'}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right">
//                           <div className="flex justify-end gap-2">
//                             <motion.button
//                               onClick={() => handleEditItemConfig(item)}
//                               className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all duration-200"
//                               whileHover={{ scale: 1.1 }}
//                               whileTap={{ scale: 0.9 }}
//                               title="Edit Item"
//                             >
//                               <Edit3 className="h-4 w-4" />
//                             </motion.button>
//                             <motion.button
//                               onClick={() => handleDeleteItemConfig(item._id)}
//                               className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
//                               whileHover={{ scale: 1.1 }}
//                               whileTap={{ scale: 0.9 }}
//                               title="Delete Item"
//                               disabled={isItemFormLoading}
//                             >
//                               <Trash2 className="h-4 w-4" />
//                             </motion.button>
//                           </div>
//                         </td>
//                       </motion.tr>
//                     ))}
//                   </AnimatePresence>
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </motion.div>

//         {/* Modal for Add/Edit Item Configuration */}
//         <AnimatePresence>
//           {showItemFormModal && (
//             <motion.div
//               className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               onClick={handleCancelItemForm}
//             >
//               <motion.div
//                 className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
//                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
//                 animate={{ scale: 1, opacity: 1, y: 0 }}
//                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
//                 onClick={(e) => e.stopPropagation()}
//               >
//                 <div className="flex justify-between items-center p-6 border-b border-slate-200">
//                   <div className="flex items-center gap-3">
//                     <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600">
//                       <Package className="h-5 w-5 text-white" />
//                     </div>
//                     <h3 className="text-xl font-bold text-slate-800">
//                       {editingItemConfig ? 'Edit Item Configuration' : 'Add New Item Configuration'}
//                     </h3>
//                   </div>
//                   <button
//                     onClick={handleCancelItemForm}
//                     className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
//                   >
//                     <X className="h-5 w-5" />
//                   </button>
//                 </div>
//                 <div className="p-6">
//                   <AnimatePresence>
//                     {itemFormError && (
//                       <motion.div
//                         className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
//                         initial={{ opacity: 0, y: -10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -10 }}
//                       >
//                         <div className="p-1 rounded-full bg-red-100">
//                           <X className="h-4 w-4" />
//                         </div>
//                         {itemFormError}
//                       </motion.div>
//                     )}
//                   </AnimatePresence>
//                   <ItemConfigForm
//                     onSubmit={handleItemFormSubmit}
//                     initialData={editingItemConfig}
//                     onCancel={handleCancelItemForm}
//                     isLoading={isItemFormLoading}
//                   />
//                 </div>
//               </motion.div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </div>
//     </motion.div>
//   );
// };

// export default SettingsPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Percent, Package, Plus, Edit3, Trash2, ArrowLeft, X, Sparkles, RefreshCw } from 'lucide-react';
import SettingsService from '../../services/SettingsService';
import ItemConfigForm from '../Setting/ItemConfigForm';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    sgstPercentage: 0,
    cgstPercentage: 0,
    igstPercentage: 0,
    jobCgstPercentage: 0,
    jobSgstPercentage: 0,
    itemConfigurations: [],
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [initialLoadError, setInitialLoadError] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isUpdatingGST, setIsUpdatingGST] = useState(false);
  const [gstUpdateMessage, setGstUpdateMessage] = useState({ type: '', text: '' });
  const [showItemFormModal, setShowItemFormModal] = useState(false);
  const [editingItemConfig, setEditingItemConfig] = useState(null);
  const [isItemFormLoading, setIsItemFormLoading] = useState(false);
  const [itemFormError, setItemFormError] = useState('');

  // Detect screen resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSettings = useCallback(async () => {
    setIsPageLoading(true);
    setInitialLoadError('');
    try {
      const response = await SettingsService.getSettings();
      setSettings(response.data || { 
        sgstPercentage: 0, 
        cgstPercentage: 0, 
        igstPercentage: 0,
        jobCgstPercentage: 0,
        jobSgstPercentage: 0,
        itemConfigurations: [] 
      });
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to fetch settings.';
      setInitialLoadError(errMsg);
      console.error("Fetch settings error:", errMsg);
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleGSTChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSaveGSTPercentages = async (e) => {
    e.preventDefault();
    setIsUpdatingGST(true);
    setGstUpdateMessage({ type: '', text: '' });
    try {
      const { 
        sgstPercentage, 
        cgstPercentage, 
        igstPercentage,
        jobCgstPercentage,
        jobSgstPercentage
      } = settings;
      await SettingsService.updateSettings({ 
        sgstPercentage, 
        cgstPercentage, 
        igstPercentage,
        jobCgstPercentage,
        jobSgstPercentage
      });
      setGstUpdateMessage({ type: 'success', text: 'GST percentages updated successfully!' });
      fetchSettings();
      setTimeout(() => {
        setGstUpdateMessage({ type: '', text: '' });
      }, 3000);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to update GST percentages.';
      setGstUpdateMessage({ type: 'error', text: errMsg });
      setTimeout(() => {
        setGstUpdateMessage({ type: '', text: '' });
      }, 5000);
    } finally {
      setIsUpdatingGST(false);
    }
  };

  const handleAddItemConfig = () => {
    setEditingItemConfig(null);
    setItemFormError('');
    setShowItemFormModal(true);
  };

  const handleEditItemConfig = (item) => {
    setEditingItemConfig(item);
    setItemFormError('');
    setShowItemFormModal(true);
  };

  const handleDeleteItemConfig = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item configuration?')) {
      setIsItemFormLoading(true);
      setItemFormError('');
      try {
        await SettingsService.deleteItemConfiguration(itemId);
        setSettings(prev => ({
          ...prev,
          itemConfigurations: prev.itemConfigurations.filter(item => item._id !== itemId),
        }));
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete item configuration.';
        setItemFormError(errMsg);
      } finally {
        setIsItemFormLoading(false);
      }
    }
  };

  const handleItemFormSubmit = async (itemData) => {
    setIsItemFormLoading(true);
    setItemFormError('');
    try {
      if (editingItemConfig) {
        await SettingsService.updateItemConfiguration(editingItemConfig._id, itemData);
      } else {
        await SettingsService.addItemConfiguration(itemData);
      }
      setShowItemFormModal(false);
      setEditingItemConfig(null);
      fetchSettings();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || (editingItemConfig ? 'Failed to update item.' : 'Failed to add item.');
      setItemFormError(errMsg);
      setIsItemFormLoading(false);
      return Promise.reject(err);
    }
  };

  const handleCancelItemForm = () => {
    setShowItemFormModal(false);
    setEditingItemConfig(null);
    setItemFormError('');
  };

  // Item Configuration Card Component
  const ItemCard = ({ item, index }) => (
    <motion.div
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-5 hover:shadow-xl transition-all duration-300"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -3 }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-slate-800">{item.description}</h3>
        <p className="text-xs text-slate-500">{item.hsnSacCode}</p>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        <b>Rate:</b> ₹{item.defaultRate?.toFixed(2) || 'N/A'}
      </p>
      <div className="flex gap-2">
        <motion.button
          onClick={() => handleEditItemConfig(item)}
          className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 flex items-center justify-center gap-1 text-sm"
          whileTap={{ scale: 0.95 }}
        >
          <Edit3 className="h-4 w-4" /> Edit
        </motion.button>
        <motion.button
          onClick={() => handleDeleteItemConfig(item._id)}
          className="flex-1 px-3 py-2 bg-rose-50 text-rose-700 rounded-xl font-medium hover:bg-rose-100 flex items-center justify-center gap-1 text-sm"
          whileTap={{ scale: 0.95 }}
          disabled={isItemFormLoading}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </motion.button>
      </div>
    </motion.div>
  );

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50">
          <RefreshCw className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (initialLoadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div
          className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-100 to-red-200 w-fit mx-auto mb-6">
            <X className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Error Loading Settings</h3>
          <p className="text-red-600">{initialLoadError}</p>
        </motion.div>
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 shadow-lg">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Application Settings
              </h1>
              <p className="text-slate-500 text-xs lg:text-sm font-medium">
                Configure GST rates and item details
              </p>
            </div>
          </div>
        </motion.div>

        {/* GST Percentages Section */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6 mb-8 hover:shadow-xl transition-all duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Percent className="h-5 w-5" />
            </div>
            <h2 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Default GST Percentages</h2>
          </div>
          <form onSubmit={handleSaveGSTPercentages} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="sgstPercentage" className="block text-sm font-medium text-gray-700">SGST (%)</label>
                <input
                  type="number"
                  name="sgstPercentage"
                  id="sgstPercentage"
                  value={settings.sgstPercentage}
                  onChange={handleGSTChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 lg:px-4 lg:py-3 text-slate-900 bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                />
              </div>
              <div>
                <label htmlFor="cgstPercentage" className="block text-sm font-medium text-gray-700">CGST (%)</label>
                <input
                  type="number"
                  name="cgstPercentage"
                  id="cgstPercentage"
                  value={settings.cgstPercentage}
                  onChange={handleGSTChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 lg:px-4 lg:py-3 text-slate-900 bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                />
              </div>
              <div>
                <label htmlFor="igstPercentage" className="block text-sm font-medium text-gray-700">IGST (%)</label>
                <input
                  type="number"
                  name="igstPercentage"
                  id="igstPercentage"
                  value={settings.igstPercentage}
                  onChange={handleGSTChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 lg:px-4 lg:py-3 text-slate-900 bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                />
              </div>
            </div>
            
            <h3 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Job GST Percentages</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobCgstPercentage" className="block text-sm font-medium text-gray-700">Job CGST (%)</label>
                <input
                  type="number"
                  name="jobCgstPercentage"
                  id="jobCgstPercentage"
                  value={settings.jobCgstPercentage}
                  onChange={handleGSTChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 lg:px-4 lg:py-3 text-slate-900 bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                />
              </div>
              <div>
                <label htmlFor="jobSgstPercentage" className="block text-sm font-medium text-gray-700">Job SGST (%)</label>
                <input
                  type="number"
                  name="jobSgstPercentage"
                  id="jobSgstPercentage"
                  value={settings.jobSgstPercentage}
                  onChange={handleGSTChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full px-3 py-2 lg:px-4 lg:py-3 text-slate-900 bg-white border border-slate-200 rounded-lg lg:rounded-xl shadow-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all duration-200"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <motion.button
                type="submit"
                disabled={isUpdatingGST}
                className="px-3 py-1.5 lg:px-6 lg:py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white text-sm lg:text-md font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isUpdatingGST ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save GST Settings'
                )}
              </motion.button>
            </div>
            <AnimatePresence>
              {gstUpdateMessage.text && (
                <motion.div
                  className={`mt-4 p-4 rounded-xl text-sm flex items-center gap-3 ${
                    gstUpdateMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className={`p-1 rounded-full ${
                    gstUpdateMessage.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    {gstUpdateMessage.type === 'success' ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </div>
                  {gstUpdateMessage.text}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* Item Configurations Section */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Package className="h-5 w-5" />
              </div>
              <h2 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Item Configurations</h2>
            </div>
            <motion.button
              onClick={handleAddItemConfig}
              className="px-3 py-1.5 lg:px-6 lg:py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-sm lg:text-md font-semibold rounded-lg lg:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
              Add Item Config
            </motion.button>
          </div>

          {isItemFormLoading && settings.itemConfigurations.length === 0 && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-center items-center gap-3 text-slate-600">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="font-medium">Loading items...</span>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {itemFormError && (
              <motion.div
                className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-1 rounded-full bg-red-100">
                  <X className="h-4 w-4" />
                </div>
                {itemFormError}
              </motion.div>
            )}
          </AnimatePresence>

          {settings.itemConfigurations.length === 0 && !isItemFormLoading && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 w-fit mx-auto mb-6">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No item configurations</h3>
              <p className="text-slate-500">Add your first item configuration to get started.</p>
            </motion.div>
          )}

          {settings.itemConfigurations.length > 0 && (
            <div className={"grid grid-cols-1 lg:grid-cols-3 gap-4"}>
              <AnimatePresence>
                {settings.itemConfigurations.map((item, index) => (
                  <ItemCard key={item._id || item.description + item.hsnSacCode} item={item} index={index} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Modal for Add/Edit Item Configuration */}
        <AnimatePresence>
          {showItemFormModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelItemForm}
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
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {editingItemConfig ? 'Edit Item Configuration' : 'Add New Item Configuration'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancelItemForm}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <AnimatePresence>
                    {itemFormError && (
                      <motion.div
                        className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <div className="p-1 rounded-full bg-red-100">
                          <X className="h-4 w-4" />
                        </div>
                        {itemFormError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ItemConfigForm
                    onSubmit={handleItemFormSubmit}
                    initialData={editingItemConfig}
                    onCancel={handleCancelItemForm}
                    isLoading={isItemFormLoading}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SettingsPage;