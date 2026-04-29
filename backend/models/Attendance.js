const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  timetableEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Timetable"
  },
  subject: String,
  className: String,
  lectureDate: Date,
  day: String,
  startTime: String,
  endTime: String,
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["present", "absent"]
  }
});

attendanceSchema.index(
  {
    studentId: 1,
    className: 1,
    subject: 1,
    lectureDate: 1,
    startTime: 1,
    endTime: 1
  },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
