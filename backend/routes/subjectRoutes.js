const router = require("express").Router();
const Course = require("../models/Course");
const Subject = require("../models/Subject");
const auth = require("../middleware/authMiddleware");

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({ msg: "Access denied" });
    return false;
  }

  return true;
};

router.post("/", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const course = await Course.findById(req.body.course);
    if (!course) {
      return res.status(404).json({ msg: "Course not found" });
    }

    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ msg: "Subject name is required" });
    }

    const subject = await Subject.create({
      course: course._id,
      courseCode: course.courseCode,
      subjectCode: req.body.subjectCode,
      name,
      semester: req.body.semester,
      subjectType: req.body.subjectType || "Core",
      theoryMarks: Number(req.body.theoryMarks || 0),
      practicalMarks: Number(req.body.practicalMarks || 0)
    });

    res.json(await subject.populate("course", "courseCode courseName semYearType totalSemYear"));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Subject already exists for this course and semester" });
    }

    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = {};
    if (req.query.course) query.course = req.query.course;
    if (req.query.semester) query.semester = req.query.semester;

    const subjects = await Subject.find(query)
      .populate("course", "courseCode courseName semYearType totalSemYear")
      .sort({ semester: 1, subjectCode: 1, name: 1 });

    res.json(subjects);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const course = req.body.course ? await Course.findById(req.body.course) : null;
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        course: req.body.course,
        courseCode: course?.courseCode,
        subjectCode: req.body.subjectCode,
        name: req.body.name,
        semester: req.body.semester,
        subjectType: req.body.subjectType,
        theoryMarks: Number(req.body.theoryMarks || 0),
        practicalMarks: Number(req.body.practicalMarks || 0)
      },
      { returnDocument: "after", runValidators: true }
    ).populate("course", "courseCode courseName semYearType totalSemYear");

    if (!subject) {
      return res.status(404).json({ msg: "Subject not found" });
    }

    res.json(subject);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) {
      return;
    }

    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ msg: "Subject not found" });
    }

    res.json({ msg: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
