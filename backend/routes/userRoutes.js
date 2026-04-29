const router = require("express").Router();
const User = require("../models/User");
const Profile = require("../models/Profile");
const auth = require("../middleware/authMiddleware");

router.get("/students", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const query = {
      role: "student",
      emailVerified: true
    };

    if (req.query.className) {
      const profiles = await Profile.find({ assignedClass: req.query.className }).select("user");
      query._id = { $in: profiles.map((profile) => profile.user) };
    }

    const students = await User.find(query).select("-password").sort({ name: 1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/faculty", auth, async (req, res) => {
  try {
    if (!["admin", "student"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.find({
      role: "faculty",
      emailVerified: true
    }).select("-password").sort({ name: 1 });

    res.json(faculty);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/approved", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const users = await User.find({ emailVerified: true })
      .select("-password")
      .sort({ role: 1, name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
