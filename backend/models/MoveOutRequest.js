const mongoose = require("mongoose");

const moveOutRequestSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestedMoveOutDate: { type: Date, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed"],
      default: "Pending",
    },
    ownerNote: { type: String, trim: true },
    approvedLastStayingDate: { type: Date },
    closingFormalities: { type: String, trim: true },
    decidedAt: { type: Date },
    completedAt: { type: Date },
    completionNote: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MoveOutRequest", moveOutRequestSchema);
