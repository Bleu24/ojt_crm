function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    console.log('=== ROLE CHECK DEBUG ===');
    console.log('User Role:', userRole);
    console.log('User Role Type:', typeof userRole);
    console.log('Allowed Roles:', allowedRoles);
    console.log('Includes check:', allowedRoles.includes(userRole));
    console.log('Full user object:', req.user);
    console.log('========================');

    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log('ROLE CHECK FAILED!');
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient role',
        message: `Your role '${userRole}' is not allowed. Required: ${allowedRoles.join(', ')}`
      });
    }

    console.log('ROLE CHECK PASSED!');
    next();
  };
}

module.exports = requireRole;
