const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const dtrController = require('../controllers/dtr.controller');

router.post('/create', authenticateToken, dtrController.createDtrEntry);
router.get('/me', authenticateToken, dtrController.getMyDtrEntries);
router.post('/timein', authenticateToken, dtrController.timeIn);
router.patch('/timeout', authenticateToken, dtrController.timeOut);

module.exports = router;
