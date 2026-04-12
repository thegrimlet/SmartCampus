const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  feeType: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: Date,
  status: {
    type: String,
    enum: ["due", "paid", "failed"],
    default: "due"
  },
  transactionId: { type: String, trim: true },
  paidAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
