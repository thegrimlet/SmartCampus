const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

// GET ALL STUDENTS (ONLY APPROVED)
router.get("/students", auth, async (req, res) => {
  try {
    const students = await User.find({
      role: "student",
      status: "approved" // 🔥 important
    }).select("-password");

    res.json(students);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// GET PENDING USERS
router.get("/pending", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const users = await User.find({ status: "pending" }).select("-password");
  res.json(users);
});

// APPROVE USER
router.put("/approve/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  );

  res.json(user);
});

// REJECT USER
router.put("/reject/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  );

  res.json(user);
});

module.exports = router;