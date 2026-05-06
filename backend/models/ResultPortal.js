const mongoose = require("mongoose");

const resultPortalSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "global" },
  isOpen: { type: Boolean, default: false },
  declared: { type: Boolean, default: false },
  openedAt: Date,
  closedAt: Date,
  declaredAt: Date,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = mongoose.model("ResultPortal", resultPortalSchema);
