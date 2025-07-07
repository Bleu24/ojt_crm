function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    next();
  };
}

module.exports = requireRole;
