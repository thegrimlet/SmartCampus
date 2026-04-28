const mongoose = require("mongoose");

const classAssignmentSchema = new mongoose.Schema({
  className: { type: String, required: true, unique: true, trim: true },
  course: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  classTeacher: { type: String, trim: true },
  subjects: [{ type: String, trim: true }]
}, { timestamps: true });

module.exports = mongoose.model("ClassAssignment", classAssignmentSchema);
