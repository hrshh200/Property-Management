const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "..", "uploads", "maintenance");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `maintenance-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (_, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

const uploadMaintenancePhotos = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});

const complianceDir = path.join(__dirname, "..", "uploads", "compliance");
fs.mkdirSync(complianceDir, { recursive: true });

const complianceStorage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, complianceDir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `compliance-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const complianceFilter = (_, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, PNG, and WEBP files are allowed."));
  }
};

const uploadComplianceDocument = multer({
  storage: complianceStorage,
  fileFilter: complianceFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

const paymentDir = path.join(__dirname, "..", "uploads", "payment");
fs.mkdirSync(paymentDir, { recursive: true });

const paymentStorage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, paymentDir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `payment-qr-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const paymentFilter = (_, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

const uploadPaymentQrCode = multer({
  storage: paymentStorage,
  fileFilter: paymentFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  uploadMaintenancePhotos,
  uploadComplianceDocument,
  uploadPaymentQrCode,
};
