const mongoose = require("mongoose");

const leaseRenewalSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    proposedRentAmount: { type: Number, required: true, min: 0 },
    proposedLeaseStartDate: { type: Date, required: true },
    proposedLeaseEndDate: { type: Date, required: true },
    note: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Cancelled"],
      default: "Pending",
    },
    decisionNote: { type: String, trim: true },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LeaseRenewal", leaseRenewalSchema);
