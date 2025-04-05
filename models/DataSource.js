const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DataSourceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Social Media API', 'Web Scraping', 'Manual Import', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Error', 'Pending'],
    default: 'Active'
  },
  configuration: {
    apiKey: String,
    apiSecret: String,
    accessToken: String,
    refreshToken: String,
    baseUrl: String,
    targetUrl: String,
    queryParameters: Schema.Types.Mixed,
    headers: Schema.Types.Mixed,
    proxySettings: Schema.Types.Mixed
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Custom'],
      default: 'Daily'
    },
    cronExpression: String,
    lastRun: Date,
    nextRun: Date
  },
  statistics: {
    totalRuns: {
      type: Number,
      default: 0
    },
    totalRecordsCollected: {
      type: Number,
      default: 0
    },
    lastRunRecords: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to update updatedAt timestamp
DataSourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update statistics after a run
DataSourceSchema.methods.updateAfterRun = function(recordsCollected, success) {
  this.statistics.totalRuns += 1;
  this.statistics.totalRecordsCollected += recordsCollected;
  this.statistics.lastRunRecords = recordsCollected;
  
  // Update success rate
  const successValue = success ? 100 : 0;
  this.statistics.successRate = ((this.statistics.successRate * (this.statistics.totalRuns - 1)) + successValue) / this.statistics.totalRuns;
  
  // Update schedule
  this.schedule.lastRun = new Date();
  
  // Calculate next run based on frequency
  if (this.schedule.cronExpression) {
    // Would use a cron parser library in a real implementation
    // For now, just add days based on frequency
    const nextRun = new Date();
    switch (this.schedule.frequency) {
      case 'Daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'Weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'Monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      default:
        nextRun.setDate(nextRun.getDate() + 1);
    }
    this.schedule.nextRun = nextRun;
  }
  
  return this.save();
};

const DataSource = mongoose.model('DataSource', DataSourceSchema);

module.exports = DataSource;
