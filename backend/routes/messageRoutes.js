const router = require("express").Router();
const Message = require("../models/Message");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const canAccessConversation = (role, userId, message) =>
  role === "admin" ||
  message.sender.toString() === userId ||
  message.receiver.toString() === userId;

router.post("/", auth, async (req, res) => {
  try {
    const receiver = await User.findById(req.body.receiver);
    if (!receiver || !receiver.emailVerified) {
      return res.status(404).json({ msg: "Verified receiver not found" });
    }

    const pair = [req.user.role, receiver.role].sort().join("-");
    if (pair !== "faculty-student" && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Only faculty and students can message each other" });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: req.body.receiver,
      conversationId: req.body.conversationId || `CONV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject: req.body.subject || "Campus message",
      body: req.body.body,
      replyTo: req.body.replyTo || undefined
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

router.get("/threads", auth, async (req, res) => {
  try {
    const query = req.user.role === "admin"
      ? {}
      : { $or: [{ sender: req.user.id }, { receiver: req.user.id }] };

    const messages = await Message.find(query)
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({ createdAt: -1 });

    const threadMap = new Map();
    messages.forEach((message) => {
      const existing = threadMap.get(message.conversationId);
      const isUnread = !message.readAt && message.receiver?._id?.toString() === req.user.id;

      if (!existing) {
        const otherParty = message.sender?._id?.toString() === req.user.id ? message.receiver : message.sender;
        threadMap.set(message.conversationId, {
          conversationId: message.conversationId,
          subject: message.subject,
          otherParty,
          lastMessage: message,
          unreadCount: isUnread ? 1 : 0
        });
      } else if (isUnread) {
        existing.unreadCount += 1;
      }
    });

    res.json(Array.from(threadMap.values()));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/threads/:conversationId", auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.json([]);
    }

    if (!messages.every((message) => canAccessConversation(req.user.role, req.user.id, message))) {
      return res.status(403).json({ msg: "Access denied" });
    }

    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.put("/threads/:conversationId/read", auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        receiver: req.user.id,
        readAt: { $exists: false }
      },
      { $set: { readAt: new Date() } }
    );

    res.json({ msg: "Thread marked as read" });
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
