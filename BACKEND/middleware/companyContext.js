const jwt = require('jsonwebtoken');

const companyContext = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[companyContext] URL:', req.originalUrl, '| role:', decoded.role, '| contextSet:', decoded.contextSet, '| isSuperAdminContext:', decoded.isSuperAdminContext, '| orgId:', decoded.organizationId);

    if (decoded.role === 'superadmin' && decoded.contextSet === false) {
      req.isSuperAdmin = true;
      req.decodedToken = decoded;

      const allowedPaths = [
        '/api/organizations',
        '/api/auth/switch-organization',
        '/api/auth/logout',
      ];

      const isAllowed = allowedPaths.some(
        (path) => req.originalUrl.startsWith(path)
      );

      if (!isAllowed) {
        return res.status(403).json({
          message: 'Please select an organization',
          needsOrgSelection: true,
        });
      }

      return next();
    }

    if (decoded.isSuperAdminContext === true) {
      req.organizationId = decoded.organizationId;
      req.companyContext = {
        name: decoded.organizationName,
        shortName: decoded.organizationShortName,
        terminology: decoded.terminology,
        businessType: decoded.businessType,
        logo: decoded.logo,
      };
      req.isSuperAdmin = true;
      req.decodedToken = decoded;
      console.log('[companyContext] SET orgId (scoped superadmin):', req.organizationId);
      return next();
    }

    if (decoded.role !== 'superadmin') {
      if (!decoded.organizationId) {
        return res.status(403).json({
          message: 'User not assigned to any organization',
        });
      }

      req.organizationId = decoded.organizationId;
      req.companyContext = {
        name: decoded.organizationName,
        shortName: decoded.organizationShortName,
        terminology: decoded.terminology,
        businessType: decoded.businessType,
        logo: decoded.logo,
      };
      req.decodedToken = decoded;
      console.log('[companyContext] SET orgId (regular user):', req.organizationId);
      return next();
    }

    console.log('[companyContext] FALLTHROUGH - no orgId set');
    next();
  } catch (error) {
    console.log('[companyContext] JWT verify error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

module.exports = { companyContext };
