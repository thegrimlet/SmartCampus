const router = require("express").Router();
const Notice = require("../models/Notice");
const auth = require("../middleware/authMiddleware");

// CREATE NOTICE
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admin can post notices" });
  }

  const notice = await Notice.create(req.body);
  res.json(notice);
});

// GET NOTICES
router.get("/", auth, async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
});

// UPDATE NOTICE
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admin can edit notices" });
  }

  const notice = await Notice.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  if (!notice) {
    return res.status(404).json({ msg: "Notice not found" });
  }

  res.json(notice);
});

// DELETE NOTICE
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Only admin can delete notices" });
  }

  const notice = await Notice.findByIdAndDelete(req.params.id);

  if (!notice) {
    return res.status(404).json({ msg: "Notice not found" });
  }

  res.json({ msg: "Notice deleted" });
});

module.exports = router;