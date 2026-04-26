const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managedByApp: { type: Boolean, default: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    specializations: [{
      type: String,
      enum: ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"],
    }],
    city: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    source: { type: String, trim: true, default: "app-directory" },
    isActive: { type: Boolean, default: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

vendorSchema.index({ managedByApp: 1, isActive: 1, name: 1 });
vendorSchema.index({ owner: 1, isActive: 1, name: 1 });

module.exports = mongoose.model("Vendor", vendorSchema);
