const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "tenant"], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "rent",
        "maintenance",
        "moveout",
        "renewal",
        "compliance",
        "system",
      ],
      default: "system",
    },
    actionPath: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
