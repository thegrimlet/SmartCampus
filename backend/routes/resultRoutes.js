const router = require("express").Router();
const Result = require("../models/Result");
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const student = await User.findOne({ _id: req.body.student, role: "student", emailVerified: true });
    if (!student) {
      return res.status(404).json({ msg: "Verified student not found" });
    }

    const result = await Result.create({
      student: req.body.student,
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      marksObtained: req.body.marksObtained,
      maxMarks: req.body.maxMarks || 100,
      grade: req.body.grade,
      remarks: req.body.remarks,
      recordedBy: req.user.id
    });

    res.json(await result.populate("student", "name email"));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};

    if (req.user.role === "student") {
      query.student = req.user.id;
    } else if (req.query.student) {
      query.student = req.query.student;
    }

    const results = await Result.find(query)
      .populate("student", "name email")
      .populate("recordedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(results);
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

    const [student, profile, results] = await Promise.all([
      User.findOne({ _id: studentId, role: "student", emailVerified: true }).select("name email"),
      Profile.findOne({ user: studentId }),
      Result.find({ student: studentId }).sort({ semester: 1, subject: 1 })
    ]);

    if (!student) {
      return res.status(404).json({ msg: "Verified student not found" });
    }

    const gradePoints = {
      "A+": 10,
      A: 9,
      "B+": 8,
      B: 7,
      C: 6,
      D: 5,
      F: 0
    };

    const semesters = results.reduce((acc, result) => {
      const key = result.semester || "Unspecified";
      if (!acc[key]) {
        acc[key] = {
          semester: key,
          entries: [],
          totalMarks: 0,
          totalMax: 0,
          totalGradePoints: 0,
          gradedCount: 0
        };
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

    res.json({
      student,
      profile,
      semesters: semesterList,
      cgpa
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const result = await Result.findByIdAndUpdate(
      req.params.id,
      {
        subject: req.body.subject,
        course: req.body.course,
        semester: req.body.semester,
        marksObtained: req.body.marksObtained,
        maxMarks: req.body.maxMarks,
        grade: req.body.grade,
        remarks: req.body.remarks
      },
      { new: true, runValidators: true }
    )
      .populate("student", "name email")
      .populate("recordedBy", "name email");

    if (!result) {
      return res.status(404).json({ msg: "Result not found" });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ msg: err.message });
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
