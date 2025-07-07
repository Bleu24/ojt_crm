// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['intern', 'staff', 'unit_manager', 'branch_manager', 'admin'],
    default: 'intern',
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // their direct manager
    default: null
  },
  passwordHash: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
