const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  deactivateOrganization,
  activateOrganization,
  getMyOrganization,
} = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');
const { companyContext } = require('../middleware/companyContext');
const { superAdminGuard } = require('../middleware/superAdminGuard');


router.post('/', protect, companyContext, superAdminGuard, createOrganization);
router.get('/', protect, companyContext, superAdminGuard, getAllOrganizations);
router.get('/:id', protect, companyContext, superAdminGuard, getOrganization);
router.put('/:id', protect, companyContext, superAdminGuard, updateOrganization);
router.delete('/:id', protect, companyContext, superAdminGuard, deactivateOrganization);
router.patch('/:id/activate', protect, companyContext, superAdminGuard, activateOrganization);
router.get('/my', protect, companyContext, getMyOrganization);

module.exports = router;
