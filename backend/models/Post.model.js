const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  datePosted: { type: Date, required: true },
  platform: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['Posted', 'Scheduled', 'Draft'], default: 'Draft' },
  postLink: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
