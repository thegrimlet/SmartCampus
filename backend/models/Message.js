const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  conversationId: { type: String, required: true, trim: true, index: true },
  subject: { type: String, trim: true, default: "Campus message" },
  body: { type: String, required: true, trim: true },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  },
  readAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
