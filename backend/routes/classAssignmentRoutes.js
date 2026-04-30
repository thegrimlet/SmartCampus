const router = require("express").Router();
const ClassAssignment = require("../models/ClassAssignment");
const Profile = require("../models/Profile");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }

  return true;
};

const normalizeSubjects = (subjects = []) =>
  subjects.map((subject) => subject.trim()).filter(Boolean);

const getBatch = (req) => (req.query.batch || req.body.batch || "Morning").trim();

router.get("/", auth, async (req, res) => {
  try {
    const assignments = await ClassAssignment.find().sort({ className: 1, batch: 1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:className", auth, async (req, res) => {
  try {
    const assignment = await ClassAssignment.findOne({
      className: req.params.className,
      batch: getBatch(req)
    });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:className", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const className = req.params.className.trim();
    const batch = getBatch(req);
    if (!className) {
      return res.status(400).json({ msg: "Class name is required" });
    }

    const assignment = await ClassAssignment.findOneAndUpdate(
      { className, batch },
      {
        className,
        batch,
        course: req.body.course,
        semester: req.body.semester,
        department: req.body.department,
        classTeacher: req.body.classTeacher,
        subjects: normalizeSubjects(req.body.subjects || [])
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:className", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const batch = getBatch(req);
    const assignment = await ClassAssignment.findOneAndDelete({
      className: req.params.className,
      batch
    });
    if (!assignment) {
      return res.status(404).json({ msg: "Class assignment not found" });
    }

    await Profile.updateMany(
      { assignedClass: req.params.className, assignedBatch: batch },
      { $set: { assignedClass: "", assignedBatch: "" }, $unset: { rollNumber: "" } }
    );

    res.json({ msg: "Class assignment deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:className/roster", auth, async (req, res) => {
  try {
    if (!["admin", "faculty"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied" });
    }

    const batch = getBatch(req);
    const [students, facultyProfiles] = await Promise.all([
      Profile.find({ assignedClass: req.params.className, assignedBatch: batch })
        .populate("user", "name email role status")
        .sort({ rollNumber: 1, updatedAt: -1 }),
      Profile.find({
        assignedClass: req.params.className,
        assignedBatch: batch,
        assignedSubjects: { $exists: true, $ne: [] }
      }).populate("user", "name email role status")
    ]);

    res.json({
      students: students.filter((profile) => profile.user?.role === "student"),
      faculty: facultyProfiles.filter((profile) => profile.user?.role === "faculty")
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:className/roster", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const className = req.params.className.trim();
    const batch = getBatch(req);
    const assignment = await ClassAssignment.findOne({ className, batch });
    if (!assignment) {
      return res.status(404).json({ msg: "Class assignment not found" });
    }

    const roster = Array.isArray(req.body.roster) ? req.body.roster : [];
    const studentIds = roster.map((entry) => entry.userId);
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      emailVerified: true
    }).select("_id");

    if (students.length !== roster.length) {
      return res.status(400).json({ msg: "Roster contains an invalid student" });
    }

    const rollNumbers = roster
      .map((entry) => (entry.rollNumber || "").trim())
      .filter(Boolean);
    if (new Set(rollNumbers).size !== rollNumbers.length) {
      return res.status(400).json({ msg: "Roll numbers must be unique within a class batch" });
    }

    await Promise.all(
      roster.map((entry) =>
        Profile.findOneAndUpdate(
          { user: entry.userId },
          {
            assignedClass: className,
            assignedBatch: batch,
            rollNumber: (entry.rollNumber || "").trim()
          },
          { upsert: true, new: true, runValidators: true }
        )
      )
    );

    const keepIds = roster.map((entry) => entry.userId);
    await Profile.updateMany(
      {
        assignedClass: className,
        assignedBatch: batch,
        user: { $nin: keepIds }
      },
      { $set: { assignedClass: "", assignedBatch: "" }, $unset: { rollNumber: "" } }
    );

    const studentsWithProfiles = await Profile.find({ assignedClass: className, assignedBatch: batch })
      .populate("user", "name email role status")
      .sort({ rollNumber: 1, updatedAt: -1 });

    res.json({
      msg: "Roster updated",
      students: studentsWithProfiles.filter((profile) => profile.user?.role === "student")
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:className/faculty/:facultyId", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const className = req.params.className.trim();
    const batch = getBatch(req);
    const assignment = await ClassAssignment.findOne({ className, batch });
    if (!assignment) {
      return res.status(404).json({ msg: "Class assignment not found" });
    }

    const faculty = await User.findOne({
      _id: req.params.facultyId,
      role: "faculty",
      emailVerified: true
    }).select("_id name");

    if (!faculty) {
      return res.status(404).json({ msg: "Faculty member not found" });
    }

    const subjects = normalizeSubjects(req.body.subjects || []);
    const invalidSubject = subjects.find((subject) => !assignment.subjects.includes(subject));
    if (invalidSubject) {
      return res.status(400).json({ msg: `Subject "${invalidSubject}" is not part of ${className} (${batch})` });
    }

    const profile = await Profile.findOneAndUpdate(
      { user: faculty._id },
      {
        assignedClass: className,
        assignedBatch: batch,
        assignedSubjects: subjects
      },
      { upsert: true, new: true, runValidators: true }
    ).populate("user", "name email role status");

    const shouldBeClassTeacher = Boolean(req.body.isClassTeacher);
    if (shouldBeClassTeacher) {
      assignment.classTeacher = faculty.name;
      await assignment.save();
    } else if (assignment.classTeacher === faculty.name && subjects.length === 0) {
      assignment.classTeacher = "";
      await assignment.save();
    }

    res.json({
      msg: "Faculty assignment saved",
      faculty: profile,
      classTeacher: assignment.classTeacher
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:className/faculty/:facultyId", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const className = req.params.className.trim();
    const batch = getBatch(req);
    const [assignment, faculty] = await Promise.all([
      ClassAssignment.findOne({ className, batch }),
      User.findOne({
        _id: req.params.facultyId,
        role: "faculty",
        emailVerified: true
      }).select("_id name")
    ]);

    if (!assignment) {
      return res.status(404).json({ msg: "Class assignment not found" });
    }

    if (!faculty) {
      return res.status(404).json({ msg: "Faculty member not found" });
    }

    await Profile.findOneAndUpdate(
      { user: faculty._id, assignedClass: className, assignedBatch: batch },
      {
        assignedClass: "",
        assignedBatch: "",
        assignedSubjects: []
      },
      { new: true }
    );

    if (assignment.classTeacher === faculty.name) {
      assignment.classTeacher = "";
      await assignment.save();
    }

    res.json({ msg: "Faculty assignment removed" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
