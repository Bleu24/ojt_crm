const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/roles.middleware');
const controller = require('../controllers/napReport.controller');

router.post('/upload', authenticateToken, requireRole(['unit_manager','admin']), controller.uploadPdf, controller.uploadNapReport);
router.get('/', authenticateToken, requireRole(['unit_manager','admin']), controller.getNapReports);
router.get('/export', authenticateToken, requireRole(['unit_manager','admin']), controller.exportNapReport);

module.exports = router;
