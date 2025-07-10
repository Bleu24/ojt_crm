const Recruit = require('../models/Recruit.model');
const User = require('../models/User.model');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Create a new recruit
exports.createRecruit = async (req, res) => {
  try {
    const recruitData = {
      ...req.body,
      assignedTo: req.user.userId
    };

    // If file was uploaded, add the resume URL
    if (req.file) {
      recruitData.resumeUrl = req.file.path;
    }

    const recruit = new Recruit(recruitData);
    await recruit.save();
    
    const populatedRecruit = await Recruit.findById(recruit._id)
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role');
    
    res.status(201).json({ message: 'Recruit created successfully', recruit: populatedRecruit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all recruits (for Intern and staff roles)
exports.getAllRecruits = async (req, res) => {
  try {
    // Only allow Intern and staff to see all recruits
    if (!['intern', 'staff', 'unit_manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const query = {};

    // Filter by status if provided
    if (status && status !== 'all') {
      query.applicationStatus = status;
    }

    // For unit managers, only show recruits assigned to them for final interview
    if (req.user.role === 'unit_manager') {
      query.finalInterviewAssignedTo = req.user.userId;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const recruits = await Recruit.find(query)
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role')
      .populate('initialInterviewer', 'name role')
      .populate('finalInterviewer', 'name role')
      .populate('finalInterviewAssignedTo', 'name role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Recruit.countDocuments(query);

    res.status(200).json({
      recruits,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecruits: total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recruits assigned to current user
exports.getMyRecruits = async (req, res) => {
  try {
    const recruits = await Recruit.find({ assignedTo: req.user.userId })
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role')
      .sort({ createdAt: -1 });
    
    res.status(200).json(recruits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single recruit by ID
exports.getRecruitById = async (req, res) => {
  try {
    const recruit = await Recruit.findById(req.params.id)
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role');
    
    if (!recruit) {
      return res.status(404).json({ message: 'Recruit not found' });
    }
    
    res.status(200).json(recruit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update recruit
exports.updateRecruit = async (req, res) => {
  try {
    const recruitId = req.params.id;
    const updateData = { ...req.body };

    // If file was uploaded, add the resume URL
    if (req.file) {
      updateData.resumeUrl = req.file.path;
    }

    const updated = await Recruit.findByIdAndUpdate(recruitId, updateData, { new: true })
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role');
    
    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }
    
    res.status(200).json({ message: 'Recruit updated successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Schedule interview for a recruit
exports.scheduleInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { interviewDate, interviewTime, interviewerId, interviewNotes } = req.body;

    // Validate interviewer exists
    if (interviewerId) {
      const interviewer = await User.findById(interviewerId);
      if (!interviewer) {
        return res.status(404).json({ message: 'Interviewer not found' });
      }
    }

    const updated = await Recruit.findByIdAndUpdate(
      recruitId,
      {
        interviewDate: new Date(interviewDate),
        interviewTime,
        interviewer: interviewerId,
        interviewNotes,
        applicationStatus: 'Pending'
      },
      { new: true }
    )
    .populate('assignedTo', 'name role')
    .populate('interviewer', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Interview scheduled successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Schedule initial interview (Step 1 - by intern/staff)
exports.scheduleInitialInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { interviewDate, interviewTime, interviewerId, interviewNotes } = req.body;

    // Only intern and staff can schedule initial interviews
    if (!['intern', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only intern and staff can schedule initial interviews' });
    }

    // Validate interviewer exists
    if (interviewerId) {
      const interviewer = await User.findById(interviewerId);
      if (!interviewer) {
        return res.status(404).json({ message: 'Interviewer not found' });
      }
    }

    const updated = await Recruit.findByIdAndUpdate(
      recruitId,
      {
        initialInterviewDate: new Date(interviewDate),
        initialInterviewTime: interviewTime,
        initialInterviewer: interviewerId,
        initialInterviewNotes: interviewNotes,
        applicationStatus: 'Pending'
      },
      { new: true }
    )
    .populate('assignedTo', 'name role')
    .populate('initialInterviewer', 'name role')
    .populate('finalInterviewer', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Initial interview scheduled successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Complete initial interview and update status
exports.completeInitialInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { notes, passed, finalInterviewAssignedTo } = req.body;

    // Only intern and staff can complete initial interviews
    if (!['intern', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only intern and staff can complete initial interviews' });
    }

    const updateData = {
      initialInterviewCompleted: true,
      initialInterviewNotes: notes
    };

    // If passed, mark for final interview and assign to unit manager if specified
    if (passed) {
      updateData.applicationStatus = 'Pending Final Interview';
      if (finalInterviewAssignedTo) {
        // Validate that the assigned user is a unit manager
        const assignedUser = await User.findById(finalInterviewAssignedTo);
        if (!assignedUser || assignedUser.role !== 'unit_manager') {
          return res.status(400).json({ error: 'Final interview can only be assigned to unit managers' });
        }
        updateData.finalInterviewAssignedTo = finalInterviewAssignedTo;
      }
    } else {
      updateData.applicationStatus = 'Rejected';
    }

    const updated = await Recruit.findByIdAndUpdate(recruitId, updateData, { new: true })
      .populate('assignedTo', 'name role')
      .populate('initialInterviewer', 'name role')
      .populate('finalInterviewer', 'name role')
      .populate('finalInterviewAssignedTo', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Initial interview completed successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Schedule final interview (Step 2 - by unit manager)
exports.scheduleFinalInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { interviewDate, interviewTime, interviewerId, interviewNotes } = req.body;

    // Only unit managers can schedule final interviews
    if (req.user.role !== 'unit_manager') {
      return res.status(403).json({ error: 'Only unit managers can schedule final interviews' });
    }

    // Check if initial interview was completed and passed
    const recruit = await Recruit.findById(recruitId);
    if (!recruit.initialInterviewCompleted || recruit.applicationStatus !== 'Pending Final Interview') {
      return res.status(400).json({ error: 'Initial interview must be completed first' });
    }

    // Validate interviewer exists
    if (interviewerId) {
      const interviewer = await User.findById(interviewerId);
      if (!interviewer) {
        return res.status(404).json({ message: 'Interviewer not found' });
      }
    }

    const updated = await Recruit.findByIdAndUpdate(
      recruitId,
      {
        finalInterviewDate: new Date(interviewDate),
        finalInterviewTime: interviewTime,
        finalInterviewer: interviewerId,
        finalInterviewNotes: interviewNotes,
        applicationStatus: 'Pending Final Interview'
      },
      { new: true }
    )
    .populate('assignedTo', 'name role')
    .populate('initialInterviewer', 'name role')
    .populate('finalInterviewer', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Final interview scheduled successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Complete final interview and update status
exports.completeFinalInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { notes, decision } = req.body; // decision: 'hired' or 'rejected'

    // Only unit managers can complete final interviews
    if (req.user.role !== 'unit_manager') {
      return res.status(403).json({ error: 'Only unit managers can complete final interviews' });
    }

    const updateData = {
      finalInterviewCompleted: true,
      finalInterviewNotes: notes,
      applicationStatus: decision === 'hired' ? 'Hired' : 'Rejected'
    };

    const updated = await Recruit.findByIdAndUpdate(recruitId, updateData, { new: true })
      .populate('assignedTo', 'name role')
      .populate('initialInterviewer', 'name role')
      .populate('finalInterviewer', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Final interview completed successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign recruit to a user
exports.assignRecruit = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { assignedToId } = req.body;

    // Validate assignee exists
    const assignee = await User.findById(assignedToId);
    if (!assignee) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updated = await Recruit.findByIdAndUpdate(
      recruitId,
      { assignedTo: assignedToId },
      { new: true }
    )
    .populate('assignedTo', 'name role')
    .populate('interviewer', 'name role');

    if (!updated) {
      return res.status(404).json({ message: 'Recruit not found' });
    }

    res.status(200).json({ message: 'Recruit assigned successfully', recruit: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all users for assignment dropdown
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'name email role').sort({ name: 1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get unit managers for final interview assignment
exports.getUnitManagers = async (req, res) => {
  try {
    const unitManagers = await User.find({ role: 'unit_manager' }, 'name email role').sort({ name: 1 });
    res.status(200).json(unitManagers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete recruit
exports.deleteRecruit = async (req, res) => {
  try {
    const deleted = await Recruit.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Recruit not found' });
    }
    res.status(200).json({ message: 'Recruit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get team recruits (for managers)
exports.getTeamRecruits = async (req, res) => {
  try {
    // Find users directly under this manager
    const team = await User.find({ supervisorId: req.user.userId }).select('_id');
    const teamIds = team.map(user => user._id);

    // Find all recruits assigned to that team
    const recruits = await Recruit.find({ assignedTo: { $in: teamIds } })
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role')
      .sort({ createdAt: -1 });
    
    res.json(recruits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export the upload middleware
exports.uploadResume = upload.single('resume');
