const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/roles.middleware');
const recruitController = require('../controllers/recruits.controller');

// Create recruit – any HR role
router.post('/', authenticateToken, recruitController.createRecruit);

// Get recruits assigned to current user
router.get('/mine', authenticateToken, recruitController.getMyRecruits);

// Get all recruits under a manager’s team
router.get('/team', authenticateToken, requireRole(['unit_manager', 'branch_manager', 'admin']), recruitController.getTeamRecruits);

// Get all recruits – only for branch managers
router.get('/', authenticateToken, requireRole(['branch_manager', 'admin']), recruitController.getAllRecruits);

// Update recruit – manager or higher
router.put('/:id', authenticateToken, requireRole(['unit_manager', 'branch_manager', 'admin']), recruitController.updateRecruit);

// Delete recruit – branch manager only
router.delete('/:id', authenticateToken, requireRole(['branch_manager', 'admin']), recruitController.deleteRecruit);

module.exports = router;
