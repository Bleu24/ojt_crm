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
    enum: ['intern', 'staff', 'unit_manager', 'admin'],
    default: 'intern',
  },
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // their direct manager
    default: null
  },
  requiredHours: {
    type: Number,
    default: function() {
      return this.role === 'intern' ? 0 : null;
    }
  },
  passwordHash: {
    type: String,
    required: true,
  },
  // Zoom OAuth Integration
  zoomAccessToken: {
    type: String,
    default: null
  },
  zoomRefreshToken: {
    type: String,
    default: null
  },
  zoomTokenExpiry: {
    type: Date,
    default: null
  },
  zoomUserId: {
    type: String,
    default: null
  },
  zoomEmail: {
    type: String,
    default: null
  },
  zoomConnected: {
    type: Boolean,
    default: false
  },
  zoomConnectedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
