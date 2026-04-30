const router = require("express").Router();
const Attendance = require("../models/Attendance");
const Profile = require("../models/Profile");
const Timetable = require("../models/Timetable");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const parseLectureDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const getFacultyLecture = async (req, { className, batch, lectureDate, startTime, endTime }) => {
  const day = weekDays[lectureDate.getDay()];

  return Timetable.findOne({
    faculty: req.user.id,
    className,
    batch,
    day,
    startTime,
    endTime
  }).populate("faculty", "name email");
};

router.get("/faculty/lectures", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only faculty can access lecture slots" });
    }

    const lectureDate = parseLectureDate(req.query.date);
    const day = weekDays[lectureDate.getDay()];
    const query = {
      faculty: req.user.id,
      day
    };

    if (req.query.className) {
      query.className = req.query.className;
    }

    if (req.query.batch) {
      query.batch = req.query.batch;
    }

    const lectures = await Timetable.find(query)
      .sort({ className: 1, startTime: 1 })
      .select("className subject day startTime endTime room course semester");

    const classNames = [...new Map(
      lectures.map((lecture) => {
        const batch = lecture.batch || "Morning";
        const key = `${lecture.className}|${batch}`;
        return [key, { key, label: `${lecture.className} (${batch})` }];
      })
    ).values()];

    res.json({
      date: lectureDate,
      day,
      classes: classNames,
      lectures
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/faculty/session", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only faculty can access attendance sessions" });
    }

    const { className, batch, startTime, endTime } = req.query;
    const lectureDate = parseLectureDate(req.query.date);

    if (!className || !batch || !startTime || !endTime) {
      return res.status(400).json({ msg: "Class, batch, date, and lecture slot are required" });
    }

    const lecture = await getFacultyLecture(req, { className, batch, lectureDate, startTime, endTime });
    if (!lecture) {
      return res.status(403).json({ msg: "You are not assigned to this lecture slot" });
    }

    const profiles = await Profile.find({ assignedClass: className, assignedBatch: batch }).select("user rollNumber");
    const studentIds = profiles.map((profile) => profile.user);
    const classStudentsRaw = await User.find({
      _id: { $in: studentIds },
      role: "student",
      emailVerified: true
    }).select("-password");

    const byUserId = new Map(profiles.map((profile) => [profile.user.toString(), profile.rollNumber || ""]));
    const classStudents = classStudentsRaw
      .sort((a, b) => {
        const rollA = byUserId.get(a._id.toString()) || "";
        const rollB = byUserId.get(b._id.toString()) || "";
        return rollA.localeCompare(rollB) || a.name.localeCompare(b.name);
      });

    const records = await Attendance.find({
      className,
      batch,
      subject: lecture.subject,
      lectureDate: { $gte: lectureDate, $lte: endOfDay(lectureDate) },
      startTime,
      endTime
    });

    const statusByStudent = Object.fromEntries(
      records.map((record) => [record.studentId.toString(), record.status])
    );

    res.json({
      lecture,
      students: classStudents.map((student) => ({
        ...student.toObject(),
        rollNumber: byUserId.get(student._id.toString()) || "",
        status: statusByStudent[student._id.toString()] || "present"
      })),
      existingCount: records.length
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/faculty/session", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only faculty can mark attendance" });
    }

    const { className, batch, startTime, endTime, records } = req.body;
    const lectureDate = parseLectureDate(req.body.date);

    if (!className || !batch || !startTime || !endTime || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ msg: "Class, batch, lecture slot, and attendance records are required" });
    }

    const lecture = await getFacultyLecture(req, { className, batch, lectureDate, startTime, endTime });
    if (!lecture) {
      return res.status(403).json({ msg: "You are not assigned to this lecture slot" });
    }

    const validRecords = records.filter((record) =>
      record.studentId && ["present", "absent"].includes(record.status)
    );

    let created = 0;
    let updated = 0;

    for (const record of validRecords) {
      const existing = await Attendance.findOne({
        studentId: record.studentId,
        className,
        batch,
        subject: lecture.subject,
        lectureDate: { $gte: lectureDate, $lte: endOfDay(lectureDate) },
        startTime,
        endTime
      });

      if (existing) {
        existing.status = record.status;
        existing.faculty = req.user.id;
        existing.timetableEntry = lecture._id;
        existing.day = lecture.day;
        await existing.save();
        updated += 1;
      } else {
        await Attendance.create({
          studentId: record.studentId,
          faculty: req.user.id,
          timetableEntry: lecture._id,
          subject: lecture.subject,
          className,
          batch,
          lectureDate,
          day: lecture.day,
          startTime,
          endTime,
          status: record.status,
          date: lectureDate
        });
        created += 1;
      }
    }

    res.json({
      msg: "Attendance saved",
      created,
      updated,
      invalid: records.length - validRecords.length,
      lecture
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/summary/:studentId", auth, async (req, res) => {
  try {
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const records = await Attendance.find({ studentId: req.params.studentId });
    const subjects = {};

    for (const record of records) {
      if (!subjects[record.subject]) {
        subjects[record.subject] = { total: 0, present: 0, absent: 0 };
      }

      subjects[record.subject].total += 1;
      subjects[record.subject][record.status] += 1;
    }

    res.json(Object.entries(subjects).map(([subject, data]) => ({
      subject,
      ...data,
      percentage: data.total ? Math.round((data.present / data.total) * 100) : 0
    })));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:studentId", auth, async (req, res) => {
  try {
    if (req.user.role === "student" && req.user.id !== req.params.studentId) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const records = await Attendance.find({
      studentId: req.params.studentId
    }).sort({ lectureDate: -1, startTime: 1, createdAt: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
