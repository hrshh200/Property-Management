const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    countryCode: { type: String, trim: true, default: "+91" },
    phone: { type: String, trim: true, required: true },
    role: { type: String, enum: ["owner", "tenant"], required: true },
    isActive: { type: Boolean, default: true },
    paymentDetails: {
      accountHolderName: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      accountType: { type: String, enum: ["", "Savings", "Current"], default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      ifscCode: { type: String, trim: true, default: "" },
      upiId: { type: String, trim: true, default: "" },
      qrCodeImageUrl: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
