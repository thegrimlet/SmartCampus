const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true },
  semester: { type: String, trim: true },
  feeType: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: Date,
  notes: { type: String, trim: true }
}, { timestamps: true });

feeStructureSchema.index({ className: 1, semester: 1, feeType: 1 }, { unique: true });

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
