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

const getFacultyLecture = async (req, { timetableEntry, className, batch, lectureDate, startTime, endTime }) => {
  const day = weekDays[lectureDate.getDay()];
  if (timetableEntry) {
    return Timetable.findOne({
      _id: timetableEntry,
      faculty: req.user.id,
      day,
      startTime,
      endTime
    }).populate("faculty", "name email");
  }

  return Timetable.findOne({
    faculty: req.user.id,
    className,
    batch,
    day,
    startTime,
    endTime
  }).populate("faculty", "name email");
};

const getLectureProfiles = async (lecture) => {
  if (lecture.className) {
    return Profile.find({
      assignedClass: lecture.className,
      assignedBatch: lecture.batch || "Morning"
    }).select("user rollNumber");
  }

  return Profile.find({
    course: lecture.course,
    semester: lecture.semester
  }).select("user rollNumber");
};

router.get("/admin/filter-options", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only admin can view attendance filters" });
    }

    const records = await Attendance.find({})
      .populate("studentId", "name email")
      .populate("faculty", "name email")
      .populate("timetableEntry", "course semester")
      .sort({ lectureDate: -1 });

    const uniqueById = (items) => [...new Map(items.filter(Boolean).map((item) => [String(item._id), item])).values()];
    const uniqueText = (items) => [...new Set(items.filter(Boolean))].sort();
    const semestersByCourse = {};
    const studentScopes = new Map();

    records.forEach((record) => {
      const course = record.timetableEntry?.course;
      const semester = record.timetableEntry?.semester;
      if (course && semester) {
        semestersByCourse[course] = semestersByCourse[course] || new Set();
        semestersByCourse[course].add(semester);
      }

      if (record.studentId) {
        const studentId = String(record.studentId._id);
        const scope = studentScopes.get(studentId) || {
          _id: record.studentId._id,
          name: record.studentId.name,
          email: record.studentId.email,
          scopes: []
        };

        if (course || semester) {
          const key = `${course || ""}|${semester || ""}`;
          if (!scope.scopes.some((item) => `${item.course || ""}|${item.semester || ""}` === key)) {
            scope.scopes.push({ course, semester });
          }
        }

        studentScopes.set(studentId, scope);
      }
    });

    res.json({
      classes: uniqueText(records.map((record) => record.className)),
      batches: uniqueText(records.map((record) => record.batch)),
      courses: uniqueText(records.map((record) => record.timetableEntry?.course)),
      semesters: uniqueText(records.map((record) => record.timetableEntry?.semester)),
      semestersByCourse: Object.fromEntries(
        Object.entries(semestersByCourse).map(([course, semesters]) => [course, [...semesters].sort()])
      ),
      subjects: uniqueText(records.map((record) => record.subject)),
      students: uniqueById(records.map((record) => record.studentId)).map((student) => studentScopes.get(String(student._id))),
      faculties: uniqueById(records.map((record) => record.faculty)).map((faculty) => ({
        _id: faculty._id,
        name: faculty.name,
        email: faculty.email
      }))
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/admin/records", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only admin can view attendance records" });
    }

    const {
      course,
      semester,
      className,
      batch,
      subject,
      status,
      from,
      to,
      student,
      faculty
    } = req.query;

    const query = {};

    if (className) query.className = className;
    if (batch) query.batch = batch;
    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (student) query.studentId = student;
    if (faculty) query.faculty = faculty;

    if (from || to) {
      query.lectureDate = {};
      if (from) query.lectureDate.$gte = parseLectureDate(from);
      if (to) query.lectureDate.$lte = endOfDay(parseLectureDate(to));
    }

    if (course || semester) {
      const timetableQuery = {};
      if (course) timetableQuery.course = course;
      if (semester) timetableQuery.semester = semester;
      const timetableEntries = await Timetable.find(timetableQuery).select("_id");
      query.timetableEntry = { $in: timetableEntries.map((entry) => entry._id) };
    }

    const records = await Attendance.find(query)
      .populate("studentId", "name email")
      .populate("faculty", "name email")
      .populate("timetableEntry", "course semester room")
      .sort({ lectureDate: -1, startTime: 1, createdAt: -1 })
      .limit(300);

    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

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
      .select("className batch subject day startTime endTime room course semester");

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

    const { timetableEntry, className, batch, startTime, endTime } = req.query;
    const lectureDate = parseLectureDate(req.query.date);

    if ((!timetableEntry && (!className || !batch)) || !startTime || !endTime) {
      return res.status(400).json({ msg: "Lecture slot is required" });
    }

    const lecture = await getFacultyLecture(req, { timetableEntry, className, batch, lectureDate, startTime, endTime });
    if (!lecture) {
      return res.status(403).json({ msg: "You are not assigned to this lecture slot" });
    }

    const profiles = await getLectureProfiles(lecture);
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
      timetableEntry: lecture._id,
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

    const { timetableEntry, className, batch, startTime, endTime, records } = req.body;
    const lectureDate = parseLectureDate(req.body.date);

    if ((!timetableEntry && (!className || !batch)) || !startTime || !endTime || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ msg: "Lecture slot and attendance records are required" });
    }

    const lecture = await getFacultyLecture(req, { timetableEntry, className, batch, lectureDate, startTime, endTime });
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
        timetableEntry: lecture._id,
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
          className: lecture.className || className || lecture.course,
          batch: lecture.batch || batch || lecture.semester,
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
