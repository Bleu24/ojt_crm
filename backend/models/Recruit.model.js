const mongoose = require('mongoose');

const RecruitSchema = new mongoose.Schema({
  dateApplied: { type: Date, required: true },
  fullName: { type: String, required: true },
  location: { type: String },
  course: { type: String },
  school: { type: String },
  educationalStatus: {
    type: String,
    enum: ['UNDERGRAD', 'GRADUATE', 'GRADUATING'],
    required: true
  },
  contactNumber: { type: String },
  applicationStatus: { type: String },
  dateOfCall: { type: Date },
  assignedTo: {  // Who owns this recruit record
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Recruit', RecruitSchema);

