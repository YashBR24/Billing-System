import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL + '/auth/';

const signup = (username, email, password, role = 'admin') => {
  return axios.post(API_URL + 'signup', {
    username,
    email,
    password,
    role,
  });
};

const login = (email, password) => {
  return axios
    .post(API_URL + 'login', {
      email,
      password,
    })
    .then((response) => {
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return response.data;
    });
};

const switchOrganization = async (token, organizationId) => {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/switch-organization`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ organizationId }),
  });
  return response.json();
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const AuthService = {
  signup,
  login,
  switchOrganization,
  logout,
  getCurrentUser,
};

export default AuthService;
