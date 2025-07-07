const Recruit = require('../models/Recruit.model');
const User = require('../models/User.model');

// Create a new recruit
exports.createRecruit = async (req, res) => {
  try {
    const recruit = new Recruit({
      ...req.body,
      assignedTo: req.user.userId
    });
    await recruit.save();
    res.status(201).json({ message: 'Recruit created', recruit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all recruits
exports.getAllRecruits = async (req, res) => {
  try {
    const recruits = await Recruit.find().populate('assignedTo', 'name role');
    res.status(200).json(recruits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recruits assigned to current user
exports.getMyRecruits = async (req, res) => {
  try {
    const recruits = await Recruit.find({ assignedTo: req.user.userId });
    res.status(200).json(recruits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update recruit
exports.updateRecruit = async (req, res) => {
  try {
    const updated = await Recruit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Recruit not found' });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete recruit
exports.deleteRecruit = async (req, res) => {
  try {
    const deleted = await Recruit.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Recruit not found' });
    res.status(200).json({ message: 'Recruit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getTeamRecruits = async (req, res) => {
  try {
    // Find users directly under this manager
    const team = await User.find({ supervisorId: req.user.userId }).select('_id');
    const teamIds = team.map(user => user._id);

    // Find all recruits assigned to that team
    const recruits = await Recruit.find({ assignedTo: { $in: teamIds } }).populate('assignedTo', 'name role');
    res.json(recruits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
