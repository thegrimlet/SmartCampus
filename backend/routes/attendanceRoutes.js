const router = require("express").Router();
const Attendance = require("../models/Attendance");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ msg: "Only faculty can mark attendance" });
    }

    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ msg: "Attendance records are required" });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const validRecords = records.filter((record) =>
      record.studentId &&
      record.subject &&
      ["present", "absent"].includes(record.status)
    );

    const newRecords = [];

    for (const record of validRecords) {
      const existing = await Attendance.findOne({
        studentId: record.studentId,
        subject: record.subject,
        date: { $gte: start, $lte: end }
      });

      if (!existing) {
        newRecords.push(record);
      }
    }

    const saved = newRecords.length ? await Attendance.insertMany(newRecords) : [];

    res.json({
      saved,
      skipped: validRecords.length - saved.length,
      invalid: records.length - validRecords.length
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
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
