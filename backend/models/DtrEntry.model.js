const mongoose = require('mongoose');

const dtrEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  timeIn: {
    type: Date,
    required: true,
  },
  timeOut: {
    type: Date,
    default: null,
  },
  hoursWorked: {
    type: Number,
    default: 0,
  },
  accomplishment: {
    type: String,
    default: '',
  }
}, { timestamps: true });

module.exports = mongoose.model('DtrEntry', dtrEntrySchema);
