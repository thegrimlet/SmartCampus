const router = require("express").Router();
const Subject = require("../models/Subject");
const auth = require("../middleware/authMiddleware");

// CREATE SUBJECT (ADMIN ONLY)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" });
  }

  const subject = await Subject.create(req.body);
  res.json(subject);
});

// GET ALL SUBJECTS
router.get("/", auth, async (req, res) => {
  const subjects = await Subject.find();
  res.json(subjects);
});

module.exports = router;