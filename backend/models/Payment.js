const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  className: { type: String, trim: true },
  semester: { type: String, trim: true },
  feeType: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: Date,
  notes: { type: String, trim: true },
  feeStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FeeStructure"
  },
  status: {
    type: String,
    enum: ["due", "paid", "failed"],
    default: "due"
  },
  transactionId: { type: String, trim: true },
  gatewayOrderId: { type: String, trim: true },
  gatewayPaymentId: { type: String, trim: true },
  gatewaySignature: { type: String, trim: true },
  gateway: { type: String, trim: true },
  receiptNumber: { type: String, trim: true },
  paidAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
