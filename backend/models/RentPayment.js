const mongoose = require("mongoose");

const paymentInstructionsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    upiId: { type: String, trim: true },
    qrCodeImageUrl: { type: String, trim: true },
  },
  { _id: false }
);

const paymentSubmissionSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["NotSubmitted", "Submitted", "Verified"],
      default: "NotSubmitted",
    },
    transactionId: { type: String, trim: true },
    paidAt: { type: Date },
    submittedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const rentPaymentSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, min: 0 },
    dueDate: { type: Date, required: true },
    paidDate: { type: Date },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Overdue"],
      default: "Pending",
    },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    receiptNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    paymentInstructions: { type: paymentInstructionsSchema, default: () => ({}) },
    paymentSubmission: { type: paymentSubmissionSchema, default: () => ({ status: "NotSubmitted" }) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RentPayment", rentPaymentSchema);
