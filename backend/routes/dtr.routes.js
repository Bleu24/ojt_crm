const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/roles.middleware');
const dtrController = require('../controllers/dtr.controller');

router.post('/create', authenticateToken, dtrController.createDtrEntry);
router.get('/me', authenticateToken, dtrController.getMyDtrEntries);
router.post('/timein', authenticateToken, dtrController.timeIn);
router.patch('/timeout', authenticateToken, dtrController.timeOut);
router.post('/import-entry', authenticateToken, dtrController.importDtrEntry);
router.get('/accomplishments/:userId', authenticateToken, requireRole(['unit_manager', 'admin']), dtrController.getAccomplishments);

module.exports = router;
