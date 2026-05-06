const router = require("express").Router();
const Profile = require("../models/Profile");
const ClassAssignment = require("../models/ClassAssignment");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");
const { isValidEmail, isValidPhone } = require("../utils/validators");

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
    let profile = await Profile.findOne({ user: req.user.id })
      .populate("user", "name email role status");

    if (req.user.role === "student" && profile?.assignedClass) {
      const classAssignment = await ClassAssignment.findOne({
        className: profile.assignedClass,
        batch: profile.assignedBatch || "Morning"
      });
      if (classAssignment) {
        profile = {
          ...profile.toObject(),
          course: classAssignment.course,
          semester: classAssignment.semester,
          department: classAssignment.department,
          assignedBatch: classAssignment.batch,
          classTeacher: classAssignment.classTeacher,
          assignedSubjects: classAssignment.subjects
        };
      }
    }

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

    const normalizedEmail = req.body.email?.trim().toLowerCase();
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ msg: "Enter a valid email address" });
    }
    if (!isValidPhone(req.body.phone)) {
      return res.status(400).json({ msg: "Enter a valid phone number" });
    }

    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ msg: "Email already exists" });
      }

      user.email = normalizedEmail;
      await user.save();
    }

    const profileUpdate = {
      phone: req.body.phone,
      address: req.body.address
    };

    if (req.user.role === "admin") {
      profileUpdate.rollNumber = req.body.rollNumber;
      profileUpdate.assignedClass = req.body.assignedClass;
      profileUpdate.assignedBatch = req.body.assignedBatch;

      if (user.role === "faculty") {
        profileUpdate.assignedSubjects = req.body.assignedSubjects || [];
      }
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.params.userId },
      profileUpdate,
      { returnDocument: "after", upsert: true, runValidators: true }
    ).populate("user", "name email role status");

    res.json(profile);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
