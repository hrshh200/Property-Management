const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    category: {
      type: String,
      enum: ["Repair", "Maintenance", "Tax", "Insurance", "Utility", "Legal", "Advertising", "Other"],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    source: {
      type: String,
      enum: ["manual", "vendor-maintenance"],
      default: "manual",
    },
    maintenanceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceRequest", default: null },
    financialYear: { type: String, trim: true }, // e.g. "2024-25"
  },
  { timestamps: true }
);

// Auto-set financialYear before saving
expenseSchema.pre("save", function (next) {
  if (this.date) {
    const d = new Date(this.date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    // Indian financial year: April to March
    this.financialYear = month >= 4 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;
  }
  next();
});

module.exports = mongoose.model("Expense", expenseSchema);
