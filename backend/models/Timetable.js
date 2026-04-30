const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema({
  course: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  className: { type: String, trim: true, default: "" },
  batch: { type: String, trim: true, default: "" },
  classTeacher: { type: String, trim: true },
  subject: { type: String, required: true, trim: true },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  day: {
    type: String,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    required: true
  },
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  room: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Timetable", timetableSchema);
