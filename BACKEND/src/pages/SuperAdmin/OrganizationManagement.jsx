import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, ToggleRight, ToggleLeft, X, Loader2, Shield } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    slug: '',
    address: '',
    gstin: '',
    pan: '',
    businessType: 'yarn',
    logo: '',
    bankName: '',
    accountName: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    personName: '',
    phone: '',
    email: '',
    copsLabel: 'Cops',
  });

  const fetchOrganizations = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch(`${API_BASE}/organizations`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const resetForm = () => {
    setFormData({
      name: '', shortName: '', slug: '', address: '', gstin: '', pan: '',
      businessType: 'yarn', logo: '',
      bankName: '', accountName: '', accountNo: '', ifsc: '', branch: '',
      personName: '', phone: '', email: '', copsLabel: 'Cops',
    });
    setEditingOrg(null);
    setShowForm(false);
    setError('');
  };

  const openEditForm = (org) => {
    setEditingOrg(org);
    setFormData({
      name: org.name || '',
      shortName: org.shortName || '',
      slug: org.slug || '',
      address: org.address || '',
      gstin: org.gstin || '',
      pan: org.pan || '',
      businessType: org.businessType || 'yarn',
      logo: org.logo || '',
      bankName: org.bankDetails?.bankName || '',
      accountName: org.bankDetails?.accountName || '',
      accountNo: org.bankDetails?.accountNo || '',
      ifsc: org.bankDetails?.ifsc || '',
      branch: org.bankDetails?.branch || '',
      personName: org.contact?.personName || '',
      phone: org.contact?.phone || '',
      email: org.contact?.email || '',
      copsLabel: org.terminology?.copsLabel || 'Cops',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const body = {
        name: formData.name,
        shortName: formData.shortName,
        slug: formData.slug,
        address: formData.address,
        gstin: formData.gstin,
        pan: formData.pan,
        businessType: formData.businessType,
        logo: formData.logo,
        bankDetails: {
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNo: formData.accountNo,
          ifsc: formData.ifsc,
          branch: formData.branch,
        },
        contact: {
          personName: formData.personName,
          phone: formData.phone,
          email: formData.email,
        },
        terminology: { copsLabel: formData.copsLabel },
      };

      const url = editingOrg
        ? `${API_BASE}/organizations/${editingOrg._id}`
        : `${API_BASE}/organizations`;

      const response = await fetch(url, {
        method: editingOrg ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        resetForm();
        fetchOrganizations();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save organization');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (org) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));

      if (org.isActive) {
        const response = await fetch(`${API_BASE}/organizations/${org._id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (response.ok) fetchOrganizations();
      } else {
        const response = await fetch(`${API_BASE}/organizations/${org._id}/activate`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (response.ok) fetchOrganizations();
      }
    } catch (err) {
      setError('Failed to update organization status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              Organization Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Manage all organizations in the system</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm md:text-base"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isMobile ? (
            <div className="divide-y">
              {organizations.map((org) => (
                <div key={org._id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.shortName}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${org.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-500">Slug</p>
                      <p className="text-gray-900">{org.slug}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Type</p>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${org.businessType === 'yarn' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {org.businessType === 'yarn' ? 'Yarn' : 'Jari'}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500">Cops Label</p>
                      <p className="text-gray-900">{org.terminology?.copsLabel || 'Cops'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditForm(org)} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium text-sm">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(org)} className={`py-2 px-4 rounded-lg font-medium text-sm ${org.isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {org.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Cops Label</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{org.name}</p>
                          <p className="text-sm text-gray-500">{org.shortName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{org.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${org.businessType === 'yarn' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {org.businessType === 'yarn' ? 'Yarn' : 'Jari'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{org.terminology?.copsLabel || 'Cops'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${org.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {org.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditForm(org)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(org)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                          {org.isActive ? <ToggleLeft className="h-5 w-5 text-green-600" /> : <ToggleRight className="h-5 w-5 text-red-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  {editingOrg ? 'Edit Organization' : 'Add New Company'}
                </h2>
                <button onClick={resetForm} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Short Name</label>
                      <input type="text" value={formData.shortName} onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                      <input type="text" required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <select value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="yarn">Yarn</option>
                        <option value="jari">Jari</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                      <textarea required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                      <input type="text" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
                      <input type="text" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <input type="text" value={formData.logo} onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://..." />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input type="text" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <input type="text" value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account No</label>
                      <input type="text" value={formData.accountNo} onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
                      <input type="text" value={formData.ifsc} onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <input type="text" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
                      <input type="text" value={formData.personName} onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Terminology</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cops Label</label>
                      <input type="text" value={formData.copsLabel} onChange={(e) => setFormData({ ...formData, copsLabel: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g., Cops or Rola" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">GST rates are configured in Settings page per organization — not here.</p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={resetForm}
                    className="px-6 py-2 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="px-6 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? 'Saving...' : editingOrg ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationManagement;
