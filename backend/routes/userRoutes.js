const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

router.get("/students", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const students = await User.find({
      role: "student",
      status: "approved"
    }).select("-password").sort({ name: 1 });

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
      status: "approved"
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

    const users = await User.find({ status: "approved" })
      .select("-password")
      .sort({ role: 1, name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/pending", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const users = await User.find({ status: "pending" }).select("-password").sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/approve/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/reject/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
