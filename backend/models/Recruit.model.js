const mongoose = require('mongoose');

const RecruitSchema = new mongoose.Schema({
  dateApplied: { type: Date, required: true },
  fullName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true },
  permanentAddress: { type: String, required: true },
  location: { type: String },
  course: { type: String },
  school: { type: String },
  source: { type: String }, // Where the recruit came from
  educationalStatus: {
    type: String,
    enum: ['UNDERGRAD', 'GRADUATE', 'GRADUATING'],
    required: true
  },
  applicationStatus: { 
    type: String,
    enum: ['Applied', 'Interviewed', 'Hired', 'Rejected', 'Pending', 'Pending Final Interview'],
    default: 'Applied'
  },
  resumeUrl: { type: String }, // URL/path to uploaded resume (now Cloudinary URL)
  resumeCloudinaryId: { type: String }, // Cloudinary public ID for deletion
  
  // Legacy Interview/Schedule information (for backward compatibility)
  interviewDate: { type: Date },
  interviewTime: { type: String }, // Format: "HH:MM"
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  interviewNotes: { type: String },
  
  // Step 1 Interview (by intern/staff)
  initialInterviewDate: { type: Date },
  initialInterviewTime: { type: String },
  initialInterviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  initialInterviewNotes: { type: String },
  initialInterviewCompleted: { type: Boolean, default: false },
  
  // Step 2 Interview (by unit manager)
  finalInterviewDate: { type: Date },
  finalInterviewTime: { type: String },
  finalInterviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finalInterviewNotes: { type: String },
  finalInterviewCompleted: { type: Boolean, default: false },
  finalInterviewAssignedTo: { // Which unit manager is assigned to handle the final interview
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Zoom Meeting Information for Initial Interview
  initialInterviewZoomMeetingId: { type: String },
  initialInterviewZoomJoinUrl: { type: String },
  initialInterviewZoomStartUrl: { type: String },
  initialInterviewZoomPassword: { type: String },
  
  // Zoom Meeting Information for Final Interview
  finalInterviewZoomMeetingId: { type: String },
  finalInterviewZoomJoinUrl: { type: String },
  finalInterviewZoomStartUrl: { type: String },
  finalInterviewZoomPassword: { type: String },
  
  // Legacy Zoom Meeting Information (for backward compatibility)
  zoomMeetingId: { type: String },
  zoomJoinUrl: { type: String },
  zoomStartUrl: { type: String },
  zoomPassword: { type: String },
  
  // Assignment information
  assignedTo: {  // Who owns this recruit record
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Legacy field for compatibility
  dateOfCall: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Recruit', RecruitSchema);

