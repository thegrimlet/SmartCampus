const router = require("express").Router();
const Result = require("../models/Result");
const ResultPortal = require("../models/ResultPortal");
const Profile = require("../models/Profile");
const User = require("../models/User");
const Timetable = require("../models/Timetable");
const Subject = require("../models/Subject");
const auth = require("../middleware/authMiddleware");

const gradeFor = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
};

const getPortal = () =>
  ResultPortal.findOneAndUpdate(
    { key: "global" },
    { $setOnInsert: { key: "global" } },
    { returnDocument: "after", upsert: true }
  );

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }
  return true;
};

const normalizeMarks = (body) => {
  const theoryMarks = Number(body.theoryMarks || 0);
  const theoryMax = Number(body.theoryMax || 0);
  const practicalMarks = Number(body.practicalMarks || 0);
  const practicalMax = Number(body.practicalMax || 0);
  const maxMarks = theoryMax + practicalMax;
  const marksObtained = theoryMarks + practicalMarks;

  return {
    theoryMarks,
    theoryMax,
    practicalMarks,
    practicalMax,
    maxMarks,
    marksObtained,
    grade: body.grade || gradeFor(maxMarks ? (marksObtained / maxMarks) * 100 : 0)
  };
};

const studentMatchesScope = async (studentId, scope) => {
  const profile = await Profile.findOne({ user: studentId });
  if (!profile) return false;

  if (scope.className) {
    return profile.assignedClass === scope.className && (profile.assignedBatch || "Morning") === (scope.batch || "Morning");
  }

  return profile.course === scope.course && profile.semester === scope.semester;
};

const facultyCanMark = async (req, scope) => {
  if (req.user.role !== "faculty") return false;

  const query = {
    faculty: req.user.id,
    subject: scope.subject,
    course: scope.course,
    semester: scope.semester
  };

  if (scope.className) {
    query.className = scope.className;
    query.batch = scope.batch || "Morning";
  }

  const assigned = await Timetable.findOne(query);
  return Boolean(assigned);
};

const resultPayload = async (req) => {
  const marks = normalizeMarks(req.body);
  if (marks.maxMarks <= 0) {
    throw new Error("Theory or practical maximum marks are required");
  }

  if (marks.theoryMarks > marks.theoryMax || marks.practicalMarks > marks.practicalMax) {
    throw new Error("Marks cannot exceed maximum marks");
  }

  return {
    student: req.body.student,
    subject: req.body.subject,
    course: req.body.course,
    semester: req.body.semester,
    className: req.body.className || "",
    batch: req.body.batch || "",
    theoryMarks: marks.theoryMarks,
    theoryMax: marks.theoryMax,
    practicalMarks: marks.practicalMarks,
    practicalMax: marks.practicalMax,
    marksObtained: marks.marksObtained,
    maxMarks: marks.maxMarks,
    grade: marks.grade,
    remarks: req.body.remarks,
    recordedBy: req.user.id
  };
};

const loadStudentsForScope = async (scope) => {
  const profileQuery = scope.className
    ? { assignedClass: scope.className, assignedBatch: scope.batch || "Morning" }
    : { course: scope.course, semester: scope.semester };

  const profiles = await Profile.find(profileQuery).select("user rollNumber");
  const rollByUser = new Map(profiles.map((profile) => [profile.user.toString(), profile.rollNumber || ""]));
  const students = await User.find({
    _id: { $in: profiles.map((profile) => profile.user) },
    role: "student",
    emailVerified: true
  }).select("name email");

  return students
    .map((student) => ({
      ...student.toObject(),
      rollNumber: rollByUser.get(student._id.toString()) || ""
    }))
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber) || a.name.localeCompare(b.name));
};

const attachEnrollmentNumbers = async (results) => {
  const list = Array.isArray(results) ? results : [results];
  const studentIds = list
    .map((result) => result.student?._id || result.student)
    .filter(Boolean);
  const profiles = await Profile.find({ user: { $in: studentIds } }).select("user rollNumber");
  const rollByUser = new Map(profiles.map((profile) => [profile.user.toString(), profile.rollNumber || ""]));

  const enriched = list.map((result) => {
    const item = result.toObject ? result.toObject() : result;
    const studentId = item.student?._id?.toString?.() || item.student?.toString?.();
    if (item.student && studentId) {
      item.student.rollNumber = rollByUser.get(studentId) || "";
    }
    return item;
  });

  return Array.isArray(results) ? enriched : enriched[0];
};

const sendResult = async (res, result) => {
  res.json(await attachEnrollmentNumbers(result));
};

router.get("/portal", auth, async (req, res) => {
  try {
    res.json(await getPortal());
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/portal/open", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const portal = await getPortal();
    portal.isOpen = true;
    portal.declared = false;
    portal.openedAt = new Date();
    portal.closedAt = undefined;
    portal.updatedBy = req.user.id;
    await portal.save();
    res.json(portal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/portal/close", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const portal = await getPortal();
    portal.isOpen = false;
    portal.closedAt = new Date();
    portal.updatedBy = req.user.id;
    await portal.save();
    res.json(portal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/portal/declare", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;
    const portal = await getPortal();
    portal.isOpen = false;
    portal.declared = true;
    portal.closedAt = portal.closedAt || new Date();
    portal.declaredAt = new Date();
    portal.updatedBy = req.user.id;
    await portal.save();
    await Result.updateMany({}, { declared: true, declaredAt: portal.declaredAt });
    res.json(portal);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/faculty/scopes", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const entries = await Timetable.find({ faculty: req.user.id }).sort({ course: 1, semester: 1, subject: 1 });
    const seen = new Set();
    const scopes = [];

    for (const entry of entries) {
      const key = [entry.course, entry.semester, entry.subject, entry.className || "", entry.batch || ""].join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      const subject = await Subject.findOne({
        courseCode: entry.course,
        semester: entry.semester,
        name: entry.subject
      });

      scopes.push({
        key,
        subject: entry.subject,
        course: entry.course,
        semester: entry.semester,
        className: entry.className || "",
        batch: entry.batch || "",
        theoryMax: subject?.theoryMarks || 0,
        practicalMax: subject?.practicalMarks || 0,
        students: await loadStudentsForScope(entry)
      });
    }

    res.json(scopes);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only assigned subject faculty can submit marks" });
    }

    const portal = await getPortal();
    if (!portal.isOpen) {
      return res.status(403).json({ msg: "Result portal is closed" });
    }

    const student = await User.findOne({ _id: req.body.student, role: "student", emailVerified: true });
    if (!student) {
      return res.status(404).json({ msg: "Verified student not found" });
    }

    const scope = {
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      className: req.body.className || "",
      batch: req.body.batch || ""
    };

    if (!await facultyCanMark(req, scope)) {
      return res.status(403).json({ msg: "You can update marks only for assigned subjects" });
    }

    if (!await studentMatchesScope(req.body.student, scope)) {
      return res.status(400).json({ msg: "Student does not belong to this class/course scope" });
    }

    const payload = await resultPayload(req);
    const result = await Result.findOneAndUpdate(
      {
        student: payload.student,
        subject: payload.subject,
        course: payload.course,
        semester: payload.semester,
        className: payload.className,
        batch: payload.batch
      },
      { ...payload, declared: false, declaredAt: undefined },
      { returnDocument: "after", upsert: true, runValidators: true }
    ).populate("student", "name email");

    await sendResult(res, result);
  } catch (err) {
    res.status(err.message.includes("Marks") || err.message.includes("maximum") ? 400 : 500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "student") {
      query.student = req.user.id;
      query.declared = true;
    } else if (req.user.role === "faculty") {
      const entries = await Timetable.find({ faculty: req.user.id }).select("subject course semester className batch");
      query.$or = entries.map((entry) => ({
        subject: entry.subject,
        course: entry.course,
        semester: entry.semester,
        className: entry.className || "",
        batch: entry.batch || ""
      }));
      if (query.$or.length === 0) {
        query._id = null;
      }
    } else if (req.query.student) {
      query.student = req.query.student;
    }

    const results = await Result.find(query)
      .populate("student", "name email")
      .populate("recordedBy", "name email")
      .sort({ semester: 1, subject: 1 });

    res.json(await attachEnrollmentNumbers(results));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/summary", auth, async (req, res) => {
  try {
    const studentId = req.user.role === "student" ? req.user.id : req.query.student;
    if (!studentId) {
      return res.status(400).json({ msg: "Student is required" });
    }

    const query = { student: studentId };
    if (req.user.role === "student") query.declared = true;

    const [student, profile, results] = await Promise.all([
      User.findOne({ _id: studentId, role: "student", emailVerified: true }).select("name email"),
      Profile.findOne({ user: studentId }),
      Result.find(query).sort({ semester: 1, subject: 1 })
    ]);

    if (!student) {
      return res.status(404).json({ msg: "Verified student not found" });
    }

    const gradePoints = { "A+": 10, A: 9, "B+": 8, B: 7, C: 6, D: 5, F: 0 };

    const semesters = results.reduce((acc, result) => {
      const key = result.semester || "Unspecified";
      if (!acc[key]) {
        acc[key] = { semester: key, entries: [], totalMarks: 0, totalMax: 0, totalGradePoints: 0, gradedCount: 0 };
      }

      acc[key].entries.push(result);
      acc[key].totalMarks += result.marksObtained;
      acc[key].totalMax += result.maxMarks;
      if (result.grade && gradePoints[result.grade] !== undefined) {
        acc[key].totalGradePoints += gradePoints[result.grade];
        acc[key].gradedCount += 1;
      }
      return acc;
    }, {});

    const semesterList = Object.values(semesters).map((item) => ({
      ...item,
      percentage: item.totalMax ? Number(((item.totalMarks / item.totalMax) * 100).toFixed(2)) : 0,
      sgpa: item.gradedCount ? Number((item.totalGradePoints / item.gradedCount).toFixed(2)) : null
    }));

    const sgpaValues = semesterList.map((item) => item.sgpa).filter((value) => value !== null);
    const cgpa = sgpaValues.length
      ? Number((sgpaValues.reduce((sum, value) => sum + value, 0) / sgpaValues.length).toFixed(2))
      : null;

    res.json({ student, profile, semesters: semesterList, cgpa });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only assigned subject faculty can update marks" });
    }

    const portal = await getPortal();
    if (!portal.isOpen) {
      return res.status(403).json({ msg: "Result portal is closed" });
    }

    const existing = await Result.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ msg: "Result not found" });
    }

    const scope = {
      subject: req.body.subject || existing.subject,
      course: req.body.course || existing.course,
      semester: req.body.semester || existing.semester,
      className: req.body.className ?? existing.className,
      batch: req.body.batch ?? existing.batch
    };

    if (!await facultyCanMark(req, scope)) {
      return res.status(403).json({ msg: "You can update marks only for assigned subjects" });
    }

    const payload = await resultPayload({ ...req, body: { ...existing.toObject(), ...req.body, student: existing.student } });
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { ...payload, declared: false, declaredAt: undefined },
      { returnDocument: "after", runValidators: true }
    )
      .populate("student", "name email")
      .populate("recordedBy", "name email");

    await sendResult(res, result);
  } catch (err) {
    res.status(err.message.includes("Marks") || err.message.includes("maximum") ? 400 : 500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ msg: "Result not found" });
    }

    res.json({ msg: "Result deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
