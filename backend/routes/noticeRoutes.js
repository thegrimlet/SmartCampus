const router = require("express").Router();
const Notice = require("../models/Notice");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only admin can post notices" });
    }

    const { title, content, role = "all" } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ msg: "Title and content are required" });
    }

    const notice = await Notice.create({
      title: title.trim(),
      content: content.trim(),
      role
    });

    res.json(notice);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = req.user.role === "admin"
      ? {}
      : { role: { $in: ["all", req.user.role] } };

    const notices = await Notice.find(query).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only admin can edit notices" });
    }

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!notice) {
      return res.status(404).json({ msg: "Notice not found" });
    }

    res.json(notice);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only admin can delete notices" });
    }

    const notice = await Notice.findByIdAndDelete(req.params.id);

    if (!notice) {
      return res.status(404).json({ msg: "Notice not found" });
    }

    res.json({ msg: "Notice deleted" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
