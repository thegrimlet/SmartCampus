const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  subject: String,
  className: String,
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["present", "absent"]
  }
});

module.exports = mongoose.model("Attendance", attendanceSchema);
