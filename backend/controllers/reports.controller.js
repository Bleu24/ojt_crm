const User = require('../models/User.model');
const DtrEntry = require('../models/DtrEntry.model');
const Post = require('../models/Post.model');
const Recruit = require('../models/Recruit.model');
const { DateTime } = require('luxon');

// Get supervision statistics
exports.getSupervisionStats = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const supervisedUsers = await User.find({ 
      supervisorId: req.user.userId 
    });

    const totalSupervised = supervisedUsers.length;
    
    // Get today's date range
    const today = DateTime.now().setZone('Asia/Manila');
    const todayStart = today.startOf('day').toJSDate();
    const todayEnd = today.endOf('day').toJSDate();

    // Count users who are active today (have DTR entries)
    const activeToday = await DtrEntry.countDocuments({
      userId: { $in: supervisedUsers.map(u => u._id) },
      date: { $gte: todayStart, $lte: todayEnd }
    });

    // Get this week's date range
    const weekStart = today.startOf('week').toJSDate();
    const weekEnd = today.endOf('week').toJSDate();

    // Calculate average hours worked and total hours this week
    const weeklyEntries = await DtrEntry.find({
      userId: { $in: supervisedUsers.map(u => u._id) },
      date: { $gte: weekStart, $lte: weekEnd },
      timeOut: { $ne: null }
    });

    const totalHoursThisWeek = weeklyEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
    const avgHoursWorked = totalSupervised > 0 ? totalHoursThisWeek / totalSupervised : 0;

    res.json({
      totalSupervised,
      activeToday,
      avgHoursWorked,
      totalHoursThisWeek
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get team report
exports.getTeamReport = async (req, res) => {
  try {
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { period = 'week' } = req.query;
    
    const supervisedUsers = await User.find({ 
      supervisorId: req.user.userId 
    }).select('-passwordHash');

    if (supervisedUsers.length === 0) {
      return res.json({
        period,
        totalMembers: 0,
        totalHours: 0,
        totalPosts: 0,
        activeRecruits: 0,
        avgProductivity: 0,
        topPerformer: 'No team members',
        members: []
      });
    }

    // Calculate date range based on period
    const now = DateTime.now().setZone('Asia/Manila');
    let startDate, endDate;
    
    switch (period) {
      case 'month':
        startDate = now.startOf('month').toJSDate();
        endDate = now.endOf('month').toJSDate();
        break;
      case 'quarter':
        startDate = now.startOf('quarter').toJSDate();
        endDate = now.endOf('quarter').toJSDate();
        break;
      default: // week
        startDate = now.startOf('week').toJSDate();
        endDate = now.endOf('week').toJSDate();
        break;
    }

    // Get DTR entries for the period
    const dtrEntries = await DtrEntry.find({
      userId: { $in: supervisedUsers.map(u => u._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    // Get posts created by supervised users in the period
    const posts = await Post.find({
      createdBy: { $in: supervisedUsers.map(u => u._id) },
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Get recruits assigned to supervised users in the period
    const recruits = await Recruit.find({
      assignedTo: { $in: supervisedUsers.map(u => u._id) },
      createdAt: { $gte: startDate, $lte: endDate },
      applicationStatus: { $in: ['Applied', 'Interviewed', 'Pending'] } // Active recruits
    });

    const totalPosts = posts.length;
    const activeRecruits = recruits.length;

    // Calculate member statistics
    const memberStats = await Promise.all(supervisedUsers.map(async (user) => {
      const userEntries = dtrEntries.filter(entry => entry.userId.toString() === user._id.toString());
      const completedEntries = userEntries.filter(entry => entry.timeOut !== null);
      
      const totalHours = completedEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      const workingDays = completedEntries.length;
      const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;
      
      // Calculate attendance (simplified - based on working days vs expected days)
      const expectedDays = period === 'week' ? 5 : (period === 'month' ? 22 : 66); // rough estimates
      const attendance = Math.min(100, (workingDays / expectedDays) * 100);
      
      // Calculate productivity (simplified - based on hours worked vs expected hours)
      const expectedHours = expectedDays * 8; // 8 hours per day
      const productivity = Math.min(100, (totalHours / expectedHours) * 100);
      
      // Get last activity
      const lastEntry = userEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const lastActivity = lastEntry ? lastEntry.date : user.createdAt;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalHours,
        avgHoursPerDay,
        lastActivity,
        attendance: Math.round(attendance),
        productivity: Math.round(productivity)
      };
    }));

    // Calculate overall stats
    const totalHours = memberStats.reduce((sum, member) => sum + member.totalHours, 0);
    const avgProductivity = memberStats.length > 0 
      ? memberStats.reduce((sum, member) => sum + member.productivity, 0) / memberStats.length 
      : 0;
    
    // Find top performer
    const topPerformer = memberStats.reduce((top, member) => 
      member.productivity > top.productivity ? member : top
    , { productivity: 0, name: 'No data' });

    res.json({
      period,
      totalMembers: supervisedUsers.length,
      totalHours,
      totalPosts,
      activeRecruits,
      avgProductivity,
      topPerformer: topPerformer.name,
      members: memberStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get analytics data
exports.getAnalyticsData = async (req, res) => {
  try {
    console.log('Analytics API called by user:', req.user.userId, 'with role:', req.user.role);
    
    if (req.user.role !== 'unit_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { period = 'week' } = req.query;
    console.log('Analytics period requested:', period);
    
    const supervisedUsers = await User.find({ 
      supervisorId: req.user.userId 
    });

    console.log('Found supervised users:', supervisedUsers.length);

    if (supervisedUsers.length === 0) {
      return res.json({
        teamProductivity: [],
        weeklyHours: [],
        monthlyPosts: [],
        recruitmentStatus: [],
        memberPerformance: []
      });
    }

    // Calculate date range based on period
    const now = DateTime.now().setZone('Asia/Manila');
    let startDate, endDate;
    
    switch (period) {
      case 'month':
        startDate = now.startOf('month').toJSDate();
        endDate = now.endOf('month').toJSDate();
        break;
      case 'quarter':
        startDate = now.startOf('quarter').toJSDate();
        endDate = now.endOf('quarter').toJSDate();
        break;
      case 'year':
        startDate = now.startOf('year').toJSDate();
        endDate = now.endOf('year').toJSDate();
        break;
      default: // week
        startDate = now.startOf('week').toJSDate();
        endDate = now.endOf('week').toJSDate();
        break;
    }

    // Get DTR entries for productivity calculation
    const dtrEntries = await DtrEntry.find({
      userId: { $in: supervisedUsers.map(u => u._id) },
      date: { $gte: startDate, $lte: endDate },
      timeOut: { $ne: null }
    });

    // Calculate team productivity by day
    const productivityByDay = {};
    let currentDate = DateTime.fromJSDate(startDate);
    const endDateTime = DateTime.fromJSDate(endDate);
    
    // Safety check: limit the number of days to prevent infinite loops
    const maxDays = 400; // Maximum days to process (more than a year)
    let dayCount = 0;
    
    while (currentDate <= endDateTime && dayCount < maxDays) {
      const dayStart = currentDate.startOf('day').toJSDate();
      const dayEnd = currentDate.endOf('day').toJSDate();
      
      const dayEntries = dtrEntries.filter(entry => 
        entry.date >= dayStart && entry.date <= dayEnd
      );
      
      const totalHours = dayEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      const expectedHours = supervisedUsers.length * 8; // 8 hours per person
      const productivity = expectedHours > 0 ? Math.min(100, (totalHours / expectedHours) * 100) : 0;
      
      productivityByDay[currentDate.toISODate()] = Math.round(productivity);
      currentDate = currentDate.plus({ days: 1 });
      dayCount++;
    }

    // Get weekly hours data
    const weeklyHours = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = now.minus({ weeks: 3 - i }).startOf('week').toJSDate();
      const weekEnd = now.minus({ weeks: 3 - i }).endOf('week').toJSDate();
      
      const weekEntries = await DtrEntry.find({
        userId: { $in: supervisedUsers.map(u => u._id) },
        date: { $gte: weekStart, $lte: weekEnd },
        timeOut: { $ne: null }
      });
      
      const totalHours = weekEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      weeklyHours.push({
        week: `Week ${i + 1}`,
        hours: Math.round(totalHours)
      });
    }

    // Get monthly posts data
    const monthlyPosts = [];
    for (let i = 0; i < 4; i++) {
      const monthStart = now.minus({ months: 3 - i }).startOf('month').toJSDate();
      const monthEnd = now.minus({ months: 3 - i }).endOf('month').toJSDate();
      
      const monthPostCount = await Post.countDocuments({
        createdBy: { $in: supervisedUsers.map(u => u._id) },
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      monthlyPosts.push({
        month: now.minus({ months: 3 - i }).toFormat('MMM'),
        posts: monthPostCount
      });
    }

    // Get recruitment status data
    const recruitmentStatusData = await Promise.all([
      Recruit.countDocuments({
        assignedTo: { $in: supervisedUsers.map(u => u._id) },
        applicationStatus: 'Applied',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Recruit.countDocuments({
        assignedTo: { $in: supervisedUsers.map(u => u._id) },
        applicationStatus: 'Interviewed',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Recruit.countDocuments({
        assignedTo: { $in: supervisedUsers.map(u => u._id) },
        applicationStatus: 'Hired',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Recruit.countDocuments({
        assignedTo: { $in: supervisedUsers.map(u => u._id) },
        applicationStatus: 'Rejected',
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    const recruitmentStatus = [
      { status: 'Applied', count: recruitmentStatusData[0] },
      { status: 'Interviewed', count: recruitmentStatusData[1] },
      { status: 'Hired', count: recruitmentStatusData[2] },
      { status: 'Rejected', count: recruitmentStatusData[3] }
    ];

    // Get member performance data
    const memberPerformance = await Promise.all(supervisedUsers.map(async (user) => {
      const userEntries = dtrEntries.filter(entry => 
        entry.userId.toString() === user._id.toString()
      );
      const totalHours = userEntries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
      
      return {
        member: user.name,
        hours: Math.round(totalHours)
      };
    }));

    res.json({
      teamProductivity: Object.entries(productivityByDay).map(([date, productivity]) => ({
        date,
        productivity
      })),
      weeklyHours,
      monthlyPosts,
      recruitmentStatus,
      memberPerformance
    });
  } catch (err) {
    console.error('Error fetching analytics data:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getSupervisionStats: exports.getSupervisionStats,
  getTeamReport: exports.getTeamReport,
  getAnalyticsData: exports.getAnalyticsData
};
