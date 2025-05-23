const Mentorship = require('../models/Mentorship');

// Create a new mentorship session
exports.createMentorship = async (req, res) => {
  try {
    const mentorship = new Mentorship(req.body);
    await mentorship.save();
    res.status(201).json(mentorship);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all mentorship sessions
exports.getMentorships = async (req, res) => {
  try {
    const mentorships = await Mentorship.find().sort({ date: 1 });
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 