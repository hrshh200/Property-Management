const mongoose = require("mongoose");

const maintenanceRequestSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"],
      required: true,
    },
    urgency: {
      type: String,
      enum: ["Low", "Medium", "High", "Emergency"],
      default: "Medium",
    },
    description: { type: String, required: true, trim: true },
    photos: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
    slaDueAt: { type: Date },
    escalated: { type: Boolean, default: false },
    comments: [
      {
        text: { type: String, trim: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    assignedVendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    vendorAssignedAt: { type: Date },

    // ── Vendor Quote ──────────────────────────────
    vendorQuote: {
      amount: { type: Number },
      description: { type: String, trim: true },
      submittedAt: { type: Date },
    },
    quoteStatus: {
      type: String,
      enum: ["NotSubmitted", "Pending", "Approved", "Rejected"],
      default: "NotSubmitted",
    },

    // ── Work Done Photos (uploaded by vendor) ─────
    vendorWorkPhotos: [{ type: String, trim: true }],
    workCompletedAt: { type: Date },

    // ── Vendor Payment Request ────────────────────
    vendorPaymentRequest: {
      amount: { type: Number },
      description: { type: String, trim: true },
      raisedAt: { type: Date },
      paidAt: { type: Date },
      status: {
        type: String,
        enum: ["NotRaised", "Pending", "Paid"],
        default: "NotRaised",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaintenanceRequest", maintenanceRequestSchema);
