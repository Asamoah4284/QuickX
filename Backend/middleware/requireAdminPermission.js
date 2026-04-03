function requireAdminPermission(...permissions) {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ message: 'Admin authentication required' });
        }

        if (req.admin.role === 'superadmin') {
            return next();
        }

        const adminPermissions = Array.isArray(req.admin.permissions) ? req.admin.permissions : [];
        const hasPermission = permissions.every((permission) => adminPermissions.includes(permission));

        if (!hasPermission) {
            return res.status(403).json({ message: 'Missing required admin permission' });
        }

        next();
    };
}

module.exports = requireAdminPermission;
