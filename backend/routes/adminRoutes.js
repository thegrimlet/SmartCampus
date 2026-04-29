const router = require("express").Router();
const User = require("../models/User");
const Notice = require("../models/Notice");
const Attendance = require("../models/Attendance");
const Payment = require("../models/Payment");
const Timetable = require("../models/Timetable");
const Result = require("../models/Result");
const ClassAssignment = require("../models/ClassAssignment");
const auth = require("../middleware/authMiddleware");

router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const [
      totalStudents,
      totalFaculty,
      classAssignments,
      totalNotices,
      totalAttendance,
      totalPayments,
      paidPayments,
      timetableEntries,
      totalResults
    ] = await Promise.all([
      User.countDocuments({ role: "student", emailVerified: true }),
      User.countDocuments({ role: "faculty", emailVerified: true }),
      ClassAssignment.find().select("subjects"),
      Notice.countDocuments(),
      Attendance.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({ status: "paid" }),
      Timetable.countDocuments(),
      Result.countDocuments()
    ]);

    const totalSubjects = new Set(
      classAssignments.flatMap((assignment) => assignment.subjects || [])
    ).size;

    res.json({
      totalStudents,
      totalFaculty,
      totalSubjects,
      totalNotices,
      totalAttendance,
      totalPayments,
      paidPayments,
      timetableEntries,
      totalResults
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
