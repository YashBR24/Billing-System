import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthService from '../services/AuthService';
import logo from '../assets/MAHADEV_FILAMENTS-01.png'; // Make sure the path is correct
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      await AuthService.signup(username, email, password, 'admin');
      setMessage('Admin user registered successfully! You can now log in.');
      setLoading(false);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6"
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
            Create Admin Account
          </motion.h3>
          <motion.p 
            className="text-xs sm:text-sm text-center text-gray-600 mb-6"
            variants={itemVariants}
          >
            Register for administrative access
          </motion.p>

          <form onSubmit={handleSignup} className="mt-4 sm:mt-6">
            <motion.div 
              className="space-y-4 sm:space-y-5"
              variants={containerVariants}
            >
              <motion.div variants={itemVariants}>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                  Username
                </label>
                <motion.div whileHover={{ scale: 1.01 }}>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    id="username"
                    className="w-full text-black px-4 py-3 text-sm sm:text-base mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </motion.div>
              </motion.div>

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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password (min 6 characters)
                </label>
                {/* <motion.div whileHover={{ scale: 1.01 }}>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    id="password"
                    className="w-full px-4 py-3 text-sm sm:text-base mt-1 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="6"
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Sign Up
                    </>
                  )}
                </motion.button>
              </motion.div>

              <AnimatePresence>
                {message && (
                  <motion.div
                    className={`mt-4 p-3 text-sm rounded-lg flex items-center ${
                      message.includes('successfully') 
                        ? 'text-green-700 bg-green-50 border border-green-200' 
                        : 'text-red-700 bg-red-50 border border-red-200'
                    }`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring" }}
                    role="alert"
                  >
                    <svg 
                      className={`w-5 h-5 mr-2 ${
                        message.includes('successfully') ? 'text-green-500' : 'text-red-500'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {message.includes('successfully') ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                className="text-center text-xs sm:text-sm text-gray-600 pt-2"
                variants={itemVariants}
              >
                Already have an account?{' '}
                <a className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline" href="/login">
                  Log in
                </a>
              </motion.div>
            </motion.div>
          </form>
        </motion.div>

        {/* Terms and Conditions */}
        {/* <motion.div 
          className="mt-6 pt-4 border-t border-gray-200 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-xs text-gray-500">
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-indigo-600 hover:underline">Terms</a> and{' '}
            <a href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</a>
          </p>
        </motion.div> */}
      </motion.div>
    </motion.div>
  );
};

export default SignupPage;