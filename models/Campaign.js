const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  type: {
    type: String,
    enum: ['Email', 'SMS', 'Call', 'Multi-channel'],
    required: true
  },
  audience: {
    type: String,
    enum: ['All Prospects', 'Qualified Leads', 'Timeshare Owners', 'Custom'],
    required: true
  },
  audienceCriteria: {
    minAge: Number,
    maxAge: Number,
    maritalStatus: String,
    minIncome: String,
    locations: [String],
    travelInterest: String,
    timeshareOwner: Boolean,
    exitInterest: Boolean,
    minScore: Number
  },
  content: {
    emailSubject: String,
    emailBody: String,
    smsText: String,
    callScript: String,
    attachments: [String]
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    sendTime: String,
    timezone: String
  },
  statistics: {
    totalProspects: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    responded: {
      type: Number,
      default: 0
    },
    converted: {
      type: Number,
      default: 0
    }
  },
  prospects: [{
    type: Schema.Types.ObjectId,
    ref: 'Prospect'
  }],
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
CampaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate campaign metrics
CampaignSchema.methods.calculateMetrics = function() {
  const stats = this.statistics;
  
  // Calculate rates
  const deliveryRate = stats.totalProspects > 0 ? (stats.delivered / stats.totalProspects) * 100 : 0;
  const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered) * 100 : 0;
  const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened) * 100 : 0;
  const responseRate = stats.delivered > 0 ? (stats.responded / stats.delivered) * 100 : 0;
  const conversionRate = stats.responded > 0 ? (stats.converted / stats.responded) * 100 : 0;
  
  return {
    deliveryRate,
    openRate,
    clickRate,
    responseRate,
    conversionRate
  };
};

const Campaign = mongoose.model('Campaign', CampaignSchema);

module.exports = Campaign;
