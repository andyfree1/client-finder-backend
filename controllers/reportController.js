const Prospect = require('../models/Prospect');
const DataSource = require('../models/DataSource');
const Campaign = require('../models/Campaign');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get prospect counts
    const totalProspects = await Prospect.countDocuments();
    const qualifiedLeads = await Prospect.countDocuments({ score: { $gte: 80 } });
    const timeshareOwners = await Prospect.countDocuments({ timeshareOwner: true });
    const exitInterested = await Prospect.countDocuments({ timeshareOwner: true, exitInterest: true });
    
    // Get data source stats
    const dataSources = await DataSource.countDocuments();
    const activeDataSources = await DataSource.countDocuments({ status: 'Active' });
    
    // Get campaign stats
    const activeCampaigns = await Campaign.countDocuments({ status: 'Active' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'Completed' });
    
    // Get recent prospects
    const recentProspects = await Prospect.find()
      .sort({ dateAdded: -1 })
      .limit(5)
      .select('name email age location score source dateAdded');
    
    // Get age distribution
    const ageGroups = [
      { min: 50, max: 55 },
      { min: 56, max: 60 },
      { min: 61, max: 65 },
      { min: 66, max: 70 },
      { min: 71, max: 75 }
    ];
    
    const ageDistribution = [];
    
    for (const group of ageGroups) {
      const count = await Prospect.countDocuments({
        age: { $gte: group.min, $lte: group.max }
      });
      
      ageDistribution.push({
        range: `${group.min}-${group.max}`,
        count
      });
    }
    
    // Get location distribution
    const locationPipeline = [
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ];
    
    const locationDistribution = await Prospect.aggregate(locationPipeline);
    
    // Get score distribution
    const scoreGroups = [
      { min: 0, max: 20 },
      { min: 21, max: 40 },
      { min: 41, max: 60 },
      { min: 61, max: 80 },
      { min: 81, max: 100 }
    ];
    
    const scoreDistribution = [];
    
    for (const group of scoreGroups) {
      const count = await Prospect.countDocuments({
        score: { $gte: group.min, $lte: group.max }
      });
      
      scoreDistribution.push({
        range: `${group.min}-${group.max}`,
        count
      });
    }
    
    res.status(200).json({
      counts: {
        totalProspects,
        qualifiedLeads,
        timeshareOwners,
        exitInterested,
        dataSources,
        activeDataSources,
        activeCampaigns,
        completedCampaigns
      },
      recentProspects,
      distributions: {
        age: ageDistribution,
        location: locationDistribution,
        score: scoreDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching dashboard statistics',
      error: error.message 
    });
  }
};

// Get prospect statistics
exports.getProspectStats = async (req, res) => {
  try {
    // Get total counts
    const totalProspects = await Prospect.countDocuments();
    const qualifiedLeads = await Prospect.countDocuments({ score: { $gte: 80 } });
    
    // Get demographic breakdown
    const marriedCount = await Prospect.countDocuments({ maritalStatus: 'Married' });
    const singleCount = await Prospect.countDocuments({ maritalStatus: 'Single' });
    const divorcedCount = await Prospect.countDocuments({ maritalStatus: 'Divorced' });
    const widowedCount = await Prospect.countDocuments({ maritalStatus: 'Widowed' });
    
    // Get income breakdown
    const incomePipeline = [
      {
        $group: {
          _id: '$income',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];
    
    const incomeDistribution = await Prospect.aggregate(incomePipeline);
    
    // Get travel interest breakdown
    const highInterestCount = await Prospect.countDocuments({ travelInterest: 'High' });
    const mediumInterestCount = await Prospect.countDocuments({ travelInterest: 'Medium' });
    const lowInterestCount = await Prospect.countDocuments({ travelInterest: 'Low' });
    
    // Get timeshare breakdown
    const timeshareOwners = await Prospect.countDocuments({ timeshareOwner: true });
    const exitInterested = await Prospect.countDocuments({ timeshareOwner: true, exitInterest: true });
    
    // Get timeshare company breakdown
    const companyPipeline = [
      {
        $match: { timeshareOwner: true }
      },
      {
        $group: {
          _id: '$timeshareCompany',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ];
    
    const companyDistribution = await Prospect.aggregate(companyPipeline);
    
    // Get source breakdown
    const sourcePipeline = [
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];
    
    const sourceDistribution = await Prospect.aggregate(sourcePipeline);
    
    res.status(200).json({
      counts: {
        totalProspects,
        qualifiedLeads,
        qualificationRate: (qualifiedLeads / totalProspects) * 100
      },
      demographics: {
        maritalStatus: {
          married: marriedCount,
          single: singleCount,
          divorced: divorcedCount,
          widowed: widowedCount
        },
        income: incomeDistribution,
        travelInterest: {
          high: highInterestCount,
          medium: mediumInterestCount,
          low: lowInterestCount
        },
        timeshare: {
          owners: timeshareOwners,
          exitInterested,
          exitRate: (exitInterested / timeshareOwners) * 100,
          companies: companyDistribution
        }
      },
      sources: sourceDistribution
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching prospect statistics',
      error: error.message 
    });
  }
};

// Get campaign statistics
exports.getCampaignStats = async (req, res) => {
  try {
    // Get campaign counts
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'Active' });
    const completedCampaigns = await Campaign.countDocuments({ status: 'Completed' });
    const draftCampaigns = await Campaign.countDocuments({ status: 'Draft' });
    
    // Get campaign type breakdown
    const emailCampaigns = await Campaign.countDocuments({ type: 'Email' });
    const smsCampaigns = await Campaign.countDocuments({ type: 'SMS' });
    const callCampaigns = await Campaign.countDocuments({ type: 'Call' });
    const multiChannelCampaigns = await Campaign.countDocuments({ type: 'Multi-channel' });
    
    // Get audience breakdown
    const allProspectsCampaigns = await Campaign.countDocuments({ audience: 'All Prospects' });
    const qualifiedLeadsCampaigns = await Campaign.countDocuments({ audience: 'Qualified Leads' });
    const timeshareOwnersCampaigns = await Campaign.countDocuments({ audience: 'Timeshare Owners' });
    const customCampaigns = await Campaign.countDocuments({ audience: 'Custom' });
    
    // Get performance metrics for completed campaigns
    const completedCampaignsData = await Campaign.find({ status: 'Completed' });
    
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalResponded = 0;
    let totalConverted = 0;
    
    completedCampaignsData.forEach(campaign => {
      totalDelivered += campaign.statistics.delivered || 0;
      totalOpened += campaign.statistics.opened || 0;
      totalClicked += campaign.statistics.clicked || 0;
      totalResponded += campaign.statistics.responded || 0;
      totalConverted += campaign.statistics.converted || 0;
    });
    
    const avgDeliveryRate = totalDelivered > 0 ? 
      (totalDelivered / completedCampaignsData.reduce((sum, c) => sum + c.statistics.totalProspects, 0)) * 100 : 0;
    
    const avgOpenRate = totalDelivered > 0 ? 
      (totalOpened / totalDelivered) * 100 : 0;
    
    const avgClickRate = totalOpened > 0 ? 
      (totalClicked / totalOpened) * 100 : 0;
    
    const avgResponseRate = totalDelivered > 0 ? 
      (totalResponded / totalDelivered) * 100 : 0;
    
    const avgConversionRate = totalResponded > 0 ? 
      (totalConverted / totalResponded) * 100 : 0;
    
    // Get recent campaigns
    const recentCampaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name type audience status statistics createdAt');
    
    res.status(200).json({
      counts: {
        totalCampaigns,
        activeCampaigns,
        completedCampaigns,
        draftCampaigns
      },
      types: {
        email: emailCampaigns,
        sms: smsCampaigns,
        call: callCampaigns,
        multiChannel: multiChannelCampaigns
      },
      audiences: {
        allProspects: allProspectsCampaigns,
        qualifiedLeads: qualifiedLeadsCampaigns,
        timeshareOwners: timeshareOwnersCampaigns,
        custom: customCampaigns
      },
      performance: {
        avgDeliveryRate,
        avgOpenRate,
        avgClickRate,
        avgResponseRate,
        avgConversionRate,
        totalConverted
      },
      recentCampaigns
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching campaign statistics',
      error: error.message 
    });
  }
};

// Get data collection statistics
exports.getDataCollectionStats = async (req, res) => {
  try {
    // Get data source counts
    const totalDataSources = await DataSource.countDocuments();
    const activeDataSources = await DataSource.countDocuments({ status: 'Active' });
    const inactiveDataSources = await DataSource.countDocuments({ status: 'Inactive' });
    const errorDataSources = await DataSource.countDocuments({ status: 'Error' });
    
    // Get data source type breakdown
    const socialMediaSources = await DataSource.countDocuments({ type: 'Social Media API' });
    const webScrapingSources = await DataSource.countDocuments({ type: 'Web Scraping' });
    const manualImportSources = await DataSource.countDocuments({ type: 'Manual Import' });
    const otherSources = await DataSource.countDocuments({ type: 'Other' });
    
    // Get collection statistics
    const dataSources = await DataSource.find();
    
    let totalRuns = 0;
    let totalRecordsCollected = 0;
    let successRateSum = 0;
    
    dataSources.forEach(source => {
      totalRuns += source.statistics.totalRuns || 0;
      totalRecordsCollected += source.statistics.totalRecordsCollected || 0;
      successRateSum += source.statistics.successRate || 0;
    });
    
    const avgSuccessRate = dataSources.length > 0 ? 
      successRateSum / dataSources.length : 0;
    
    // Get source performance
    const sourcePerformance = await DataSource.find()
      .sort({ 'statistics.totalRecordsCollected': -1 })
      .limit(5)
      .select('name type statistics');
    
    // Get prospect source distribution
    const prospectSourcePipeline = [
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ];
    
    const prospectSourceDistribution = await Prospect.aggregate(prospectSourcePipeline);
    
    res.status(200).json({
      counts: {
        totalDataSources,
        activeDataSources,
        inactiveDataSources,
        errorDataSources
      },
      types: {
        socialMedia: socialMediaSources,
        webScraping: webScrapingSources,
        manualImport: manualImportSources,
        other: otherSources
      },
      performance: {
        totalRuns,
        totalRecordsCollected,
        avgSuccessRate,
        avgRecordsPerRun: totalRuns > 0 ? totalRecordsCollected / totalRuns : 0
      },
      topSources: sourcePerformance,
      prospectSources: prospectSourceDistribution
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching data collection statistics',
      error: error.message 
    });
  }
};
