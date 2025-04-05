const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const emailService = require('../services/emailService');

// All routes require authentication and admin role
router.use(auth);
router.use(checkRole(['admin']));

// Send test email
router.post('/test', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }
    
    // Create test email
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    const info = await transporter.sendMail({
      from: '"Client Finder" <test@clientfinder.com>',
      to: recipient,
      subject: 'Test Email from Client Finder',
      html: '<h1>Test Email</h1><p>This is a test email from the Client Finder system.</p>'
    });
    
    res.status(200).json({
      message: 'Test email sent successfully',
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error sending test email',
      error: error.message 
    });
  }
});

// Send manual notification to qualified leads
router.post('/notify-qualified', async (req, res) => {
  try {
    const { message, minScore = 80 } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Notification message is required' });
    }
    
    // Find qualified leads
    const qualifiedLeads = await Prospect.find({ score: { $gte: minScore } });
    
    if (qualifiedLeads.length === 0) {
      return res.status(404).json({ message: 'No qualified leads found' });
    }
    
    // Send notification (in a real implementation, this would send actual emails)
    const result = {
      leadsNotified: qualifiedLeads.length,
      message: 'Notifications queued for sending'
    };
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error sending notifications',
      error: error.message 
    });
  }
});

// Send weekly summary report manually
router.post('/send-summary', async (req, res) => {
  try {
    const result = await emailService.sendWeeklySummaryReport();
    
    if (result) {
      res.status(200).json({ message: 'Weekly summary report sent successfully' });
    } else {
      res.status(500).json({ message: 'Error sending weekly summary report' });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error sending weekly summary report',
      error: error.message 
    });
  }
});

module.exports = router;
