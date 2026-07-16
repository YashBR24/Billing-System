import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const OrganizationPicker = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || !user.token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE}/organizations`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setOrganizations(data.filter((org) => org.isActive));
        } else {
          const errData = await response.json().catch(() => ({}));
          setError(errData.message || `Failed to load organizations (Status: ${response.status})`);
        }
      } catch (err) {
        setError(`Network error: ${err.message}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, [navigate]);

  const handleSelectOrganization = async (orgId) => {
    setSwitching(orgId);
    setError('');
    try {
      const user = JSON.parse(localStorage.getItem('user'));

      const response = await fetch(`${API_BASE}/auth/switch-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ organizationId: orgId }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedUser = {
          ...user,
          token: data.token,
          organization: data.organization,
          needsOrgSelection: false,
          isScopedContext: true,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        navigate('/dashboard');
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to switch organization');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-blue-100 mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Select Organization</h1>
          <p className="text-slate-500 mt-2">Choose the organization you want to work with</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-center">
            <p className="font-medium">{error}</p>
            <button
              onClick={() => { localStorage.clear(); navigate('/login'); }}
              className="mt-2 text-sm text-red-800 underline"
            >
              Clear data and return to login
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {organizations.map((org) => (
            <button
              key={org._id}
              onClick={() => handleSelectOrganization(org._id)}
              disabled={switching === org._id}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl border border-slate-200 p-6 text-left transition-all duration-300 hover:border-blue-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{org.name}</h3>
                    {org.shortName && (
                      <p className="text-sm text-slate-500">{org.shortName}</p>
                    )}
                  </div>
                </div>
                <svg className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium">
                  {org.businessType === 'yarn' ? 'Yarn' : 'Jari'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                  Cops Label: {org.terminology?.copsLabel || 'Cops'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                  Active
                </span>
              </div>
            </button>
          ))}
        </div>

        {organizations.length === 0 && !error && (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-slate-500">No active organizations found</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/superadmin/organizations')}
            className="inline-flex items-center px-6 py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Manage Organizations
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationPicker;
