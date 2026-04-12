const router = require("express").Router();
const Subject = require("../models/Subject");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const name = req.body.name?.trim();
    if (!name) {
      return res.status(400).json({ msg: "Subject name is required" });
    }

    const subject = await Subject.create({ name });
    res.json(subject);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Subject already exists" });
    }

    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access denied" });
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
