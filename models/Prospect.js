const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProspectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    required: true,
    min: 50,
    max: 75
  },
  maritalStatus: {
    type: String,
    enum: ['Married', 'Single', 'Divorced', 'Widowed'],
    required: true
  },
  spouseInfo: {
    name: String,
    age: Number
  },
  income: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  travelInterest: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  travelFrequency: {
    type: String,
    enum: ['Frequent', 'Occasional', 'Rare']
  },
  destinations: [String],
  timeshareOwner: {
    type: Boolean,
    default: false
  },
  timeshareCompany: String,
  exitInterest: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    required: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: [{
    text: String,
    date: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  interactions: [{
    type: {
      type: String,
      enum: ['Email', 'Call', 'Meeting', 'Other'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    notes: String,
    outcome: String,
    conductedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  campaigns: [{
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  }],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Virtual for checking if prospect is qualified
ProspectSchema.virtual('isQualified').get(function() {
  return this.score >= 80;
});

// Pre-save middleware to update lastUpdated timestamp
ProspectSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

// Method to calculate lead score based on criteria
ProspectSchema.methods.calculateScore = function() {
  let score = 0;
  
  // Age criteria (50-75)
  if (this.age >= 50 && this.age <= 75) {
    score += 20;
  }
  
  // Marital status (married)
  if (this.maritalStatus === 'Married') {
    score += 20;
  }
  
  // Income criteria ($75K+)
  if (this.income.includes('$75,000') || 
      this.income.includes('$100,000') || 
      this.income.includes('$150,000')) {
    score += 20;
  }
  
  // Travel interest
  if (this.travelInterest === 'High') {
    score += 20;
  } else if (this.travelInterest === 'Medium') {
    score += 10;
  }
  
  // Timeshare owner with exit interest
  if (this.timeshareOwner && this.exitInterest) {
    score += 20;
  } else if (this.timeshareOwner) {
    score += 10;
  }
  
  this.score = score;
  return score;
};

const Prospect = mongoose.model('Prospect', ProspectSchema);

module.exports = Prospect;
