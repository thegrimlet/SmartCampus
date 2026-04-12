const router = require("express").Router();
const Timetable = require("../models/Timetable");
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.findOne({ _id: req.body.faculty, role: "faculty", status: "approved" });
    if (!faculty) {
      return res.status(404).json({ msg: "Approved faculty not found" });
    }

    const sameDay = await Timetable.find({ day: req.body.day });
    const conflict = sameDay.find((entry) => {
      const timeClash = overlaps(req.body.startTime, req.body.endTime, entry.startTime, entry.endTime);
      const facultyClash = entry.faculty.toString() === req.body.faculty;
      const classClash = entry.course === req.body.course && entry.semester === req.body.semester;
      const roomClash = req.body.room && entry.room === req.body.room;
      return timeClash && (facultyClash || classClash || roomClash);
    });

    if (conflict) {
      return res.status(400).json({ msg: "Timetable conflict detected" });
    }

    const entry = await Timetable.create(req.body);
    res.json(await entry.populate("faculty", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "faculty") {
      query.faculty = req.user.id;
    }

    if (req.user.role === "student") {
      const profile = await Profile.findOne({ user: req.user.id });
      query.course = profile?.course || "__none__";
      query.semester = profile?.semester || "__none__";
    }

    const entries = await Timetable.find(query)
      .populate("faculty", "name email")
      .sort({ day: 1, startTime: 1 });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const entry = await Timetable.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ msg: "Timetable entry not found" });
    }

    res.json({ msg: "Timetable entry deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
