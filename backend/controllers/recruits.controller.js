const Recruit = require('../models/Recruit.model');
const User = require('../models/User.model');
const axios = require('axios');
const { resumeUpload, uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');

// Configure multer for file uploads using Cloudinary
exports.upload = [
  resumeUpload.single('resume'),
  uploadToCloudinary('crm/resumes', 'raw')
];

// Create a new recruit
exports.createRecruit = async (req, res) => {
  try {
    const recruitData = {
      ...req.body,
      assignedTo: req.user.userId
    };

    // If file was uploaded, add the resume URL and Cloudinary ID
    if (req.file) {
      recruitData.resumeUrl = req.file.path; // Cloudinary URL
      recruitData.resumeCloudinaryId = req.file.filename; // Cloudinary public ID
    }

    const recruit = new Recruit(recruitData);
    await recruit.save();
    
    const populatedRecruit = await Recruit.findById(recruit._id)
      .populate('assignedTo', 'name role')
      .populate('interviewer', 'name role');
    
    // Different message for unit managers
    const message = req.user.role === 'unit_manager' 
      ? 'Recruit added successfully! Please wait for interns to schedule the initial interview.'
      : 'Recruit created successfully';
    
    res.status(201).json({ message, recruit: populatedRecruit });
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

    // For unit managers, show recruits assigned to them for final interview OR recruits from their team OR recruits they created
    // Only show "upcoming" recruits (not hired/rejected)
    if (req.user.role === 'unit_manager') {
      // Find users directly under this manager
      const team = await User.find({ supervisorId: req.user.userId }).select('_id');
      const teamIds = team.map(user => user._id);
      
      query.$and = [
        {
          $or: [
            { finalInterviewAssignedTo: req.user.userId }, // Recruits assigned for final interview
            { assignedTo: { $in: teamIds } }, // Recruits assigned to team members
            { assignedTo: req.user.userId } // Recruits they created themselves
          ]
        },
        {
          applicationStatus: { 
            $in: ['Applied', 'Pending', 'Interviewed', 'Pending Final Interview'] 
          } // Only upcoming/active recruits
        }
      ];
    }

    // Search functionality
    if (search) {
      const searchQuery = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { contactNumber: { $regex: search, $options: 'i' } }
        ]
      };
      
      // If unit manager already has $and query, add search to it
      if (req.user.role === 'unit_manager' && query.$and) {
        query.$and.push(searchQuery);
      } else {
        // For other roles or if no existing $and query
        query.$and = query.$and || [];
        query.$and.push(searchQuery);
      }
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

    // If file was uploaded, handle old file deletion and add new resume URL
    if (req.file) {
      // Find current recruit to get old Cloudinary ID
      const currentRecruit = await Recruit.findById(recruitId);
      
      // Delete old resume from Cloudinary if it exists
      if (currentRecruit && currentRecruit.resumeCloudinaryId) {
        try {
          await deleteFromCloudinary(currentRecruit.resumeCloudinaryId);
          console.log('Old resume deleted from Cloudinary:', currentRecruit.resumeCloudinaryId);
        } catch (deleteError) {
          console.error('Error deleting old resume from Cloudinary:', deleteError);
          // Don't fail the update if deletion fails
        }
      }
      
      updateData.resumeUrl = req.file.path; // New Cloudinary URL
      updateData.resumeCloudinaryId = req.file.filename; // New Cloudinary public ID
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

// Schedule initial interview (Step 1 - by intern/staff only)
exports.scheduleInitialInterview = async (req, res) => {
  try {
    const { recruitId } = req.params;
    const { interviewDate, interviewTime, interviewerId, interviewNotes } = req.body;

    // Only allow intern and staff to schedule initial interviews
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

    // Only allow intern and staff to complete initial interviews
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
    const recruit = await Recruit.findById(req.params.id);
    
    if (!recruit) {
      return res.status(404).json({ message: 'Recruit not found' });
    }
    
    // Delete resume from Cloudinary if it exists
    if (recruit.resumeCloudinaryId) {
      try {
        await deleteFromCloudinary(recruit.resumeCloudinaryId);
        console.log('Resume deleted from Cloudinary:', recruit.resumeCloudinaryId);
      } catch (deleteError) {
        console.error('Error deleting resume from Cloudinary:', deleteError);
        // Continue with recruit deletion even if file deletion fails
      }
    }
    
    // Delete the recruit record
    await Recruit.findByIdAndDelete(req.params.id);
    
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
exports.uploadResume = exports.upload;

// Preview resume with direct Cloudinary URL for new tab opening
exports.previewResume = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the recruit
    const recruit = await Recruit.findById(id);
    if (!recruit) {
      return res.status(404).json({ error: 'Recruit not found' });
    }

    if (!recruit.resumeUrl) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Check permissions
    if (!['intern', 'staff', 'unit_manager', 'branch_manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Use the clean Cloudinary URL format for direct access
    let previewUrl = recruit.resumeUrl;

    // For Cloudinary URLs, ensure we use the simple format without transformation flags
    if (recruit.resumeUrl.includes('cloudinary.com')) {
      // Keep the original URL format: https://res.cloudinary.com/di99wgabr/raw/upload/v1753793424/crm/resumes/resume-1753793422742-979527016.pdf
      // No transformations needed - use direct URL
      previewUrl = recruit.resumeUrl;
    }

    console.log('Original URL:', recruit.resumeUrl);
    console.log('Preview URL (clean format):', previewUrl);

    // Detect file type for reference
    let fileType = 'pdf';
    if (recruit.resumeUrl) {
      const urlPath = recruit.resumeUrl.split('/').pop() || '';
      const urlParts = urlPath.split('.');
      
      if (urlParts.length > 1) {
        fileType = urlParts[urlParts.length - 1].toLowerCase().split('?')[0];
      }
      
      if (!['pdf', 'doc', 'docx'].includes(fileType)) {
        fileType = 'pdf'; // Default to PDF for resume files
      }
    }

    return res.json({ 
      previewUrl: previewUrl,
      originalUrl: recruit.resumeUrl,
      fileType: fileType
    });

  } catch (error) {
    console.error('Error getting resume URL:', error);
    res.status(500).json({ error: 'Failed to get resume URL' });
  }
};

// Proxy resume file with proper headers for better browser compatibility
exports.proxyResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query; // Check if download is requested
    
    // Find the recruit
    const recruit = await Recruit.findById(id);
    if (!recruit) {
      return res.status(404).json({ error: 'Recruit not found' });
    }

    if (!recruit.resumeUrl) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Check permissions
    if (!['intern', 'staff', 'unit_manager', 'branch_manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // For Cloudinary URLs, fetch and proxy the file
    if (recruit.resumeUrl.includes('cloudinary.com')) {
      try {
        // Better file type detection from URL
        let fileType = 'pdf';
        let contentType = 'application/pdf';
        let filename = `${recruit.fullName || 'resume'}-resume`;
        
        // Extract file extension from the URL path
        const urlPath = recruit.resumeUrl.split('/').pop() || '';
        const urlParts = urlPath.split('.');
        
        if (urlParts.length > 1) {
          const detectedType = urlParts[urlParts.length - 1].toLowerCase().split('?')[0];
          
          if (detectedType === 'doc') {
            fileType = 'doc';
            contentType = 'application/msword';
            filename += '.doc';
          } else if (detectedType === 'docx') {
            fileType = 'docx';
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            filename += '.docx';
          } else if (detectedType === 'pdf') {
            fileType = 'pdf';
            contentType = 'application/pdf';
            filename += '.pdf';
          } else {
            // Default to PDF
            filename += '.pdf';
          }
        } else {
          // Fallback detection for older uploads without extensions
          if (recruit.resumeUrl.includes('.doc') && !recruit.resumeUrl.includes('.docx')) {
            fileType = 'doc';
            contentType = 'application/msword';
            filename += '.doc';
          } else if (recruit.resumeUrl.includes('.docx')) {
            fileType = 'docx';
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            filename += '.docx';
          } else {
            filename += '.pdf';
          }
        }

        console.log('Proxy - File type detected:', fileType, 'Content-Type:', contentType, 'Filename:', filename);

        const response = await axios.get(recruit.resumeUrl, {
          responseType: 'stream',
          timeout: 30000
        });

        // Set headers based on whether download is requested
        const disposition = download === 'true' ? 'attachment' : 'inline';
        
        res.set({
          'Content-Type': response.headers['content-type'] || contentType,
          'Content-Disposition': `${disposition}; filename="${filename}"`,
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        });

        // Pipe the file data to the response
        response.data.pipe(res);
      } catch (proxyError) {
        console.error('Error proxying file:', proxyError);
        // Fallback to redirect
        return res.redirect(recruit.resumeUrl);
      }
    } else {
      // For local files, redirect directly
      return res.redirect(recruit.resumeUrl);
    }

  } catch (error) {
    console.error('Error proxying resume:', error);
    res.status(500).json({ error: 'Failed to load resume' });
  }
};
