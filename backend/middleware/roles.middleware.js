function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient role',
        message: `Your role '${userRole}' is not allowed. Required: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = requireRole;
