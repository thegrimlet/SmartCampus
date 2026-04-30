const router = require("express").Router();
const Course = require("../models/Course");
const Subject = require("../models/Subject");
const Profile = require("../models/Profile");
const auth = require("../middleware/authMiddleware");

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }

  return true;
};

router.get("/", auth, async (req, res) => {
  try {
    const courses = await Course.find().sort({ courseCode: 1 });
    const [subjects, studentProfiles] = await Promise.all([
      Subject.aggregate([{ $group: { _id: "$course", count: { $sum: 1 } } }]),
      Profile.aggregate([{ $group: { _id: "$course", count: { $sum: 1 } } }])
    ]);

    const subjectCounts = new Map(subjects.map((item) => [String(item._id), item.count]));
    const studentCounts = new Map(studentProfiles.map((item) => [String(item._id), item.count]));

    res.json(courses.map((course) => ({
      ...course.toObject(),
      subjectCount: subjectCounts.get(String(course._id)) || 0,
      studentCount: studentCounts.get(course.courseCode) || 0
    })));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const course = await Course.create({
      courseCode: req.body.courseCode,
      courseName: req.body.courseName,
      semYearType: req.body.semYearType || "Semester",
      totalSemYear: req.body.totalSemYear,
      department: req.body.department
    });

    res.json(course);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Course code already exists" });
    }

    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        courseCode: req.body.courseCode,
        courseName: req.body.courseName,
        semYearType: req.body.semYearType,
        totalSemYear: req.body.totalSemYear,
        department: req.body.department
      },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    await Subject.updateMany({ course: course._id }, { courseCode: course.courseCode });

    res.json(course);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    await Subject.deleteMany({ course: course._id });
    res.json({ msg: "Course deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
