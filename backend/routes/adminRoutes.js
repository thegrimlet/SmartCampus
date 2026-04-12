const router = require("express").Router();
const User = require("../models/User");
const Notice = require("../models/Notice");
const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");
const Payment = require("../models/Payment");
const Timetable = require("../models/Timetable");
const Result = require("../models/Result");
const auth = require("../middleware/authMiddleware");

router.get("/stats", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const [
      totalStudents,
      totalFaculty,
      pendingUsers,
      totalSubjects,
      totalNotices,
      totalAttendance,
      totalPayments,
      paidPayments,
      timetableEntries,
      totalResults
    ] = await Promise.all([
      User.countDocuments({ role: "student", status: "approved" }),
      User.countDocuments({ role: "faculty", status: "approved" }),
      User.countDocuments({ status: "pending" }),
      Subject.countDocuments(),
      Notice.countDocuments(),
      Attendance.countDocuments(),
      Payment.countDocuments(),
      Payment.countDocuments({ status: "paid" }),
      Timetable.countDocuments(),
      Result.countDocuments()
    ]);

    res.json({
      totalStudents,
      totalFaculty,
      pendingUsers,
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
