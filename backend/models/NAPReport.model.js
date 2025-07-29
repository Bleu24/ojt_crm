const mongoose = require('mongoose');

// Schema for individual monthly data
const MonthlyDataSchema = new mongoose.Schema({
  cc: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sale: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lapsed: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, { _id: false });

// Main NAP Report Schema
const NAPReportSchema = new mongoose.Schema({
  // Agent Information
  agentName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  agentCode: {
    type: String,
    required: false,
    trim: true,
    index: true
  },
  
  // Report Period Information
  reportStartDate: {
    type: Date,
    required: true
  },
  reportEndDate: {
    type: Date,
    required: true
  },
  
  // Monthly performance data
  monthly: {
    JAN: { type: MonthlyDataSchema, default: null },
    FEB: { type: MonthlyDataSchema, default: null },
    MAR: { type: MonthlyDataSchema, default: null },
    APR: { type: MonthlyDataSchema, default: null },
    MAY: { type: MonthlyDataSchema, default: null },
    JUN: { type: MonthlyDataSchema, default: null },
    JUL: { type: MonthlyDataSchema, default: null },
    AUG: { type: MonthlyDataSchema, default: null },
    SEP: { type: MonthlyDataSchema, default: null },
    OCT: { type: MonthlyDataSchema, default: null },
    NOV: { type: MonthlyDataSchema, default: null },
    DEC: { type: MonthlyDataSchema, default: null }
  },
  
  // Aggregated totals (calculated fields)
  totals: {
    totalCC: {
      type: Number,
      default: 0
    },
    totalSale: {
      type: Number,
      default: 0
    },
    totalLapsed: {
      type: Number,
      default: 0
    },
    activeMonths: [{
      type: String,
      enum: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    }]
  },
  
  // File metadata
  sourceFile: {
    originalName: String,
    fileName: String,
    filePath: String,
    fileSize: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Processing metadata
  processingInfo: {
    parsedBy: {
      type: String,
      enum: ['gemini', 'regex', 'manual'],
      default: 'gemini'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    errors: [String],
    warnings: [String]
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
NAPReportSchema.index({ agentName: 1, reportStartDate: 1, reportEndDate: 1 });
NAPReportSchema.index({ agentCode: 1 });
NAPReportSchema.index({ 'sourceFile.uploadDate': -1 });
NAPReportSchema.index({ createdAt: -1 });

// Virtual for getting active months with data
NAPReportSchema.virtual('activeMonthsData').get(function() {
  const activeData = {};
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  months.forEach(month => {
    if (this.monthly[month] && (this.monthly[month].cc > 0 || this.monthly[month].lapsed > 0)) {
      activeData[month] = this.monthly[month];
    }
  });
  
  return activeData;
});

// Method to calculate totals
NAPReportSchema.methods.calculateTotals = function() {
  let totalCC = 0;
  let totalSale = 0;
  let totalLapsed = 0;
  const activeMonths = [];
  
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  months.forEach(month => {
    if (this.monthly[month]) {
      const monthData = this.monthly[month];
      if (monthData.cc > 0 || monthData.lapsed > 0) {
        totalCC += monthData.cc || 0;
        totalSale += monthData.sale || 0;
        totalLapsed += monthData.lapsed || 0;
        activeMonths.push(month);
      }
    }
  });
  
  this.totals = {
    totalCC: Math.round(totalCC),
    totalSale: Math.round(totalSale * 100) / 100,
    totalLapsed: Math.round(totalLapsed * 100) / 100,
    activeMonths: activeMonths
  };
  
  return this.totals;
};

// Method to add monthly data
NAPReportSchema.methods.addMonthlyData = function(month, data) {
  if (!['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(month)) {
    throw new Error('Invalid month code. Use 3-letter format: JAN, FEB, etc.');
  }
  
  this.monthly[month] = {
    cc: data.cc || 0,
    sale: Math.round((data.sale || 0) * 100) / 100,
    lapsed: Math.round((data.lapsed || 0) * 100) / 100
  };
  
  // Recalculate totals
  this.calculateTotals();
  
  return this.monthly[month];
};

// Method to get data for specific month
NAPReportSchema.methods.getMonthData = function(month) {
  if (!['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].includes(month)) {
    throw new Error('Invalid month code. Use 3-letter format: JAN, FEB, etc.');
  }
  
  return this.monthly[month] || null;
};

// Static method to find reports by date range
NAPReportSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    $or: [
      {
        reportStartDate: { $gte: startDate, $lte: endDate }
      },
      {
        reportEndDate: { $gte: startDate, $lte: endDate }
      },
      {
        reportStartDate: { $lte: startDate },
        reportEndDate: { $gte: endDate }
      }
    ]
  });
};

// Static method to find reports by agent
NAPReportSchema.statics.findByAgent = function(agentName, agentCode = null) {
  const query = { agentName: new RegExp(agentName, 'i') };
  if (agentCode) {
    query.agentCode = agentCode;
  }
  return this.find(query).sort({ reportStartDate: -1 });
};

// Static method to get aggregated data across all reports
NAPReportSchema.statics.getAggregatedData = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$agentName',
        agentCode: { $first: '$agentCode' },
        totalCC: { $sum: '$totals.totalCC' },
        totalSale: { $sum: '$totals.totalSale' },
        totalLapsed: { $sum: '$totals.totalLapsed' },
        reports: { $push: '$$ROOT' },
        reportCount: { $sum: 1 },
        lastUpdated: { $max: '$updatedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        agentName: '$_id',
        agentCode: 1,
        totalCC: 1,
        totalSale: { $round: ['$totalSale', 2] },
        totalLapsed: { $round: ['$totalLapsed', 2] },
        reportCount: 1,
        lastUpdated: 1,
        reports: 1
      }
    },
    { $sort: { totalSale: -1 } }
  ]);
};

// Pre-save middleware to calculate totals
NAPReportSchema.pre('save', function(next) {
  if (this.isModified('monthly')) {
    this.calculateTotals();
  }
  next();
});

// Pre-save middleware for validation
NAPReportSchema.pre('save', function(next) {
  // Validate date range
  if (this.reportStartDate >= this.reportEndDate) {
    return next(new Error('Report start date must be before end date'));
  }
  
  // Ensure at least one month has data
  const hasData = Object.values(this.monthly).some(month => 
    month && (month.cc > 0 || month.lapsed > 0)
  );
  
  if (!hasData) {
    return next(new Error('NAP report must have at least one month with activity'));
  }
  
  next();
});

module.exports = mongoose.model('NAPReport', NAPReportSchema);
