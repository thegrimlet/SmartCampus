const router = require("express").Router();
const ClassAssignment = require("../models/ClassAssignment");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, async (req, res) => {
  try {
    const assignments = await ClassAssignment.find().sort({ className: 1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:className", auth, async (req, res) => {
  try {
    const assignment = await ClassAssignment.findOne({ className: req.params.className });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:className", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const className = req.params.className.trim();
    if (!className) {
      return res.status(400).json({ msg: "Class name is required" });
    }

    const assignment = await ClassAssignment.findOneAndUpdate(
      { className },
      {
        className,
        course: req.body.course,
        semester: req.body.semester,
        department: req.body.department,
        classTeacher: req.body.classTeacher,
        subjects: req.body.subjects || []
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:className", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const assignment = await ClassAssignment.findOneAndDelete({ className: req.params.className });
    if (!assignment) {
      return res.status(404).json({ msg: "Class assignment not found" });
    }

    res.json({ msg: "Class assignment deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
