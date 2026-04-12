const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, async (req, res) => {
  try {
    const receiver = await User.findById(req.body.receiver);
    if (!receiver || receiver.status !== "approved") {
      return res.status(404).json({ msg: "Approved receiver not found" });
    }

    const pair = [req.user.role, receiver.role].sort().join("-");
    if (pair !== "faculty-student" && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only faculty and students can message each other" });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: req.body.receiver,
      subject: req.body.subject || "Campus message",
      body: req.body.body
    });

    res.json(await message.populate([
      { path: "sender", select: "name email role" },
      { path: "receiver", select: "name email role" }
    ]));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const query = req.user.role === "admin"
      ? {}
      : { $or: [{ sender: req.user.id }, { receiver: req.user.id }] };

    const messages = await Message.find(query)
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/:id/read", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Access denied" });
    }

    message.readAt = new Date();
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;
