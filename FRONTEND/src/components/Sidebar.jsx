import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ShoppingCart, ArrowLeftRight, 
  Building2, Users, Clock, Settings, BarChart3, Download, 
  Shield, BookOpen, LogOut, X, Menu, Package,
  ChevronRight, Sparkles, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthService from '../services/AuthService';

const navLinks = [
  { 
    to: "/dashboard", 
    text: "Dashboard", 
    icon: LayoutDashboard,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    description: "Overview & Analytics"
  },
  {
    to: "/gst",
    text: "GST Dashboard",
    icon: BarChart3,
    gradient: "from-green-500 to-teal-500",
    bgGradient: "from-green-50 to-teal-50",
    description: "GST Analytics & Reports"  
  },
  { 
    to: "/companies", 
    text: "Companies", 
    icon: Building2,
    gradient: "from-indigo-500 to-blue-500",
    bgGradient: "from-indigo-50 to-blue-50",
    description: "Client Management"
  },
  { 
    to: "/hr", 
    text: "HR Management", 
    icon: Users,
    gradient: "from-pink-500 to-yellow-500",
    bgGradient: "from-pink-50 to-yellow-50",
    description: "Employee & Attendance Management",
    subLinks: [
      { 
        to: "/workers", 
        text: "Workers", 
        icon: Users,
        gradient: "from-pink-500 to-rose-500",
        bgGradient: "from-pink-50 to-rose-50",
        description: "Staff Management"
      },
      { 
        to: "/attendance", 
        text: "Attendance", 
        icon: Clock,
        gradient: "from-yellow-500 to-orange-500",
        bgGradient: "from-yellow-50 to-orange-50",
        description: "Time Tracking"
      }
    ]
  },
  { 
    to: "/inventory", 
    text: "Inventory & Procurement", 
    icon: Package,
    gradient: "from-emerald-500 to-violet-500",
    bgGradient: "from-emerald-50 to-violet-50",
    description: "Manage Procurement & Inventory",
    subLinks: [
      { 
        to: "/purchases", 
        text: "Purchases", 
        icon: ShoppingCart,
        gradient: "from-violet-500 to-purple-500",
        bgGradient: "from-violet-50 to-purple-50",
        description: "Purchase Orders"
      },
      { 
        to: "/challans", 
        text: "Challans", 
        icon: FileText,
        gradient: "from-cyan-500 to-blue-500",
        bgGradient: "from-cyan-50 to-blue-50",
        description: "Delivery Notes"
      },
      { 
        to: "/boxes", 
        text: "Boxes", 
        icon: Package,
        gradient: "from-emerald-500 to-green-500",
        bgGradient: "from-emerald-50 to-green-50",
        description: "Inventory Boxes"
      }
    ]
  },
  { 
    to: "/finance", 
    text: "Finance", 
    icon: BookOpen,
    gradient: "from-teal-500 to-amber-500",
    bgGradient: "from-teal-50 to-amber-50",
    description: "Financial Management & Records",
    subLinks: [
      { 
        to: "/bills", 
        text: "Billing", 
        icon: FileText,
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
        description: "Manage Invoices"
      },
      {
        to: "/debit-notes",
        text: "Debit Notes",
        icon: FileText,
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
        description: "Manage Debit Notes"
      },
      { 
        to: "/credit-notes",
        text: "Credit Notes",
        icon: FileText,
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
        description: "Manage Credit Notes"
      },
      { 
        to: "/interest-notes",
        text: "Interest Notes",
        icon: FileText,
        gradient: "from-emerald-500 to-teal-500",
        bgGradient: "from-emerald-50 to-teal-50",
        description: "Manage Interest Notes"
      },
      { 
        to: "/transactions", 
        text: "Transactions", 
        icon: ArrowLeftRight,
        gradient: "from-orange-500 to-amber-500",
        bgGradient: "from-orange-50 to-amber-50",
        description: "Financial Records"
      },
      { 
        to: "/company-ledger", 
        text: "Company Ledger", 
        icon: BookOpen,
        gradient: "from-teal-500 to-cyan-500",
        bgGradient: "from-teal-50 to-cyan-50",
        description: "Account Books"
      }
    ]
  },
  { 
    to: "/System", 
    text: "System Settings", 
    icon: Settings,
    gradient: "from-slate-500 to-red-500",
    bgGradient: "from-slate-50 to-red-50",
    description: "System Configuration & Control",
    subLinks: [
      { 
        to: "/admin-panel", 
        text: "Admin Panel", 
        icon: Shield,
        gradient: "from-red-500 to-pink-500",
        bgGradient: "from-red-50 to-pink-50",
        description: "System Control"
      },
      { 
        to: "/settings", 
        text: "Settings", 
        icon: Settings,
        gradient: "from-slate-500 to-gray-500",
        bgGradient: "from-slate-50 to-gray-50",
        description: "Configuration"
      }
    ]
  },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 1024);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [openDropdowns, setOpenDropdowns] = useState({});

  const currentUser = AuthService.getCurrentUser();
  const organization = currentUser?.organization || null;
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isScopedContext = currentUser?.isScopedContext === true;

  const toggleDropdown = (linkTo) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [linkTo]: !prev[linkTo]
    }));
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const handleSwitchOrganization = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      const limitedUser = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: user.token,
        needsOrgSelection: true,
        isScopedContext: false,
        organization: null,
      };
      localStorage.setItem('user', JSON.stringify(limitedUser));
    }
    navigate('/select-organization');
  };

  const handleLinkClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 1280);
      if (window.innerWidth > 1280) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileOpen]);

  return (
    <>
      {/* Mobile menu button */}
      {!isDesktop && (
        <motion.button
          className="xl:hidden fixed top-4 right-4 z-50 p-3 rounded-2xl bg-white/90 backdrop-blur-xl text-slate-700 shadow-2xl border border-black/20"
          onClick={() => setMobileOpen(!mobileOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          { mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" /> }
        </motion.button>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && !isDesktop && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar container */}
      <motion.div
        className={`fixed top-0 left-0 z-50 h-screen bg-white shadow-2xl overflow-hidden border-r border-slate-200/50
          ${isDesktop ? 'w-80' : 'w-80'}`}
        initial={isDesktop ? { x: 0 } : { x: -320 }}
        animate={isDesktop ? { x: 0 } : { x: mobileOpen ? 0 : -320 }}
        transition={{ type: "spring", stiffness: 280, damping: 25 }}
      >

        {/* Sidebar Header */}
        <div className="relative p-6 border-b border-slate-200/50 bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Billing Software
                </h1>
                <p className="text-xs text-slate-500 font-medium">{organization?.name || 'Mahadev Filaments'}</p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="relative h-[calc(100%-14rem)] overflow-y-auto py-4 px-4">
          <div className="space-y-2">
            {navLinks.map((link, index) => {
              const IconComponent = link.icon;
              const isActive = location.pathname.startsWith(link.to);
              const isDropdownOpen = openDropdowns[link.to];

              const filteredSubLinks = link.subLinks
                ? link.subLinks.filter(sl => {
                    if (sl.to === "/admin-panel" && !isSuperAdmin) return false;
                    return true;
                  })
                : link.subLinks;

              if (link.subLinks && filteredSubLinks.length === 0) return null;

              return (
                <div key={link.to}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    onHoverStart={() => setHoveredItem(link.to)}
                    onHoverEnd={() => setHoveredItem(null)}
                  >
                    <div
                      onClick={() => {
                        if (link.subLinks) {
                          toggleDropdown(link.to);
                        } else {
                          navigate(link.to);
                          handleLinkClick();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (link.subLinks) toggleDropdown(link.to);
                          else {
                            navigate(link.to);
                            handleLinkClick();
                          }
                        }
                      }}
                      className={`
                        group relative flex items-center py-4 px-4 rounded-2xl
                        text-sm font-medium transition-all duration-300 overflow-hidden cursor-pointer
                        ${isActive
                          ? `bg-gradient-to-r ${link.bgGradient} border border-slate-200/50 shadow-lg shadow-slate-200/50`
                          : 'hover:bg-slate-50/80 hover:shadow-md hover:shadow-slate-200/30'
                        }
                      `}
                    >
                      {/* Active background glow */}
                      {isActive && (
                        <motion.div
                          className={`absolute inset-0 bg-gradient-to-r ${link.gradient} opacity-5`}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 0.05 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      
                      {/* Icon container */}
                      <div className={`relative flex-shrink-0 p-3 rounded-xl transition-all duration-300
                        ${isActive 
                          ? `bg-gradient-to-br ${link.gradient} text-white shadow-lg` 
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-700'
                        }`}>
                        <IconComponent className="h-5 w-5" />
                        
                        {/* Icon glow effect */}
                        {isActive && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-20 blur-lg rounded-xl`} />
                        )}
                      </div>
                      
                      {/* Text content */}
                      <div className="ml-4 flex-1 min-w-0">
                        <div className={`font-semibold transition-colors duration-300
                          ${isActive ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>
                          {link.text}
                        </div>
                        <div className={`text-xs mt-0.5 transition-colors duration-300
                          ${isActive ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                          {link.description}
                        </div>
                      </div>

                      {/* Dropdown or Arrow indicator */}
                      {link.subLinks ? (
                        <motion.div
                          className={`flex-shrink-0 transition-all duration-300
                            ${isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                          animate={{ 
                            rotate: isDropdownOpen ? 180 : 0
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <motion.div
                          className={`flex-shrink-0 transition-all duration-300
                            ${isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                          animate={{ 
                            x: hoveredItem === link.to || isActive ? 4 : 0,
                            opacity: hoveredItem === link.to || isActive ? 1 : 0.5
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </motion.div>
                      )}

                      {/* Active indicator dot */}
                      {isActive && (
                        <motion.div
                          className={`absolute left-0 top-1/2 w-1 h-8 bg-gradient-to-b ${link.gradient} rounded-r-full`}
                          initial={{ scale: 0, y: '-50%' }}
                          animate={{ scale: 1, y: '-50%' }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* Sub-links Dropdown */}
                  {link.subLinks && (
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-6 mt-1 space-y-1"
                        >
                          {filteredSubLinks.map((subLink, subIndex) => {
                            const SubIconComponent = subLink.icon;
                            const isSubActive = location.pathname === subLink.to;

                            return (
                              <motion.div
                                key={subLink.to}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: subIndex * 0.05, duration: 0.2 }}
                                onHoverStart={() => setHoveredItem(subLink.to)}
                                onHoverEnd={() => setHoveredItem(null)}
                              >
                                <Link
                                  to={subLink.to}
                                  onClick={handleLinkClick}
                                  className={`
                                    group relative flex items-center py-3 px-3 rounded-xl
                                    text-sm font-medium transition-all duration-300 overflow-hidden
                                    ${isSubActive
                                      ? `bg-gradient-to-r ${subLink.bgGradient} border border-slate-200/50 shadow-sm`
                                      : 'hover:bg-slate-50/80 hover:shadow-sm hover:shadow-slate-200/30'
                                    }
                                  `}
                                >
                                  {/* Sub-link active background glow */}
                                  {isSubActive && (
                                    <motion.div
                                      className={`absolute inset-0 bg-gradient-to-r ${subLink.gradient} opacity-5`}
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 0.05 }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  )}
                                  
                                  {/* Sub-link icon container */}
                                  <div className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-300
                                    ${isSubActive 
                                      ? `bg-gradient-to-br ${subLink.gradient} text-white shadow-sm` 
                                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-700'
                                    }`}>
                                    <SubIconComponent className="h-4 w-4" />
                                    
                                    {/* Sub-link icon glow effect */}
                                    {isSubActive && (
                                      <div className={`absolute inset-0 bg-gradient-to-br ${subLink.gradient} opacity-20 blur-lg rounded-lg`} />
                                    )}
                                  </div>
                                  
                                  {/* Sub-link text content */}
                                  <div className="ml-3 flex-1 min-w-0">
                                    <div className={`font-medium transition-colors duration-300
                                      ${isSubActive ? 'text-slate-800' : 'text-slate-600 group-hover:text-slate-800'}`}>
                                      {subLink.text}
                                    </div>
                                    <div className={`text-xs mt-0.5 transition-colors duration-300
                                      ${isSubActive ? 'text-slate-500' : 'text-slate-400 group-hover:text-slate-500'}`}>
                                      {subLink.description}
                                    </div>
                                  </div>

                                  {/* Sub-link arrow indicator */}
                                  <motion.div
                                    className={`flex-shrink-0 transition-all duration-300
                                      ${isSubActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                                    animate={{ 
                                      x: hoveredItem === subLink.to || isSubActive ? 4 : 0,
                                      opacity: hoveredItem === subLink.to || isSubActive ? 1 : 0.5
                                    }}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </motion.div>

                                  {/* Sub-link active indicator */}
                                  {isSubActive && (
                                    <motion.div
                                      className={`absolute left-0 top-1/2 w-0.5 h-5 bg-gradient-to-b ${subLink.gradient} rounded-r-full`}
                                      initial={{ scale: 0, y: '-50%' }}
                                      animate={{ scale: 1, y: '-50%' }}
                                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    />
                                  )}
                                </Link>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Logout Section */}
        <div className="relative p-4 bg-gradient-to-t from-slate-50/80 to-transparent border-t border-slate-200/50 backdrop-blur-sm">
          {isSuperAdmin && isScopedContext && (
            <motion.button
              onClick={handleSwitchOrganization}
              className="group relative flex items-center justify-center w-full py-3 px-4 rounded-2xl
                        bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600
                        text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300
                        hover:shadow-xl hover:shadow-blue-500/40 overflow-hidden mb-3"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center relative z-10">
                <div className="p-2 rounded-xl bg-white/20 mr-3">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="font-semibold">Switch Organization</span>
              </div>
            </motion.button>
          )}
          <motion.button
            onClick={handleLogout}
            className="group relative flex items-center justify-center w-full py-4 px-4 rounded-2xl
                      bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600
                      text-white font-semibold shadow-lg shadow-red-500/25 transition-all duration-300
                      hover:shadow-xl hover:shadow-red-500/40 overflow-hidden"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
            
            <div className="flex items-center relative z-10">
              <div className="p-2 rounded-xl bg-white/20 mr-3">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="font-semibold">
                Logout
              </span>
            </div>
          </motion.button>
          
          <motion.p 
            className="text-xs text-center text-slate-400 mt-4 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            © {new Date().getFullYear()} {organization?.name || 'Mahadev Filaments'}
          </motion.p>
        </div>
      </motion.div>
    </>
  );
};

export default Sidebar;