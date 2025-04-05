const Campaign = require('../models/Campaign');
const Prospect = require('../models/Prospect');
const nodemailer = require('nodemailer');

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find();
    
    res.status(200).json({ campaigns });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching campaigns',
      error: error.message 
    });
  }
};

// Get campaign by ID
exports.getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('prospects', 'name email phone age location score');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.status(200).json({ campaign });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching campaign',
      error: error.message 
    });
  }
};

// Create new campaign
exports.createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      audience,
      audienceCriteria,
      content,
      schedule
    } = req.body;
    
    // Create new campaign
    const campaign = new Campaign({
      name,
      description,
      type,
      audience,
      audienceCriteria,
      content,
      schedule,
      createdBy: req.user._id
    });
    
    // Find prospects matching audience criteria
    let prospectQuery = {};
    
    if (audience === 'Qualified Leads') {
      prospectQuery.score = { $gte: 80 };
    } else if (audience === 'Timeshare Owners') {
      prospectQuery.timeshareOwner = true;
    } else if (audience === 'Custom' && audienceCriteria) {
      if (audienceCriteria.minAge || audienceCriteria.maxAge) {
        prospectQuery.age = {};
        if (audienceCriteria.minAge) prospectQuery.age.$gte = audienceCriteria.minAge;
        if (audienceCriteria.maxAge) prospectQuery.age.$lte = audienceCriteria.maxAge;
      }
      
      if (audienceCriteria.maritalStatus) {
        prospectQuery.maritalStatus = audienceCriteria.maritalStatus;
      }
      
      if (audienceCriteria.locations && audienceCriteria.locations.length > 0) {
        prospectQuery.location = { $in: audienceCriteria.locations };
      }
      
      if (audienceCriteria.travelInterest) {
        prospectQuery.travelInterest = audienceCriteria.travelInterest;
      }
      
      if (audienceCriteria.timeshareOwner !== undefined) {
        prospectQuery.timeshareOwner = audienceCriteria.timeshareOwner;
      }
      
      if (audienceCriteria.exitInterest !== undefined) {
        prospectQuery.exitInterest = audienceCriteria.exitInterest;
      }
      
      if (audienceCriteria.minScore) {
        prospectQuery.score = { $gte: audienceCriteria.minScore };
      }
    }
    
    const prospects = await Prospect.find(prospectQuery).select('_id');
    campaign.prospects = prospects.map(p => p._id);
    campaign.statistics.totalProspects = prospects.length;
    
    await campaign.save();
    
    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating campaign',
      error: error.message 
    });
  }
};

// Update campaign
exports.updateCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      status,
      type,
      audience,
      audienceCriteria,
      content,
      schedule
    } = req.body;
    
    // Find campaign
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if campaign can be updated
    if (campaign.status === 'Completed' || campaign.status === 'Cancelled') {
      return res.status(400).json({ 
        message: 'Cannot update a completed or cancelled campaign' 
      });
    }
    
    // Update fields
    if (name) campaign.name = name;
    if (description) campaign.description = description;
    if (status) campaign.status = status;
    if (type) campaign.type = type;
    
    // Update audience and recalculate prospects if needed
    let updateProspects = false;
    
    if (audience && audience !== campaign.audience) {
      campaign.audience = audience;
      updateProspects = true;
    }
    
    if (audienceCriteria && JSON.stringify(audienceCriteria) !== JSON.stringify(campaign.audienceCriteria)) {
      campaign.audienceCriteria = audienceCriteria;
      updateProspects = true;
    }
    
    if (updateProspects) {
      // Find prospects matching new audience criteria
      let prospectQuery = {};
      
      if (campaign.audience === 'Qualified Leads') {
        prospectQuery.score = { $gte: 80 };
      } else if (campaign.audience === 'Timeshare Owners') {
        prospectQuery.timeshareOwner = true;
      } else if (campaign.audience === 'Custom' && campaign.audienceCriteria) {
        if (campaign.audienceCriteria.minAge || campaign.audienceCriteria.maxAge) {
          prospectQuery.age = {};
          if (campaign.audienceCriteria.minAge) prospectQuery.age.$gte = campaign.audienceCriteria.minAge;
          if (campaign.audienceCriteria.maxAge) prospectQuery.age.$lte = campaign.audienceCriteria.maxAge;
        }
        
        if (campaign.audienceCriteria.maritalStatus) {
          prospectQuery.maritalStatus = campaign.audienceCriteria.maritalStatus;
        }
        
        if (campaign.audienceCriteria.locations && campaign.audienceCriteria.locations.length > 0) {
          prospectQuery.location = { $in: campaign.audienceCriteria.locations };
        }
        
        if (campaign.audienceCriteria.travelInterest) {
          prospectQuery.travelInterest = campaign.audienceCriteria.travelInterest;
        }
        
        if (campaign.audienceCriteria.timeshareOwner !== undefined) {
          prospectQuery.timeshareOwner = campaign.audienceCriteria.timeshareOwner;
        }
        
        if (campaign.audienceCriteria.exitInterest !== undefined) {
          prospectQuery.exitInterest = campaign.audienceCriteria.exitInterest;
        }
        
        if (campaign.audienceCriteria.minScore) {
          prospectQuery.score = { $gte: campaign.audienceCriteria.minScore };
        }
      }
      
      const prospects = await Prospect.find(prospectQuery).select('_id');
      campaign.prospects = prospects.map(p => p._id);
      campaign.statistics.totalProspects = prospects.length;
    }
    
    if (content) campaign.content = content;
    if (schedule) campaign.schedule = schedule;
    
    await campaign.save();
    
    res.status(200).json({
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating campaign',
      error: error.message 
    });
  }
};

// Delete campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if campaign can be deleted
    if (campaign.status === 'Active') {
      return res.status(400).json({ 
        message: 'Cannot delete an active campaign. Cancel it first.' 
      });
    }
    
    await Campaign.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting campaign',
      error: error.message 
    });
  }
};

// Launch campaign
exports.launchCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('prospects', 'name email phone');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if campaign can be launched
    if (campaign.status !== 'Draft' && campaign.status !== 'Scheduled') {
      return res.status(400).json({ 
        message: 'Only draft or scheduled campaigns can be launched' 
      });
    }
    
    // Update campaign status
    campaign.status = 'Active';
    await campaign.save();
    
    // Start campaign in background
    res.status(202).json({ 
      message: 'Campaign launched successfully',
      campaign
    });
    
    // Process campaign in background
    processCampaign(campaign).catch(error => {
      console.error('Error processing campaign:', error);
    });
    
  } catch (error) {
    res.status(500).json({ 
      message: 'Error launching campaign',
      error: error.message 
    });
  }
};

// Cancel campaign
exports.cancelCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if campaign can be cancelled
    if (campaign.status === 'Completed' || campaign.status === 'Cancelled') {
      return res.status(400).json({ 
        message: 'Campaign is already completed or cancelled' 
      });
    }
    
    // Update campaign status
    campaign.status = 'Cancelled';
    await campaign.save();
    
    res.status(200).json({ 
      message: 'Campaign cancelled successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error cancelling campaign',
      error: error.message 
    });
  }
};

// Helper function to process campaign
async function processCampaign(campaign) {
  // This would be implemented with actual email sending, SMS, etc.
  // For demonstration, we'll simulate processing
  
  console.log(`Processing campaign: ${campaign.name}`);
  
  // Simulate delivery
  const deliveredCount = Math.floor(campaign.statistics.totalProspects * 0.95); // 95% delivery rate
  campaign.statistics.delivered = deliveredCount;
  
  // Simulate opens
  const openedCount = Math.floor(deliveredCount * 0.4); // 40% open rate
  campaign.statistics.opened = openedCount;
  
  // Simulate clicks
  const clickedCount = Math.floor(openedCount * 0.2); // 20% click rate
  campaign.statistics.clicked = clickedCount;
  
  // Simulate responses
  const respondedCount = Math.floor(clickedCount * 0.3); // 30% response rate
  campaign.statistics.responded = respondedCount;
  
  // Simulate conversions
  const convertedCount = Math.floor(respondedCount * 0.1); // 10% conversion rate
  campaign.statistics.converted = convertedCount;
  
  // Update campaign status
  campaign.status = 'Completed';
  await campaign.save();
  
  console.log(`Campaign ${campaign.name} completed with ${convertedCount} conversions`);
  
  return campaign;
}

// In a real implementation, this would use nodemailer to send actual emails
async function sendCampaignEmail(prospect, campaign) {
  // Create test account for demonstration
  const testAccount = await nodemailer.createTestAccount();
  
  // Create reusable transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
  
  // Personalize email content
  const personalizedSubject = campaign.content.emailSubject
    .replace('{{name}}', prospect.name)
    .replace('{{location}}', prospect.location);
  
  const personalizedBody = campaign.content.emailBody
    .replace('{{name}}', prospect.name)
    .replace('{{location}}', prospect.location);
  
  // Send email
  const info = await transporter.sendMail({
    from: '"Client Finder" <noreply@clientfinder.com>',
    to: prospect.email,
    subject: personalizedSubject,
    html: personalizedBody
  });
  
  console.log(`Message sent: ${info.messageId}`);
  console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  
  return info;
}
