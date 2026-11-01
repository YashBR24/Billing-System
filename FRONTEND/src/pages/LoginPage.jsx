import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthService from '../services/AuthService';
import logo from '../assets/MAHADEV_FILAMENTS-01.png'; // Make sure the path is correct
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      await AuthService.login(email, password);
      navigate('/dashboard');
    } catch (error) {
      const resMessage =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      setMessage(resMessage);
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  return (
    <motion.div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-0 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-full max-w-xs sm:max-w-sm md:max-w-md px-6 sm:px-8 py-6 bg-white shadow-2xl rounded-2xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 100,
          damping: 10,
          duration: 0.5 
        }}
      >
        {/* Logo Section with animation */}
        <motion.div 
          className="flex justify-center mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <img 
            src={logo} 
            alt="Mahadev Filaments Logo" 
            className="h-16 sm:h-20 object-contain" 
          />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h3 
            className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-2"
            variants={itemVariants}
          >
            Welcome Back
          </motion.h3>
          <motion.p 
            className="text-xs sm:text-sm text-center text-gray-600 mb-6"
            variants={itemVariants}
          >
            Sign in to your admin account
          </motion.p>

          <form onSubmit={handleLogin} className="mt-4 sm:mt-6">
            <motion.div 
              className="space-y-4 sm:space-y-5"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email Address
                </label>
                <motion.div whileHover={{ scale: 1.01 }}>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    id="email"
                    className="w-full text-black px-4 py-3 text-sm sm:text-base mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </motion.div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                    Password
                  </label>
                  {/* <a href="/forgot-password" className="text-xs text-indigo-600 hover:underline">
                    Forgot password?
                  </a> */}
                </div>
                {/* <motion.div whileHover={{ scale: 1.01 }}>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    id="password"
                    className="w-full text-black px-4 py-3 text-sm sm:text-base mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </motion.div> */}
                <motion.div whileHover={{ scale: 1.01 }} className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        id="password"
        className="w-full text-black px-4 py-3 pr-10 text-sm sm:text-base mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      
      {/* Toggle password visibility icon */}
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none"
        tabIndex={-1} // Prevent focus on tab
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </button>
    </motion.div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  className="w-full px-6 py-3 text-sm sm:text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl hover:from-indigo-700 hover:to-indigo-800 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-all flex items-center justify-center shadow-lg"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      Sign In
                    </>
                  )}
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    className="p-3 text-xs sm:text-sm text-red-700 bg-red-50 rounded-lg border border-red-200"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring" }}
                    role="alert"
                  >
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                className="text-center text-xs sm:text-sm text-gray-600 pt-2"
                variants={itemVariants}
              >
                Don't have an account?{' '}
                <a className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline" href="/signup">
                  Create one
                </a>
              </motion.div>
            </motion.div>
          </form>
        </motion.div>

        {/* Social login options - optional */}
        {/* <motion.div 
          className="mt-6 pt-4 border-t border-gray-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-center text-gray-500 mb-3">
            Or sign in with
          </p>
          <div className="flex justify-center space-x-4">
            <motion.button 
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z"/>
              </svg>
            </motion.button>
            <motion.button 
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </motion.button>
            <motion.button 
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
              </svg>
            </motion.button>
          </div>
        </motion.div> */}
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;