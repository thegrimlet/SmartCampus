const router = require("express").Router();
const Timetable = require("../models/Timetable");
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const findConflict = async ({ day, startTime, endTime, faculty, course, semester, className, room, excludeId }) => {
  const sameDay = await Timetable.find({ day, _id: { $ne: excludeId } });

  return sameDay.find((entry) => {
    const timeClash = overlaps(startTime, endTime, entry.startTime, entry.endTime);
    const facultyClash = entry.faculty.toString() === faculty;
    const classClash = entry.course === course && entry.semester === semester && entry.className === className;
    const roomClash = room && entry.room === room;
    return timeClash && (facultyClash || classClash || roomClash);
  });
};

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.findOne({ _id: req.body.faculty, role: "faculty", status: "approved" });
    if (!faculty) {
      return res.status(404).json({ msg: "Approved faculty not found" });
    }

    const conflict = await findConflict(req.body);

    if (conflict) {
      return res.status(400).json({ msg: "Timetable conflict detected" });
    }

    const entry = await Timetable.create(req.body);
    res.json(await entry.populate("faculty", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/slot", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.findOne({ _id: req.body.faculty, role: "faculty", status: "approved" });
    if (!faculty) {
      return res.status(404).json({ msg: "Approved faculty not found" });
    }

    const existing = await Timetable.findOne({
      course: req.body.course,
      semester: req.body.semester,
      className: req.body.className,
      day: req.body.day,
      startTime: req.body.startTime,
      endTime: req.body.endTime
    });

    const conflict = await findConflict({
      ...req.body,
      excludeId: existing?._id
    });

    if (conflict) {
      return res.status(400).json({ msg: "Timetable conflict detected" });
    }

    const entry = await Timetable.findOneAndUpdate(
      {
        course: req.body.course,
        semester: req.body.semester,
        className: req.body.className,
        day: req.body.day,
        startTime: req.body.startTime,
        endTime: req.body.endTime
      },
      {
        course: req.body.course,
        semester: req.body.semester,
        className: req.body.className,
        classTeacher: req.body.classTeacher,
        subject: req.body.subject,
        faculty: req.body.faculty,
        day: req.body.day,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        room: req.body.room
      },
      { new: true, upsert: true, runValidators: true }
    ).populate("faculty", "name email");

    res.json(entry);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.query.course) query.course = req.query.course;
    if (req.query.semester) query.semester = req.query.semester;
    if (req.query.className) query.className = req.query.className;

    if (req.user.role === "faculty") {
      query.faculty = req.user.id;
    }

    if (req.user.role === "student") {
      const profile = await Profile.findOne({ user: req.user.id });
      query.course = profile?.course || "__none__";
      query.semester = profile?.semester || "__none__";
      query.className = profile?.assignedClass || "__none__";
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
