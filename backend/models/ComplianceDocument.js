const mongoose = require("mongoose");

const complianceDocumentSchema = new mongoose.Schema(
  {
    lease: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    documentType: {
      type: String,
      enum: ["Rent Agreement", "Aadhaar Card", "PAN Card", "Police Verification", "Other"],
      required: true,
    },
    documentNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    filePath: { type: String, required: true, trim: true },
    uploadedByRole: { type: String, enum: ["owner", "tenant"], required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ComplianceDocument", complianceDocumentSchema);
