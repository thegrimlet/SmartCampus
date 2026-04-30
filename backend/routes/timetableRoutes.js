const router = require("express").Router();
const Timetable = require("../models/Timetable");
const Profile = require("../models/Profile");
const User = require("../models/User");
const ClassAssignment = require("../models/ClassAssignment");
const Course = require("../models/Course");
const auth = require("../middleware/authMiddleware");

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const resolveScopeFromClass = async (body) => {
  if (!body.course || !body.semester) {
    return null;
  }

  if (!body.className || !body.batch) {
    const course = await Course.findOne({ courseCode: body.course });
    if (!course) {
      return null;
    }

    return {
      ...body,
      className: body.className || "",
      batch: body.batch || "",
      classTeacher: body.classTeacher || ""
    };
  }

  const assignment = await ClassAssignment.findOne({
    className: body.className,
    batch: body.batch
  });

  if (!assignment) {
    return null;
  }

  return {
    ...body,
    course: assignment.course,
    semester: assignment.semester,
    classTeacher: assignment.classTeacher || body.classTeacher || ""
  };
};

const findConflict = async ({ day, startTime, endTime, faculty, course, semester, className, batch, room, excludeId }) => {
  const sameDay = await Timetable.find({ day, _id: { $ne: excludeId } });

  return sameDay.find((entry) => {
    const timeClash = overlaps(startTime, endTime, entry.startTime, entry.endTime);
    const facultyClash = entry.faculty.toString() === faculty;
    const classClash = className
      ? entry.className === className && entry.batch === batch
      : entry.course === course && entry.semester === semester && !entry.className;
    const roomClash = room && entry.room === room;
    return timeClash && (facultyClash || classClash || roomClash);
  });
};

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const faculty = await User.findOne({ _id: req.body.faculty, role: "faculty", emailVerified: true });
    if (!faculty) {
      return res.status(404).json({ msg: "Verified faculty not found" });
    }

    const resolved = await resolveScopeFromClass(req.body);
    if (!resolved) {
      return res.status(404).json({ msg: "Class assignment not found for this batch" });
    }

    const conflict = await findConflict(resolved);

    if (conflict) {
      return res.status(400).json({ msg: "Timetable conflict detected" });
    }

    const entry = await Timetable.create(resolved);
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

    const faculty = await User.findOne({ _id: req.body.faculty, role: "faculty", emailVerified: true });
    if (!faculty) {
      return res.status(404).json({ msg: "Verified faculty not found" });
    }

    const resolved = await resolveScopeFromClass(req.body);
    if (!resolved) {
      return res.status(404).json({ msg: "Class assignment not found for this batch" });
    }

    const existing = await Timetable.findOne({
      course: resolved.course,
      semester: resolved.semester,
      className: resolved.className || "",
      batch: resolved.batch || "",
      day: resolved.day,
      startTime: resolved.startTime,
      endTime: resolved.endTime
    });

    const conflict = await findConflict({
      ...resolved,
      excludeId: existing?._id
    });

    if (conflict) {
      return res.status(400).json({ msg: "Timetable conflict detected" });
    }

    const entry = await Timetable.findOneAndUpdate(
      {
        course: resolved.course,
        semester: resolved.semester,
        className: resolved.className || "",
        batch: resolved.batch || "",
        day: resolved.day,
        startTime: resolved.startTime,
        endTime: resolved.endTime
      },
      resolved,
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
    if (req.query.batch) query.batch = req.query.batch;

    if (req.user.role === "faculty") {
      query.faculty = req.user.id;
    }

    if (req.user.role === "student") {
      const profile = await Profile.findOne({ user: req.user.id });
      query.className = profile?.assignedClass || "__none__";
      query.batch = profile?.assignedBatch || "Morning";
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
