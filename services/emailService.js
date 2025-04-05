const nodemailer = require('nodemailer');
const Prospect = require('../models/Prospect');
const User = require('../models/User');
const DataSource = require('../models/DataSource');
const Campaign = require('../models/Campaign');

// Configure email transporter
let transporter;

// Initialize email service
const initializeEmailService = async () => {
  try {
    // In production, you would use your actual SMTP settings
    // For development/testing, we'll use Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Email notification service initialized');
    return true;
  } catch (error) {
    console.error('Error initializing email service:', error);
    return false;
  }
};

// Send notification for new qualified lead
exports.sendQualifiedLeadNotification = async (prospect) => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }
    
    // Find admin users to notify
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return false;
    }
    
    const recipients = adminUsers.map(user => user.email).join(',');
    
    // Create email content
    const subject = `New Qualified Lead: ${prospect.name}`;
    
    const html = `
      <h2>New Qualified Lead Detected</h2>
      <p>A new prospect has been identified as a qualified lead with a score of ${prospect.score}.</p>
      
      <h3>Prospect Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${prospect.name}</li>
        <li><strong>Age:</strong> ${prospect.age}</li>
        <li><strong>Location:</strong> ${prospect.location}</li>
        <li><strong>Marital Status:</strong> ${prospect.maritalStatus}</li>
        <li><strong>Income:</strong> ${prospect.income}</li>
        <li><strong>Travel Interest:</strong> ${prospect.travelInterest}</li>
        <li><strong>Timeshare Owner:</strong> ${prospect.timeshareOwner ? 'Yes' : 'No'}</li>
        ${prospect.timeshareOwner ? `<li><strong>Timeshare Company:</strong> ${prospect.timeshareCompany}</li>` : ''}
        ${prospect.timeshareOwner ? `<li><strong>Exit Interest:</strong> ${prospect.exitInterest ? 'Yes' : 'No'}</li>` : ''}
        <li><strong>Source:</strong> ${prospect.source}</li>
        <li><strong>Date Added:</strong> ${new Date(prospect.dateAdded).toLocaleString()}</li>
      </ul>
      
      <p>Click <a href="${process.env.FRONTEND_URL}/prospects/${prospect._id}">here</a> to view the full profile.</p>
      
      <p>This is an automated notification from the Client Finder system.</p>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Client Finder" <notifications@clientfinder.com>',
      to: recipients,
      subject,
      html
    });
    
    console.log(`Qualified lead notification sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return true;
  } catch (error) {
    console.error('Error sending qualified lead notification:', error);
    return false;
  }
};

// Send notification for data collection completion
exports.sendDataCollectionNotification = async (dataSource, recordsCollected, qualifiedLeads) => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }
    
    // Find admin users and the creator of the data source
    const adminUsers = await User.find({ role: 'admin' });
    let recipients = adminUsers.map(user => user.email);
    
    if (dataSource.createdBy) {
      const creator = await User.findById(dataSource.createdBy);
      if (creator && !recipients.includes(creator.email)) {
        recipients.push(creator.email);
      }
    }
    
    if (recipients.length === 0) {
      console.log('No users found to notify');
      return false;
    }
    
    // Create email content
    const subject = `Data Collection Complete: ${dataSource.name}`;
    
    const html = `
      <h2>Data Collection Completed</h2>
      <p>The data collection process for <strong>${dataSource.name}</strong> has completed.</p>
      
      <h3>Results:</h3>
      <ul>
        <li><strong>Records Collected:</strong> ${recordsCollected}</li>
        <li><strong>Qualified Leads Found:</strong> ${qualifiedLeads}</li>
        <li><strong>Success Rate:</strong> ${dataSource.statistics.successRate.toFixed(2)}%</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      
      <p>Click <a href="${process.env.FRONTEND_URL}/data-collection/${dataSource._id}">here</a> to view the full details.</p>
      
      <p>This is an automated notification from the Client Finder system.</p>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Client Finder" <notifications@clientfinder.com>',
      to: recipients.join(','),
      subject,
      html
    });
    
    console.log(`Data collection notification sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return true;
  } catch (error) {
    console.error('Error sending data collection notification:', error);
    return false;
  }
};

// Send notification for campaign completion
exports.sendCampaignCompletionNotification = async (campaign) => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }
    
    // Find admin users and the creator of the campaign
    const adminUsers = await User.find({ role: 'admin' });
    let recipients = adminUsers.map(user => user.email);
    
    if (campaign.createdBy) {
      const creator = await User.findById(campaign.createdBy);
      if (creator && !recipients.includes(creator.email)) {
        recipients.push(creator.email);
      }
    }
    
    if (recipients.length === 0) {
      console.log('No users found to notify');
      return false;
    }
    
    // Calculate metrics
    const metrics = campaign.calculateMetrics();
    
    // Create email content
    const subject = `Campaign Completed: ${campaign.name}`;
    
    const html = `
      <h2>Campaign Completed</h2>
      <p>The campaign <strong>${campaign.name}</strong> has completed.</p>
      
      <h3>Results:</h3>
      <ul>
        <li><strong>Total Prospects:</strong> ${campaign.statistics.totalProspects}</li>
        <li><strong>Delivered:</strong> ${campaign.statistics.delivered} (${metrics.deliveryRate.toFixed(2)}%)</li>
        <li><strong>Opened:</strong> ${campaign.statistics.opened} (${metrics.openRate.toFixed(2)}%)</li>
        <li><strong>Clicked:</strong> ${campaign.statistics.clicked} (${metrics.clickRate.toFixed(2)}%)</li>
        <li><strong>Responded:</strong> ${campaign.statistics.responded} (${metrics.responseRate.toFixed(2)}%)</li>
        <li><strong>Converted:</strong> ${campaign.statistics.converted} (${metrics.conversionRate.toFixed(2)}%)</li>
      </ul>
      
      <p>Click <a href="${process.env.FRONTEND_URL}/campaigns/${campaign._id}">here</a> to view the full details.</p>
      
      <p>This is an automated notification from the Client Finder system.</p>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Client Finder" <notifications@clientfinder.com>',
      to: recipients.join(','),
      subject,
      html
    });
    
    console.log(`Campaign completion notification sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return true;
  } catch (error) {
    console.error('Error sending campaign completion notification:', error);
    return false;
  }
};

// Send weekly summary report
exports.sendWeeklySummaryReport = async () => {
  try {
    if (!transporter) {
      await initializeEmailService();
    }
    
    // Find admin users
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return false;
    }
    
    const recipients = adminUsers.map(user => user.email).join(',');
    
    // Get statistics for the past week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // New prospects in the past week
    const newProspects = await Prospect.countDocuments({
      dateAdded: { $gte: oneWeekAgo }
    });
    
    // New qualified leads in the past week
    const newQualifiedLeads = await Prospect.countDocuments({
      dateAdded: { $gte: oneWeekAgo },
      score: { $gte: 80 }
    });
    
    // Data collection runs in the past week
    const dataSourcesUpdated = await DataSource.countDocuments({
      'schedule.lastRun': { $gte: oneWeekAgo }
    });
    
    // Records collected in the past week
    const dataSources = await DataSource.find({
      'schedule.lastRun': { $gte: oneWeekAgo }
    });
    
    let recordsCollected = 0;
    dataSources.forEach(source => {
      recordsCollected += source.statistics.lastRunRecords || 0;
    });
    
    // Campaigns completed in the past week
    const campaignsCompleted = await Campaign.countDocuments({
      status: 'Completed',
      updatedAt: { $gte: oneWeekAgo }
    });
    
    // Conversions in the past week
    const campaigns = await Campaign.find({
      status: 'Completed',
      updatedAt: { $gte: oneWeekAgo }
    });
    
    let conversions = 0;
    campaigns.forEach(campaign => {
      conversions += campaign.statistics.converted || 0;
    });
    
    // Create email content
    const subject = `Weekly Summary Report: ${new Date().toLocaleDateString()}`;
    
    const html = `
      <h2>Weekly Summary Report</h2>
      <p>Here's a summary of activity in the Client Finder system for the past week.</p>
      
      <h3>Prospect Activity:</h3>
      <ul>
        <li><strong>New Prospects:</strong> ${newProspects}</li>
        <li><strong>New Qualified Leads:</strong> ${newQualifiedLeads}</li>
        <li><strong>Qualification Rate:</strong> ${newProspects > 0 ? ((newQualifiedLeads / newProspects) * 100).toFixed(2) : 0}%</li>
      </ul>
      
      <h3>Data Collection Activity:</h3>
      <ul>
        <li><strong>Data Sources Updated:</strong> ${dataSourcesUpdated}</li>
        <li><strong>Records Collected:</strong> ${recordsCollected}</li>
        <li><strong>Average Records per Source:</strong> ${dataSourcesUpdated > 0 ? (recordsCollected / dataSourcesUpdated).toFixed(2) : 0}</li>
      </ul>
      
      <h3>Campaign Activity:</h3>
      <ul>
        <li><strong>Campaigns Completed:</strong> ${campaignsCompleted}</li>
        <li><strong>Conversions:</strong> ${conversions}</li>
        <li><strong>Average Conversions per Campaign:</strong> ${campaignsCompleted > 0 ? (conversions / campaignsCompleted).toFixed(2) : 0}</li>
      </ul>
      
      <p>Click <a href="${process.env.FRONTEND_URL}/reports/dashboard">here</a> to view the full dashboard.</p>
      
      <p>This is an automated notification from the Client Finder system.</p>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: '"Client Finder" <notifications@clientfinder.com>',
      to: recipients,
      subject,
      html
    });
    
    console.log(`Weekly summary report sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return true;
  } catch (error) {
    console.error('Error sending weekly summary report:', error);
    return false;
  }
};

// Initialize email service when module is loaded
initializeEmailService().catch(console.error);
