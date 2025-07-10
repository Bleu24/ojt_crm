const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth.middleware');
const requireRole = require('../middleware/roles.middleware');
const recruitController = require('../controllers/recruits.controller');

// Create recruit with file upload – intern and staff can create
router.post('/', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.uploadResume, recruitController.createRecruit);

// Get recruits assigned to current user
router.get('/mine', authenticateToken, recruitController.getMyRecruits);

// Get all users for assignment dropdown
router.get('/users', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.getAllUsers);

// Get unit managers for final interview assignment
router.get('/unit-managers', authenticateToken, requireRole(['intern', 'staff']), recruitController.getUnitManagers);

// Get all recruits under a manager's team
router.get('/team', authenticateToken, requireRole(['unit_manager', 'branch_manager', 'admin']), recruitController.getTeamRecruits);

// Get all recruits – intern and staff can see all
router.get('/', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.getAllRecruits);

// Get single recruit by ID
router.get('/:id', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.getRecruitById);

// Schedule interview for a recruit
router.put('/:recruitId/schedule', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.scheduleInterview);

// Two-step interview process routes
// Schedule initial interview (Step 1 - by intern/staff)
router.put('/:recruitId/schedule-initial', authenticateToken, requireRole(['intern', 'staff']), recruitController.scheduleInitialInterview);

// Complete initial interview
router.put('/:recruitId/complete-initial', authenticateToken, requireRole(['intern', 'staff']), recruitController.completeInitialInterview);

// Schedule final interview (Step 2 - by unit manager)
router.put('/:recruitId/schedule-final', authenticateToken, requireRole(['unit_manager']), recruitController.scheduleFinalInterview);

// Complete final interview
router.put('/:recruitId/complete-final', authenticateToken, requireRole(['unit_manager']), recruitController.completeFinalInterview);

// Assign recruit to a user
router.put('/:recruitId/assign', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.assignRecruit);

// Update recruit with file upload
router.put('/:id', authenticateToken, requireRole(['intern', 'staff', 'unit_manager', 'branch_manager', 'admin']), recruitController.uploadResume, recruitController.updateRecruit);

// Delete recruit – managers and above
router.delete('/:id', authenticateToken, requireRole(['unit_manager', 'branch_manager', 'admin']), recruitController.deleteRecruit);

module.exports = router;
