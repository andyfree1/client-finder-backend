const Prospect = require('../models/Prospect');

// Get all prospects with filtering
exports.getAllProspects = async (req, res) => {
  try {
    const { 
      name, 
      minAge, 
      maxAge, 
      maritalStatus, 
      location, 
      travelInterest,
      timeshareOwner,
      exitInterest,
      minScore,
      source,
      limit = 50,
      page = 1
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = parseInt(minAge);
      if (maxAge) filter.age.$lte = parseInt(maxAge);
    }
    
    if (maritalStatus) {
      filter.maritalStatus = maritalStatus;
    }
    
    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    
    if (travelInterest) {
      filter.travelInterest = travelInterest;
    }
    
    if (timeshareOwner !== undefined) {
      filter.timeshareOwner = timeshareOwner === 'true';
    }
    
    if (exitInterest !== undefined) {
      filter.exitInterest = exitInterest === 'true';
    }
    
    if (minScore) {
      filter.score = { $gte: parseInt(minScore) };
    }
    
    if (source) {
      filter.source = source;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const prospects = await Prospect.find(filter)
      .sort({ dateAdded: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Prospect.countDocuments(filter);
    
    res.status(200).json({
      prospects,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching prospects',
      error: error.message 
    });
  }
};

// Get qualified leads (prospects with score >= 80)
exports.getQualifiedLeads = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query with pagination
    const prospects = await Prospect.find({ score: { $gte: 80 } })
      .sort({ score: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const total = await Prospect.countDocuments({ score: { $gte: 80 } });
    
    res.status(200).json({
      prospects,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching qualified leads',
      error: error.message 
    });
  }
};

// Get prospect by ID
exports.getProspectById = async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    res.status(200).json({ prospect });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching prospect',
      error: error.message 
    });
  }
};

// Create new prospect
exports.createProspect = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      age,
      maritalStatus,
      spouseInfo,
      income,
      location,
      travelInterest,
      travelFrequency,
      destinations,
      timeshareOwner,
      timeshareCompany,
      exitInterest,
      source
    } = req.body;
    
    // Check if prospect with same email already exists
    const existingProspect = await Prospect.findOne({ email });
    
    if (existingProspect) {
      return res.status(400).json({ message: 'Prospect with this email already exists' });
    }
    
    // Create new prospect
    const prospect = new Prospect({
      name,
      email,
      phone,
      age,
      maritalStatus,
      spouseInfo,
      income,
      location,
      travelInterest,
      travelFrequency,
      destinations,
      timeshareOwner,
      timeshareCompany,
      exitInterest,
      source,
      assignedTo: req.user._id
    });
    
    // Calculate lead score
    prospect.calculateScore();
    
    await prospect.save();
    
    res.status(201).json({
      message: 'Prospect created successfully',
      prospect
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating prospect',
      error: error.message 
    });
  }
};

// Update prospect
exports.updateProspect = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      age,
      maritalStatus,
      spouseInfo,
      income,
      location,
      travelInterest,
      travelFrequency,
      destinations,
      timeshareOwner,
      timeshareCompany,
      exitInterest
    } = req.body;
    
    // Find prospect
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    // Update fields
    if (name) prospect.name = name;
    if (email) prospect.email = email;
    if (phone) prospect.phone = phone;
    if (age) prospect.age = age;
    if (maritalStatus) prospect.maritalStatus = maritalStatus;
    if (spouseInfo) prospect.spouseInfo = spouseInfo;
    if (income) prospect.income = income;
    if (location) prospect.location = location;
    if (travelInterest) prospect.travelInterest = travelInterest;
    if (travelFrequency) prospect.travelFrequency = travelFrequency;
    if (destinations) prospect.destinations = destinations;
    if (timeshareOwner !== undefined) prospect.timeshareOwner = timeshareOwner;
    if (timeshareCompany) prospect.timeshareCompany = timeshareCompany;
    if (exitInterest !== undefined) prospect.exitInterest = exitInterest;
    
    // Recalculate lead score
    prospect.calculateScore();
    
    // Update timestamp
    prospect.lastUpdated = Date.now();
    
    await prospect.save();
    
    res.status(200).json({
      message: 'Prospect updated successfully',
      prospect
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating prospect',
      error: error.message 
    });
  }
};

// Delete prospect
exports.deleteProspect = async (req, res) => {
  try {
    const prospect = await Prospect.findByIdAndDelete(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    res.status(200).json({ message: 'Prospect deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting prospect',
      error: error.message 
    });
  }
};

// Add note to prospect
exports.addNote = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Note text is required' });
    }
    
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    // Add note
    prospect.notes.push({
      text,
      addedBy: req.user._id
    });
    
    // Update timestamp
    prospect.lastUpdated = Date.now();
    
    await prospect.save();
    
    res.status(200).json({
      message: 'Note added successfully',
      note: prospect.notes[prospect.notes.length - 1]
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding note',
      error: error.message 
    });
  }
};

// Add interaction to prospect
exports.addInteraction = async (req, res) => {
  try {
    const { type, notes, outcome } = req.body;
    
    if (!type) {
      return res.status(400).json({ message: 'Interaction type is required' });
    }
    
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    // Add interaction
    prospect.interactions.push({
      type,
      notes,
      outcome,
      conductedBy: req.user._id
    });
    
    // Update timestamp
    prospect.lastUpdated = Date.now();
    
    await prospect.save();
    
    res.status(200).json({
      message: 'Interaction added successfully',
      interaction: prospect.interactions[prospect.interactions.length - 1]
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding interaction',
      error: error.message 
    });
  }
};

// Assign prospect to agent
exports.assignProspect = async (req, res) => {
  try {
    const { agentId } = req.body;
    
    const prospect = await Prospect.findById(req.params.id);
    
    if (!prospect) {
      return res.status(404).json({ message: 'Prospect not found' });
    }
    
    // Update assigned agent
    prospect.assignedTo = agentId;
    
    // Update timestamp
    prospect.lastUpdated = Date.now();
    
    await prospect.save();
    
    res.status(200).json({
      message: 'Prospect assigned successfully',
      prospect
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error assigning prospect',
      error: error.message 
    });
  }
};
