const DataSource = require('../models/DataSource');
const Prospect = require('../models/Prospect');
const axios = require('axios');
const puppeteer = require('puppeteer');

// Get all data sources
exports.getAllDataSources = async (req, res) => {
  try {
    const dataSources = await DataSource.find();
    
    res.status(200).json({ dataSources });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching data sources',
      error: error.message 
    });
  }
};

// Get data source by ID
exports.getDataSourceById = async (req, res) => {
  try {
    const dataSource = await DataSource.findById(req.params.id);
    
    if (!dataSource) {
      return res.status(404).json({ message: 'Data source not found' });
    }
    
    res.status(200).json({ dataSource });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching data source',
      error: error.message 
    });
  }
};

// Create new data source
exports.createDataSource = async (req, res) => {
  try {
    const {
      name,
      type,
      configuration,
      schedule
    } = req.body;
    
    // Check if data source with same name already exists
    const existingDataSource = await DataSource.findOne({ name });
    
    if (existingDataSource) {
      return res.status(400).json({ message: 'Data source with this name already exists' });
    }
    
    // Create new data source
    const dataSource = new DataSource({
      name,
      type,
      configuration,
      schedule,
      createdBy: req.user._id
    });
    
    // Calculate next run date based on frequency
    if (schedule && schedule.frequency) {
      const nextRun = new Date();
      switch (schedule.frequency) {
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
      dataSource.schedule.nextRun = nextRun;
    }
    
    await dataSource.save();
    
    res.status(201).json({
      message: 'Data source created successfully',
      dataSource
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating data source',
      error: error.message 
    });
  }
};

// Update data source
exports.updateDataSource = async (req, res) => {
  try {
    const {
      name,
      type,
      status,
      configuration,
      schedule
    } = req.body;
    
    // Find data source
    const dataSource = await DataSource.findById(req.params.id);
    
    if (!dataSource) {
      return res.status(404).json({ message: 'Data source not found' });
    }
    
    // Update fields
    if (name) dataSource.name = name;
    if (type) dataSource.type = type;
    if (status) dataSource.status = status;
    if (configuration) dataSource.configuration = configuration;
    if (schedule) {
      dataSource.schedule = {
        ...dataSource.schedule,
        ...schedule
      };
      
      // Recalculate next run date if frequency changed
      if (schedule.frequency) {
        const nextRun = new Date();
        switch (schedule.frequency) {
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
        dataSource.schedule.nextRun = nextRun;
      }
    }
    
    await dataSource.save();
    
    res.status(200).json({
      message: 'Data source updated successfully',
      dataSource
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating data source',
      error: error.message 
    });
  }
};

// Delete data source
exports.deleteDataSource = async (req, res) => {
  try {
    const dataSource = await DataSource.findByIdAndDelete(req.params.id);
    
    if (!dataSource) {
      return res.status(404).json({ message: 'Data source not found' });
    }
    
    res.status(200).json({ message: 'Data source deleted successfully' });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting data source',
      error: error.message 
    });
  }
};

// Run data collection for a specific source
exports.runDataCollection = async (req, res) => {
  try {
    const dataSource = await DataSource.findById(req.params.id);
    
    if (!dataSource) {
      return res.status(404).json({ message: 'Data source not found' });
    }
    
    // Start data collection process
    res.status(202).json({ 
      message: 'Data collection started',
      dataSource
    });
    
    // Run data collection in background
    let collectionResult;
    let success = true;
    let recordsCollected = 0;
    
    try {
      switch (dataSource.type) {
        case 'Social Media API':
          collectionResult = await collectFromSocialMedia(dataSource);
          break;
        case 'Web Scraping':
          collectionResult = await collectFromWebScraping(dataSource);
          break;
        default:
          throw new Error('Unsupported data source type');
      }
      
      recordsCollected = collectionResult.recordsCollected;
    } catch (error) {
      console.error('Data collection error:', error);
      success = false;
      dataSource.status = 'Error';
    }
    
    // Update data source statistics
    await dataSource.updateAfterRun(recordsCollected, success);
    
  } catch (error) {
    console.error('Error running data collection:', error);
    // Error already sent to client, this is just for logging
  }
};

// Run data collection for all active sources
exports.runAllDataCollections = async (req, res) => {
  try {
    const dataSources = await DataSource.find({ status: 'Active' });
    
    if (dataSources.length === 0) {
      return res.status(404).json({ message: 'No active data sources found' });
    }
    
    // Start data collection process
    res.status(202).json({ 
      message: 'Data collection started for all active sources',
      count: dataSources.length
    });
    
    // Run data collection in background for each source
    for (const dataSource of dataSources) {
      let collectionResult;
      let success = true;
      let recordsCollected = 0;
      
      try {
        switch (dataSource.type) {
          case 'Social Media API':
            collectionResult = await collectFromSocialMedia(dataSource);
            break;
          case 'Web Scraping':
            collectionResult = await collectFromWebScraping(dataSource);
            break;
          default:
            throw new Error('Unsupported data source type');
        }
        
        recordsCollected = collectionResult.recordsCollected;
      } catch (error) {
        console.error(`Data collection error for ${dataSource.name}:`, error);
        success = false;
        dataSource.status = 'Error';
      }
      
      // Update data source statistics
      await dataSource.updateAfterRun(recordsCollected, success);
    }
    
  } catch (error) {
    console.error('Error running data collections:', error);
    // Error already sent to client, this is just for logging
  }
};

// Helper function to collect data from social media APIs
async function collectFromSocialMedia(dataSource) {
  // Implementation would depend on the specific API
  // This is a simplified example
  
  const { apiKey, apiSecret, accessToken, baseUrl, queryParameters } = dataSource.configuration;
  
  if (!apiKey || !baseUrl) {
    throw new Error('Missing required configuration for social media API');
  }
  
  // Simulate API call
  console.log(`Collecting data from ${dataSource.name} (${baseUrl})`);
  
  // In a real implementation, this would make actual API calls
  // For demonstration, we'll create sample prospects
  
  const sampleProspects = [];
  const recordCount = Math.floor(Math.random() * 5) + 1; // 1-5 records
  
  for (let i = 0; i < recordCount; i++) {
    const age = Math.floor(Math.random() * 26) + 50; // 50-75
    const isMarried = Math.random() > 0.3; // 70% married
    const hasHighIncome = Math.random() > 0.4; // 60% high income
    const travelInterest = Math.random() > 0.5 ? 'High' : 'Medium';
    const isTimeshareOwner = Math.random() > 0.6; // 40% timeshare owners
    const wantsToExit = isTimeshareOwner && Math.random() > 0.5; // 50% of owners want to exit
    
    const prospect = new Prospect({
      name: `Sample ${dataSource.name} User ${Date.now()}-${i}`,
      email: `sample${Date.now()}${i}@example.com`,
      phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      age,
      maritalStatus: isMarried ? 'Married' : 'Single',
      spouseInfo: isMarried ? {
        name: 'Spouse Name',
        age: age - Math.floor(Math.random() * 5)
      } : null,
      income: hasHighIncome ? '$150,000+' : '$75,000-$100,000',
      location: ['Florida', 'Arizona', 'California', 'Texas', 'New York'][Math.floor(Math.random() * 5)],
      travelInterest,
      travelFrequency: Math.random() > 0.5 ? 'Frequent' : 'Occasional',
      destinations: ['Europe', 'Caribbean', 'Asia', 'South America'].slice(0, Math.floor(Math.random() * 4) + 1),
      timeshareOwner: isTimeshareOwner,
      timeshareCompany: isTimeshareOwner ? ['Wyndham', 'Hilton', 'Marriott', 'Diamond Resorts'][Math.floor(Math.random() * 4)] : null,
      exitInterest: wantsToExit,
      source: dataSource.name
    });
    
    // Calculate lead score
    prospect.calculateScore();
    
    await prospect.save();
    sampleProspects.push(prospect);
  }
  
  return {
    recordsCollected: sampleProspects.length,
    prospects: sampleProspects
  };
}

// Helper function to collect data from web scraping
async function collectFromWebScraping(dataSource) {
  // Implementation would depend on the specific website
  // This is a simplified example
  
  const { targetUrl, proxySettings } = dataSource.configuration;
  
  if (!targetUrl) {
    throw new Error('Missing required configuration for web scraping');
  }
  
  // Simulate web scraping
  console.log(`Scraping data from ${dataSource.name} (${targetUrl})`);
  
  // In a real implementation, this would use Puppeteer to scrape websites
  // For demonstration, we'll create sample prospects
  
  const sampleProspects = [];
  const recordCount = Math.floor(Math.random() * 3) + 1; // 1-3 records
  
  for (let i = 0; i < recordCount; i++) {
    const age = Math.floor(Math.random() * 26) + 50; // 50-75
    const isMarried = Math.random() > 0.3; // 70% married
    const hasHighIncome = Math.random() > 0.4; // 60% high income
    const travelInterest = Math.random() > 0.5 ? 'High' : 'Medium';
    const isTimeshareOwner = Math.random() > 0.4; // 60% timeshare owners
    const wantsToExit = isTimeshareOwner && Math.random() > 0.3; // 70% of owners want to exit
    
    const prospect = new Prospect({
      name: `Scraped ${dataSource.name} User ${Date.now()}-${i}`,
      email: `scraped${Date.now()}${i}@example.com`,
      phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      age,
      maritalStatus: isMarried ? 'Married' : 'Single',
      spouseInfo: isMarried ? {
        name: 'Spouse Name',
        age: age - Math.floor(Math.random() * 5)
      } : null,
      income: hasHighIncome ? '$150,000+' : '$75,000-$100,000',
      location: ['Florida', 'Arizona', 'California', 'Texas', 'New York'][Math.floor(Math.random() * 5)],
      travelInterest,
      travelFrequency: Math.random() > 0.5 ? 'Frequent' : 'Occasional',
      destinations: ['Europe', 'Caribbean', 'Asia', 'South America'].slice(0, Math.floor(Math.random() * 4) + 1),
      timeshareOwner: isTimeshareOwner,
      timeshareCompany: isTimeshareOwner ? ['Wyndham', 'Hilton', 'Marriott', 'Diamond Resorts'][Math.floor(Math.random() * 4)] : null,
      exitInterest: wantsToExit,
      source: dataSource.name
    });
    
    // Calculate lead score
    prospect.calculateScore();
    
    await prospect.save();
    sampleProspects.push(prospect);
  }
  
  return {
    recordsCollected: sampleProspects.length,
    prospects: sampleProspects
  };
}
