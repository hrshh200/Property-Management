const mongoose = require("mongoose");

const vendorLeadSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: "" },
    specializations: [
      {
        type: String,
        enum: ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"],
      },
    ],
    message: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["New", "Contacted", "Approved", "Rejected"],
      default: "New",
    },
  },
  { timestamps: true }
);

vendorLeadSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("VendorLead", vendorLeadSchema);
