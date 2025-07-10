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
  educationalStatus: {
    type: String,
    enum: ['UNDERGRAD', 'GRADUATE', 'GRADUATING'],
    required: true
  },
  applicationStatus: { 
    type: String,
    enum: ['Applied', 'Interviewed', 'Hired', 'Rejected', 'Pending'],
    default: 'Applied'
  },
  resumeUrl: { type: String }, // URL/path to uploaded resume
  
  // Interview/Schedule information
  interviewDate: { type: Date },
  interviewTime: { type: String }, // Format: "HH:MM"
  interviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  interviewNotes: { type: String },
  
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

