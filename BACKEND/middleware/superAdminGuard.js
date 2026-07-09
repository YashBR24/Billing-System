const superAdminGuard = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({
    message: 'Access denied. Super admin privileges required.',
  });
};

module.exports = { superAdminGuard };
