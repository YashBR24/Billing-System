// Modern Theme Configuration for Billing System
// Use this configuration across all components for consistent styling

export const theme = {
  colors: {
    // Primary palette
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Slate palette (main background)
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    
    // Success/Green
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    
    // Warning/Yellow
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    // Error/Red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Purple
    purple: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
  },
  
  gradients: {
    primary: 'from-blue-500 to-blue-600',
    secondary: 'from-slate-700 to-slate-800',
    success: 'from-green-500 to-green-600',
    warning: 'from-yellow-500 to-yellow-600',
    error: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
    pink: 'from-pink-500 to-pink-600',
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    emerald: 'from-emerald-500 to-emerald-600',
    gray: 'from-gray-500 to-gray-600',
    
    // Background gradients
    darkBg: 'from-slate-900 via-slate-800 to-slate-900',
    lightBg: 'from-slate-50 to-slate-100',
    glowBg: 'from-slate-900/80 to-black/60',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
    glowGreen: '0 0 20px rgba(16, 185, 129, 0.3)',
    glowRed: '0 0 20px rgba(239, 68, 68, 0.3)',
    glowPurple: '0 0 20px rgba(147, 51, 234, 0.3)',
  },
  
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  
  typography: {
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  animations: {
    fadeIn: 'fadeIn 0.5s ease-in-out',
    slideInRight: 'slideInRight 0.5s ease-out',
    slideInLeft: 'slideInLeft 0.5s ease-out',
    scaleIn: 'scaleIn 0.3s ease-out',
    spin: 'spin 1s linear infinite',
  },
  
  components: {
    button: {
      primary: `
        bg-gradient-to-r from-blue-500 to-blue-600 
        hover:from-blue-600 hover:to-blue-700
        text-white font-medium px-6 py-3 rounded-xl
        shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40
        transition-all duration-300 transform hover:scale-105
      `,
      secondary: `
        bg-gradient-to-r from-slate-700 to-slate-800 
        hover:from-slate-600 hover:to-slate-700
        text-white font-medium px-6 py-3 rounded-xl
        shadow-lg hover:shadow-xl
        transition-all duration-300 transform hover:scale-105
      `,
      success: `
        bg-gradient-to-r from-green-500 to-green-600 
        hover:from-green-600 hover:to-green-700
        text-white font-medium px-6 py-3 rounded-xl
        shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40
        transition-all duration-300 transform hover:scale-105
      `,
      error: `
        bg-gradient-to-r from-red-500 to-red-600 
        hover:from-red-600 hover:to-red-700
        text-white font-medium px-6 py-3 rounded-xl
        shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40
        transition-all duration-300 transform hover:scale-105
      `,
    },
    
    card: `
      bg-gradient-to-br from-slate-900/90 to-slate-800/90
      backdrop-blur-xl border border-slate-700/50 rounded-2xl
      shadow-xl hover:shadow-2xl transition-all duration-300
      hover:transform hover:-translate-y-1
    `,
    
    input: `
      bg-slate-800/50 border border-slate-700/50 rounded-xl
      px-4 py-3 text-white placeholder-slate-400
      focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
      transition-all duration-300 backdrop-blur-sm
    `,
    
    modal: `
      bg-gradient-to-br from-slate-900/95 to-slate-800/95
      backdrop-blur-xl border border-slate-700/50 rounded-2xl
      shadow-2xl max-w-md w-full mx-4
    `,
  },
};

export const getGradientByIndex = (index) => {
  const gradients = [
    'from-blue-500 to-blue-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-orange-500 to-orange-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
    'from-pink-500 to-pink-600',
    'from-yellow-500 to-yellow-600',
    'from-red-500 to-red-600',
    'from-cyan-500 to-cyan-600',
    'from-emerald-500 to-emerald-600',
    'from-gray-500 to-gray-600',
  ];
  return gradients[index % gradients.length];
};

export const getStatusColor = (status) => {
  const statusColors = {
    success: 'text-green-400 bg-green-500/20 border-green-500/30',
    warning: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    error: 'text-red-400 bg-red-500/20 border-red-500/30',
    info: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    pending: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    completed: 'text-green-400 bg-green-500/20 border-green-500/30',
    cancelled: 'text-red-400 bg-red-500/20 border-red-500/30',
  };
  return statusColors[status] || statusColors.info;
};

export default theme;
