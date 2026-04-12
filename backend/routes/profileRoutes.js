const router = require("express").Router();
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const canManageProfile = (req, targetUserId) =>
  req.user.role === "admin" || req.user.id === targetUserId;

router.get("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const profiles = await Profile.find()
      .populate("user", "name email role status")
      .sort({ updatedAt: -1 });

    res.json(profiles);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id })
      .populate("user", "name email role status");

    res.json(profile);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/user/:userId", auth, async (req, res) => {
  try {
    if (!canManageProfile(req, req.params.userId)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const profile = await Profile.findOne({ user: req.params.userId })
      .populate("user", "name email role status");

    res.json(profile);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/user/:userId", auth, async (req, res) => {
  try {
    if (!canManageProfile(req, req.params.userId)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.params.userId },
      {
        course: req.body.course,
        semester: req.body.semester,
        department: req.body.department,
        rollNumber: req.body.rollNumber,
        employeeId: req.body.employeeId,
        phone: req.body.phone,
        address: req.body.address,
        assignedSubjects: req.body.assignedSubjects || [],
        assignedClasses: req.body.assignedClasses || []
      },
      { new: true, upsert: true, runValidators: true }
    ).populate("user", "name email role status");

    res.json(profile);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
