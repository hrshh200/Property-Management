const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Property = require("../models/Property");
const Lease = require("../models/Lease");
const RentPayment = require("../models/RentPayment");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Vendor = require("../models/Vendor");
const MoveOutRequest = require("../models/MoveOutRequest");
const ComplianceDocument = require("../models/ComplianceDocument");
const LeaseRenewal = require("../models/LeaseRenewal");
const PropertyInquiry = require("../models/PropertyInquiry");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const PropertyReview = require("../models/PropertyReview");
const VendorLead = require("../models/VendorLead");
const PDFDocument = require("pdfkit");
const { StatusCodes } = require("http-status-codes");
const { sendEventEmail } = require("../services/emailService");

const toObjectId = (id) => mongoose.Types.ObjectId.createFromHexString(id);

const parseMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Number(num.toFixed(2));
};

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const csvEscape = (value) => {
  if (value === undefined || value === null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
};

const createNotification = async ({ recipient, role, title, message, type = "system", actionPath, metadata, senderName }) => {
  try {
    await Notification.create({ recipient, role, title, message, type, actionPath, metadata, senderName });
  } catch (_) {
    // Non-blocking side effect
  }
};

const sendMailEvent = async (payload) => {
  try {
    await sendEventEmail(payload);
  } catch (_) {
    // Non-blocking side effect
  }
};

const DEFAULT_VENDOR_PASSWORD = String(process.env.VENDOR_DEFAULT_PASSWORD || "Vendor@123");

const splitHumanName = (input = "") => {
  const parts = String(input || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = parts[0] || "Vendor";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "Partner";
  const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
  return {
    firstName,
    middleName,
    lastName,
    fullName: [firstName, middleName, lastName].filter(Boolean).join(" "),
  };
};

const ensureVendorPortalAccount = async ({ vendor, preferredName = "" }) => {
  if (!vendor) return { created: false, linked: false };
  if (vendor.userId) return { created: false, linked: true };

  const normalizedEmail = String(vendor.email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return { created: false, linked: false, reason: "Vendor email is missing." };
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.role !== "vendor") {
      return {
        created: false,
        linked: false,
        reason: "Email already belongs to a non-vendor account.",
      };
    }
    vendor.userId = existingUser._id;
    vendor.isActive = true;
    await vendor.save();
    return { created: false, linked: true, existingUserLinked: true };
  }

  const nameBits = splitHumanName(preferredName || vendor.name || "Vendor Partner");
  const phoneDigits = String(vendor.phone || "")
    .replace(/\D/g, "")
    .slice(-15);

  const createdUser = await User.create({
    firstName: nameBits.firstName,
    middleName: nameBits.middleName,
    lastName: nameBits.lastName,
    name: nameBits.fullName,
    email: normalizedEmail,
    password: DEFAULT_VENDOR_PASSWORD,
    phone: phoneDigits || "0000000000",
    role: "vendor",
    isActive: true,
  });

  vendor.userId = createdUser._id;
  vendor.email = normalizedEmail;
  vendor.isActive = true;
  await vendor.save();

  await sendMailEvent({
    to: normalizedEmail,
    subject: "Your Vendor Portal account is ready",
    heading: "Vendor account provisioned",
    lead: "Your vendor request has been approved and your portal login is active.",
    highlights: [
      `Login Email: ${normalizedEmail}`,
      `Default Password: ${DEFAULT_VENDOR_PASSWORD}`,
      "Please log in and change your password from Vendor Dashboard profile section.",
    ],
    actionPath: "/login",
    accent: "#0d9488",
  });

  return {
    created: true,
    linked: true,
    credentials: {
      email: normalizedEmail,
      defaultPassword: DEFAULT_VENDOR_PASSWORD,
    },
  };
};

const calculateSlaDueAt = (urgency) => {
  const now = new Date();
  const hourMap = { Low: 72, Medium: 48, High: 24, Emergency: 8 };
  const hours = hourMap[urgency] || 48;
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
};

const startOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeGraceDays = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, 31);
};

const sanitizePaymentInstructions = (input = {}) => {
  const value = input && typeof input === "object" ? input : {};
  return {
    accountHolderName: (value.accountHolderName || "").trim(),
    bankName: (value.bankName || "").trim(),
    accountNumber: (value.accountNumber || "").trim(),
    ifscCode: (value.ifscCode || "").trim().toUpperCase(),
    upiId: (value.upiId || "").trim(),
    qrCodeImageUrl: (value.qrCodeImageUrl || "").trim(),
  };
};

const hasPaymentInstructions = (instructions = {}) => {
  return Boolean(
    instructions.accountHolderName ||
      instructions.bankName ||
      instructions.accountNumber ||
      instructions.ifscCode ||
      instructions.upiId ||
      instructions.qrCodeImageUrl
  );
};

const getMissingVendorMaintenanceExpenses = async ({ ownerOid, fyStart, fyEnd }) => {
  const paidRequests = await MaintenanceRequest.find({
    owner: ownerOid,
    "vendorPaymentRequest.status": "Paid",
    $or: [
      { "vendorPaymentRequest.paidAt": { $gte: fyStart, $lte: fyEnd } },
      {
        $and: [
          {
            $or: [
              { "vendorPaymentRequest.paidAt": { $exists: false } },
              { "vendorPaymentRequest.paidAt": null },
            ],
          },
          { updatedAt: { $gte: fyStart, $lte: fyEnd } },
        ],
      },
    ],
  }).select("_id property category vendorQuote vendorPaymentRequest updatedAt");

  if (!paidRequests.length) {
    return { total: 0, monthlyRows: [], categoryRows: [], entries: [] };
  }

  const requestIds = paidRequests.map((req) => req._id);
  const linkedExpenses = await Expense.find({
    owner: ownerOid,
    maintenanceRequest: { $in: requestIds },
  }).select("maintenanceRequest");

  const linkedRequestSet = new Set(linkedExpenses.map((row) => String(row.maintenanceRequest)));
  const fallbackEntries = [];
  const monthlyMap = {};
  let total = 0;

  for (const request of paidRequests) {
    if (linkedRequestSet.has(String(request._id))) continue;

    const amount = parseMoney(request.vendorPaymentRequest?.amount || request.vendorQuote?.amount || 0);
    if (amount <= 0) continue;

    const paidAt = request.vendorPaymentRequest?.paidAt
      ? new Date(request.vendorPaymentRequest.paidAt)
      : new Date(request.updatedAt);
    if (Number.isNaN(paidAt.getTime())) continue;

    total += amount;
    const month = paidAt.getMonth() + 1;
    const year = paidAt.getFullYear();
    const key = `${year}-${month}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + amount;

    fallbackEntries.push({
      maintenanceRequest: request._id,
      property: request.property,
      category: "Maintenance",
      title: `Vendor maintenance - ${request.category}`,
      amount,
      date: paidAt,
      notes: "Derived from paid vendor maintenance request (fallback accounting).",
      source: "vendor-maintenance",
    });
  }

  const monthlyRows = Object.entries(monthlyMap)
    .map(([key, amount]) => {
      const [year, month] = key.split("-").map(Number);
      return { _id: { month, year }, total: amount };
    })
    .sort((a, b) => (a._id.year - b._id.year) || (a._id.month - b._id.month));

  const categoryRows = total > 0 ? [{ _id: "Maintenance", total }] : [];
  return { total, monthlyRows, categoryRows, entries: fallbackEntries };
};

const mergeAggregateRows = (baseRows = [], addonRows = []) => {
  const merged = {};

  for (const row of baseRows) {
    const key = `${row._id.year}-${row._id.month}`;
    merged[key] = (merged[key] || 0) + Number(row.total || 0);
  }
  for (const row of addonRows) {
    const key = `${row._id.year}-${row._id.month}`;
    merged[key] = (merged[key] || 0) + Number(row.total || 0);
  }

  return Object.entries(merged)
    .map(([key, total]) => {
      const [year, month] = key.split("-").map(Number);
      return { _id: { month, year }, total };
    })
    .sort((a, b) => (a._id.year - b._id.year) || (a._id.month - b._id.month));
};

const mergeCategoryRows = (baseRows = [], addonRows = []) => {
  const merged = {};
  for (const row of baseRows) {
    merged[row._id] = (merged[row._id] || 0) + Number(row.total || 0);
  }
  for (const row of addonRows) {
    merged[row._id] = (merged[row._id] || 0) + Number(row.total || 0);
  }

  return Object.entries(merged)
    .map(([category, total]) => ({ _id: category, total }))
    .sort((a, b) => b.total - a.total);
};

const validateOwnerPaymentDetails = (details = {}) => {
  const {
    accountHolderName = "",
    bankName = "",
    accountType = "",
    accountNumber = "",
    ifscCode = "",
    upiId = "",
    qrCodeImageUrl = "",
  } = details;

  const hasAny = Boolean(accountHolderName || bankName || accountType || accountNumber || ifscCode || upiId || qrCodeImageUrl);
  if (!hasAny) {
    return { valid: false, message: "Please add at least one payment method (bank account, UPI ID, or QR code URL)." };
  }

  const hasAnyBankField = Boolean(accountHolderName || bankName || accountType || accountNumber || ifscCode);
  const hasAllBankFields = Boolean(accountHolderName && bankName && accountType && accountNumber && ifscCode);
  if (hasAnyBankField && !hasAllBankFields) {
    return {
      valid: false,
      message: "For bank transfer, account holder name, bank name, account type, account number, and IFSC code are all required.",
    };
  }

  if (accountType && !["Savings", "Current"].includes(accountType)) {
    return { valid: false, message: "Account type must be Savings or Current." };
  }

  if (accountNumber && !/^\d{8,20}$/.test(accountNumber)) {
    return { valid: false, message: "Account number must be 8 to 20 digits." };
  }

  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    return { valid: false, message: "Please enter a valid IFSC code." };
  }

  if (upiId && !/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test(upiId)) {
    return { valid: false, message: "Please enter a valid UPI ID." };
  }

  if (qrCodeImageUrl) {
    const isLocalUploadPath = qrCodeImageUrl.startsWith("/uploads/");
    if (!isLocalUploadPath) {
      try {
        const parsed = new URL(qrCodeImageUrl);
        if (!/^https?:$/.test(parsed.protocol)) {
          return { valid: false, message: "QR code URL must start with http:// or https://." };
        }
      } catch {
        return { valid: false, message: "Please enter a valid QR code image URL." };
      }
    }
  }

  return { valid: true };
};

// ─────────────────────────────────────────────
//  OWNER – PAYMENT DETAILS (bank/UPI/QR)
// ─────────────────────────────────────────────

const getOwnerPaymentDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("paymentDetails");
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    res.status(StatusCodes.OK).json({ paymentDetails: user.paymentDetails || {} });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateOwnerPaymentDetails = async (req, res) => {
  try {
    const { accountHolderName, bankName, accountType, accountNumber, ifscCode, upiId, qrCodeImageUrl } = req.body;
    const paymentDetails = {
      accountHolderName: (accountHolderName || "").trim(),
      bankName: (bankName || "").trim(),
      accountType: ["Savings", "Current"].includes(accountType) ? accountType : "",
      accountNumber: (accountNumber || "").trim(),
      ifscCode: (ifscCode || "").trim().toUpperCase(),
      upiId: (upiId || "").trim(),
      qrCodeImageUrl: (qrCodeImageUrl || "").trim(),
    };

    const validation = validateOwnerPaymentDetails(paymentDetails);
    if (!validation.valid) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: validation.message });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { paymentDetails },
      { new: true }
    ).select("paymentDetails");
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    res.status(StatusCodes.OK).json({ message: "Payment details saved.", paymentDetails: user.paymentDetails });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const deleteOwnerPaymentDetails = async (req, res) => {
  try {
    const clearedPaymentDetails = {
      accountHolderName: "",
      bankName: "",
      accountType: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
      qrCodeImageUrl: "",
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { paymentDetails: clearedPaymentDetails },
      { new: true }
    ).select("paymentDetails");

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    }

    return res.status(StatusCodes.OK).json({
      message: "Payment details deleted successfully.",
      paymentDetails: user.paymentDetails,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const uploadOwnerPaymentQrCode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please upload a QR image file." });
    }

    const relativePath = `/uploads/payment/${path.basename(req.file.filename)}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { "paymentDetails.qrCodeImageUrl": absoluteUrl },
      { new: true }
    ).select("paymentDetails");

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    }

    return res.status(StatusCodes.OK).json({
      message: "QR code uploaded successfully.",
      qrCodeImageUrl: user.paymentDetails?.qrCodeImageUrl || absoluteUrl,
      paymentDetails: user.paymentDetails,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  TENANT – FETCH OWNER PAYMENT DETAILS
// ─────────────────────────────────────────────

const getTenantOwnerPaymentDetails = async (req, res) => {
  try {
    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true }).populate("owner", "paymentDetails name");
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "No active lease found." });
    res.status(StatusCodes.OK).json({ paymentDetails: lease.owner?.paymentDetails || {}, ownerName: lease.owner?.name || "" });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};


// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────

const signUp = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      name,
      email,
      password,
      confirmPassword,
      countryCode,
      phone,
      role,
    } = req.body;

    const normalizedFirst = (firstName || "").trim();
    const normalizedMiddle = (middleName || "").trim();
    const normalizedLast = (lastName || "").trim();
    const normalizedName = [normalizedFirst, normalizedMiddle, normalizedLast].filter(Boolean).join(" ") || (name || "").trim();
    const normalizedCountryCode = ((countryCode || "+91") + "").trim();
    const normalizedPhoneDigits = (phone || "").toString().replace(/\D/g, "");

    if (!normalizedName || !email || !password || !role || !normalizedPhoneDigits) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All fields are required." });
    }
    if (!normalizedFirst || !normalizedLast) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "First name and last name are required." });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password and confirm password must match." });
    }
    if (normalizedPhoneDigits.length < 6 || normalizedPhoneDigits.length > 15) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please enter a valid mobile number." });
    }
    if (!["owner", "tenant"].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Role must be owner or tenant." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Email already registered." });
    }
    const user = await User.create({
      firstName: normalizedFirst,
      middleName: normalizedMiddle,
      lastName: normalizedLast,
      name: normalizedName,
      email,
      password,
      countryCode: normalizedCountryCode,
      phone: `${normalizedCountryCode}${normalizedPhoneDigits}`,
      role,
    });

    await sendMailEvent({
      to: user.email,
      subject: `Welcome to PropManager (${role === "owner" ? "Owner" : "Tenant"} account)` ,
      recipientName: user.firstName || user.name,
      heading: "Your account is ready",
      lead: "Thanks for signing up with PropManager. Your portal is now active and ready to use.",
      highlights: [
        `Role: ${role === "owner" ? "Property Owner" : "Tenant"}`,
        `Email: ${user.email}`,
        "You can now access dashboard, notifications and activity tracking.",
      ],
      actionLabel: "Open Dashboard",
      actionPath: role === "owner" ? "/owner/dashboard" : "/tenant/dashboard",
      accent: role === "owner" ? "#4f46e5" : "#0d9488",
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.status(StatusCodes.CREATED).json({
      message: "Registration successful.",
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        countryCode: user.countryCode,
        phone: user.phone,
        profilePictureUrl: user.profilePictureUrl || "",
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    if (!email || !newPassword || !confirmPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email, new password and confirm password are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password and confirm password must match." });
    }
    if (newPassword.length < 6) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "No account found with this email." });
    }

    user.password = newPassword;
    await user.save();

    res.status(StatusCodes.OK).json({ message: "Password reset successful. Please login with your new password." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email and password are required." });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const adminEmail = String(process.env.ADMIN_LOGIN_EMAIL || "admin@admin.com").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_LOGIN_PASSWORD || "admin");

    // Special admin login path requested for direct admin dashboard access.
    if (normalizedEmail === adminEmail && password === adminPassword) {
      const token = jwt.sign(
        { userId: "admin-root", role: "admin", name: "System Admin", email: adminEmail },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      return res.status(StatusCodes.OK).json({
        message: "Admin login successful.",
        token,
        user: {
          _id: "admin-root",
          name: "System Admin",
          email: adminEmail,
          role: "admin",
          phone: "",
          profilePictureUrl: "",
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials." });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials." });
    }
    if (!user.isActive) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Account is deactivated." });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.status(StatusCodes.OK).json({
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profilePictureUrl: user.profilePictureUrl || "",
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};



const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    res.status(StatusCodes.OK).json({ user });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      name,
      email,
      countryCode,
      phone,
      password,
      confirmPassword,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });

    const normalizedFirst = (firstName || user.firstName || "").trim();
    const normalizedMiddle = (middleName !== undefined ? middleName : user.middleName || "").trim();
    const normalizedLast = (lastName || user.lastName || "").trim();
    const normalizedName = [normalizedFirst, normalizedMiddle, normalizedLast].filter(Boolean).join(" ") || (name || user.name || "").trim();
    const normalizedEmail = (email || user.email || "").toLowerCase().trim();
    const normalizedCountryCode = ((countryCode || user.countryCode || "+91") + "").trim();
    const normalizedPhoneDigits = (phone || user.phone || "").toString().replace(/\D/g, "");

    if (!normalizedName || !normalizedEmail || !normalizedFirst || !normalizedLast || !normalizedPhoneDigits) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "First name, last name, email and phone are required." });
    }

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.userId } });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Email already in use by another account." });
    }

    user.firstName = normalizedFirst;
    user.middleName = normalizedMiddle;
    user.lastName = normalizedLast;
    user.name = normalizedName;
    user.email = normalizedEmail;
    user.countryCode = normalizedCountryCode;
    user.phone = `${normalizedCountryCode}${normalizedPhoneDigits}`;

    if (password || confirmPassword) {
      if (!password || !confirmPassword) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Both password and confirm password are required to update password." });
      }
      if (password !== confirmPassword) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password and confirm password must match." });
      }
      if (password.length < 6) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Password must be at least 6 characters." });
      }
      user.password = password;
    }

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(StatusCodes.OK).json({ message: "Profile updated.", user: safeUser });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please upload an image file." });
    }

    const relativePath = `/uploads/profile/${path.basename(req.file.filename)}`;
    const absoluteUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { profilePictureUrl: absoluteUrl },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    }

    return res.status(StatusCodes.OK).json({
      message: "Profile picture uploaded successfully.",
      profilePictureUrl: user.profilePictureUrl,
      user,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – PROPERTY MANAGEMENT
// ─────────────────────────────────────────────

const addProperty = async (req, res) => {
  try {
    const { propertyType, address, description, numberOfRooms } = req.body;
    if (!propertyType || !address || !address.street || !address.city || !address.state) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Property type and address are required." });
    }
    const property = await Property.create({
      owner: req.user.userId,
      propertyType,
      address,
      description,
      numberOfRooms,
    });
    res.status(StatusCodes.CREATED).json({ message: "Property added.", property });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.userId, isActive: true })
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ properties });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getPublicProperties = async (req, res) => {
  try {
    const { city, propertyType } = req.query;
    const query = { isActive: true };

    if (city) {
      query["address.city"] = { $regex: String(city).trim(), $options: "i" };
    }
    if (propertyType) {
      query.propertyType = propertyType;
    }

    const properties = await Property.find(query)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ properties });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    res.status(StatusCodes.OK).json({ property });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { propertyType, address, description, numberOfRooms } = req.body;
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { propertyType, address, description, numberOfRooms },
      { new: true, runValidators: true }
    );
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    res.status(StatusCodes.OK).json({ message: "Property updated.", property });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const uploadPropertyPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "At least one photo is required." });
    }

    const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId, isActive: true });
    if (!property) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    }

    const uploadedPaths = req.files.map((file) => `/uploads/properties/${path.basename(file.filename)}`);
    property.photoUrls = [...(property.photoUrls || []), ...uploadedPaths];
    await property.save();

    return res.status(StatusCodes.OK).json({
      message: "Property photos uploaded.",
      photoUrls: property.photoUrls,
      property,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const removePropertyPhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "photoUrl is required." });
    }

    const property = await Property.findOne({ _id: req.params.id, owner: req.user.userId, isActive: true });
    if (!property) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    }

    const exists = (property.photoUrls || []).includes(photoUrl);
    if (!exists) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Photo not found on this property." });
    }

    property.photoUrls = (property.photoUrls || []).filter((url) => url !== photoUrl);
    await property.save();

    if (photoUrl.startsWith("/uploads/")) {
      const absolutePath = path.join(__dirname, "..", photoUrl);
      fs.unlink(absolutePath, () => {});
    }

    return res.status(StatusCodes.OK).json({
      message: "Property photo removed.",
      photoUrls: property.photoUrls,
      property,
    });
  } catch (err) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { isActive: false },
      { new: true }
    );
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    res.status(StatusCodes.OK).json({ message: "Property deleted." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – TENANT MANAGEMENT
// ─────────────────────────────────────────────

const getTenantUsers = async (req, res) => {
  try {
    const tenants = await User.find({ role: "tenant", isActive: true }).select("-password");
    res.status(StatusCodes.OK).json({ tenants });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const assignTenant = async (req, res) => {
  try {
    const {
      propertyId,
      tenantId,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      securityDeposit,
      rentDueDay,
      graceDays,
      lateFeeType,
      lateFeeValue,
    } = req.body;
    if (!propertyId || !tenantId || !leaseStartDate || !leaseEndDate || !rentAmount) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All lease fields are required." });
    }
    const property = await Property.findOne({ _id: propertyId, owner: req.user.userId });
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });

    const tenant = await User.findOne({ _id: tenantId, role: "tenant" });
    if (!tenant) return res.status(StatusCodes.NOT_FOUND).json({ message: "Tenant not found." });

    // Deactivate existing active lease for this property
    await Lease.updateMany({ property: propertyId, isActive: true }, { isActive: false });

    const lease = await Lease.create({
      property: propertyId,
      tenant: tenantId,
      owner: req.user.userId,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      securityDeposit: securityDeposit || 0,
      rentDueDay: rentDueDay || 1,
      graceDays: normalizeGraceDays(graceDays),
      lateFeeType: ["fixed", "percent"].includes(lateFeeType) ? lateFeeType : "fixed",
      lateFeeValue: Number(lateFeeValue || 0),
    });

    // Mark property as occupied
    await Property.findByIdAndUpdate(propertyId, { status: "Occupied" });

    res.status(StatusCodes.CREATED).json({ message: "Tenant assigned successfully.", lease });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerLeases = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = { owner: req.user.userId };
    if (includeInactive !== "true") {
      filter.isActive = true;
    }

    const leases = await Lease.find(filter)
      .populate("property", "propertyType address status")
      .populate("tenant", "name email phone")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ leases });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateLease = async (req, res) => {
  try {
    const {
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      securityDeposit,
      rentDueDay,
      graceDays,
      lateFeeType,
      lateFeeValue,
    } = req.body;
    const lease = await Lease.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      {
        leaseStartDate,
        leaseEndDate,
        rentAmount,
        securityDeposit,
        rentDueDay,
        graceDays: normalizeGraceDays(graceDays),
        lateFeeType: ["fixed", "percent"].includes(lateFeeType) ? lateFeeType : "fixed",
        lateFeeValue: Number(lateFeeValue || 0),
      },
      { new: true, runValidators: true }
    ).populate("property tenant");
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "Lease not found." });
    res.status(StatusCodes.OK).json({ message: "Lease updated.", lease });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const terminateLease = async (req, res) => {
  try {
    const lease = await Lease.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { isActive: false },
      { new: true }
    );
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "Lease not found." });
    // Mark property as vacant
    await Property.findByIdAndUpdate(lease.property, { status: "Vacant" });
    res.status(StatusCodes.OK).json({ message: "Lease terminated. Property marked as vacant." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – RENT MANAGEMENT
// ─────────────────────────────────────────────

const generateRentRecord = async (req, res) => {
  try {
    const { leaseId, month, year, dueDate, notes, paymentInstructions } = req.body;
    if (!leaseId || !month || !year || !dueDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "leaseId, month, year, and dueDate are required." });
    }
    const lease = await Lease.findOne({ _id: leaseId, owner: req.user.userId, isActive: true })
      .populate("tenant", "name email")
      .populate("property", "propertyType address");
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "Active lease not found." });

    const existing = await RentPayment.findOne({ lease: leaseId, month, year });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Rent record already exists for this month/year." });
    }

    const normalizedPaymentInstructions = sanitizePaymentInstructions(paymentInstructions);

    const rent = await RentPayment.create({
      lease: leaseId,
      property: lease.property,
      tenant: lease.tenant,
      owner: req.user.userId,
      amount: lease.rentAmount,
      lateFeeAmount: 0,
      totalAmount: lease.rentAmount,
      dueDate,
      month,
      year,
      notes,
      paymentInstructions: normalizedPaymentInstructions,
    });

    await sendMailEvent({
      to: lease.tenant?.email,
      subject: `Rent due reminder: ${month} ${year}`,
      recipientName: lease.tenant?.name,
      heading: "New rent due has been generated",
      lead: "A new rent record has been created for your lease.",
      highlights: [
        `Property: ${lease.property?.propertyType || "Property"} (${lease.property?.address?.city || "N/A"})`,
        `Amount due: ${formatCurrency(lease.rentAmount)}`,
        `Due date: ${new Date(dueDate).toLocaleDateString()}`,
        hasPaymentInstructions(normalizedPaymentInstructions)
          ? "Payment instructions and QR details are available in your rent timeline."
          : "Contact your owner for payment instructions if needed.",
      ],
      actionLabel: "View Rent Timeline",
      actionPath: "/tenant/rent",
      accent: "#0284c7",
    });

    res.status(StatusCodes.CREATED).json({ message: "Rent record created.", rent });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerRentPayments = async (req, res) => {
  try {
    const { propertyId, status } = req.query;
    const filter = { owner: req.user.userId };
    if (propertyId) filter.property = propertyId;
    if (status) filter.status = status;
    const rents = await RentPayment.find(filter)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .sort({ year: -1, month: -1 });
    res.status(StatusCodes.OK).json({ rents });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateRentPaymentInstructions = async (req, res) => {
  try {
    const paymentInstructions = sanitizePaymentInstructions(req.body.paymentInstructions);
    const rent = await RentPayment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { paymentInstructions },
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email");

    if (!rent) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });

    await createNotification({
      recipient: rent.tenant?._id,
      role: "tenant",
      title: "Rent payment details updated",
      message: `Payment details for ${rent.month} ${rent.year} are available for review.`,
      type: "rent",
      actionPath: "/tenant/rent",
      metadata: { rentId: rent._id },
    });

    res.status(StatusCodes.OK).json({ message: "Payment details updated.", rent });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const submitTenantRentPayment = async (req, res) => {
  try {
    const { transactionId, paidDate, notes } = req.body;
    if (!transactionId || !String(transactionId).trim()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Transaction ID is required." });
    }

    const rentRecord = await RentPayment.findOne({ _id: req.params.id, tenant: req.user.userId })
      .populate("owner", "name email")
      .populate("tenant", "name email");

    if (!rentRecord) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });
    if (rentRecord.status === "Paid") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Rent is already marked as paid." });
    }

    const safePaidDate = paidDate ? new Date(paidDate) : new Date();
    if (Number.isNaN(safePaidDate.getTime())) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid paidDate." });
    }

    rentRecord.paymentSubmission = {
      status: "Submitted",
      transactionId: String(transactionId).trim(),
      paidAt: safePaidDate,
      submittedAt: new Date(),
      notes: (notes || "").trim(),
    };
    await rentRecord.save();

    await createNotification({
      recipient: rentRecord.owner?._id,
      role: "owner",
      title: "Tenant submitted rent payment",
      message: `${rentRecord.tenant?.name || "Tenant"} submitted payment reference for ${rentRecord.month} ${rentRecord.year}.`,
      type: "rent",
      actionPath: "/owner/rent",
      senderName: rentRecord.tenant?.name || "Tenant",
      metadata: { rentId: rentRecord._id, transactionId: rentRecord.paymentSubmission.transactionId },
    });

    await sendMailEvent({
      to: rentRecord.owner?.email,
      subject: `Payment submitted by tenant: ${rentRecord.month} ${rentRecord.year}`,
      recipientName: rentRecord.owner?.name,
      heading: "Tenant submitted payment details",
      lead: "Please verify the payment and mark rent as paid once received.",
      highlights: [
        `Tenant: ${rentRecord.tenant?.name || "Tenant"}`,
        `Transaction ID: ${rentRecord.paymentSubmission.transactionId}`,
        `Paid date: ${safePaidDate.toLocaleDateString()}`,
      ],
      actionLabel: "Review Rent Entry",
      actionPath: "/owner/rent",
      accent: "#0284c7",
    });

    const rent = await RentPayment.findById(rentRecord._id).populate("property", "propertyType address");
    res.status(StatusCodes.OK).json({ message: "Payment submitted successfully. Waiting for owner confirmation.", rent });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const markRentPaid = async (req, res) => {
  try {
    const { paidDate, notes, transactionId } = req.body;

    const rentRecord = await RentPayment.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!rentRecord) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });

    const receiptNumber = rentRecord.receiptNumber || `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = Number((Number(rentRecord.amount || 0) + Number(rentRecord.lateFeeAmount || 0)).toFixed(2));

    const resolvedPaidDate = paidDate || rentRecord.paymentSubmission?.paidAt || new Date();
    const resolvedTransactionId = (transactionId || rentRecord.paymentSubmission?.transactionId || "").trim();

    const rent = await RentPayment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      {
        status: "Paid",
        paidDate: resolvedPaidDate,
        notes,
        receiptNumber,
        totalAmount,
        paymentSubmission: {
          status: "Verified",
          transactionId: resolvedTransactionId,
          paidAt: resolvedPaidDate,
          submittedAt: rentRecord.paymentSubmission?.submittedAt || new Date(),
          notes: rentRecord.paymentSubmission?.notes || "",
        },
      },
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email");

    await createNotification({
      recipient: rent.tenant?._id,
      role: "tenant",
      title: "Rent payment recorded",
      message: `Your ${rent.month} ${rent.year} rent has been marked paid.`,
      type: "rent",
      actionPath: "/tenant/rent",
      metadata: { rentId: rent._id, receiptNumber },
    });

    await sendMailEvent({
      to: rent.tenant?.email,
      subject: `Payment received: ${rent.month} ${rent.year}`,
      recipientName: rent.tenant?.name,
      heading: "Your rent payment is confirmed",
      lead: "Your owner marked the rent payment as paid.",
      highlights: [
        `Month: ${rent.month} ${rent.year}`,
        `Receipt: ${receiptNumber}`,
        `Total paid: ${formatCurrency(totalAmount)}`,
        resolvedTransactionId ? `Transaction ID: ${resolvedTransactionId}` : "Transaction ID: Not provided",
      ],
      actionLabel: "Download Receipt",
      actionPath: "/tenant/rent",
      accent: "#16a34a",
    });

    res.status(StatusCodes.OK).json({ message: "Rent marked as paid.", rent });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const markRentOverdue = async (req, res) => {
  try {
    const records = await RentPayment.find({ owner: req.user.userId, status: "Pending", dueDate: { $lt: new Date() } })
      .populate("lease")
      .populate("tenant", "name email")
      .populate("property", "propertyType address");
    const today = startOfDay(new Date());
    let modifiedCount = 0;

    for (const record of records) {
      const dueDate = startOfDay(record.dueDate);
      if (!today || !dueDate) continue;

      const graceDays = normalizeGraceDays(record.lease?.graceDays || 0);
      const overdueStartsOn = new Date(dueDate);
      overdueStartsOn.setDate(overdueStartsOn.getDate() + graceDays + 1);

      // Apply overdue only after the due date + grace day window is fully crossed.
      if (today < overdueStartsOn) continue;

      const lateType = record.lease?.lateFeeType || "fixed";
      const lateValue = Number(record.lease?.lateFeeValue || 0);
      const lateFeeAmount = lateType === "percent" ? Number(((record.amount * lateValue) / 100).toFixed(2)) : lateValue;

      record.status = "Overdue";
      record.lateFeeAmount = lateFeeAmount;
      record.totalAmount = Number((Number(record.amount || 0) + lateFeeAmount).toFixed(2));
      await record.save();
      modifiedCount += 1;

      await createNotification({
        recipient: record.tenant,
        role: "tenant",
        title: "Rent marked overdue",
        message: `${record.month} ${record.year} rent is overdue. Late fee applied: INR ${Number(lateFeeAmount).toFixed(2)}.`,
        type: "rent",
        actionPath: "/tenant/rent",
        metadata: { rentId: record._id },
      });

      await sendMailEvent({
        to: record.tenant?.email,
        subject: `Rent overdue: ${record.month} ${record.year}`,
        recipientName: record.tenant?.name,
        heading: "Rent record moved to overdue",
        lead: "Your due date has passed and a late fee was applied as per lease terms.",
        highlights: [
          `Property: ${record.property?.propertyType || "Property"} (${record.property?.address?.city || "N/A"})`,
          `Late fee applied: ${formatCurrency(lateFeeAmount)}`,
          `Total now due: ${formatCurrency(record.totalAmount)}`,
        ],
        actionLabel: "Check Rent Status",
        actionPath: "/tenant/rent",
        accent: "#dc2626",
      });
    }

    res.status(StatusCodes.OK).json({ message: `${modifiedCount} rent record(s) marked overdue with late fee applied.` });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – VACANCY MANAGEMENT
// ─────────────────────────────────────────────

const getVacantProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.userId, status: "Vacant", isActive: true });
    res.status(StatusCodes.OK).json({ properties });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updatePropertyStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Vacant", "Occupied"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Status must be Vacant or Occupied." });
    }
    const property = await Property.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { status },
      { new: true }
    );
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    res.status(StatusCodes.OK).json({ message: "Property status updated.", property });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – MAINTENANCE REQUESTS
// ─────────────────────────────────────────────

const getOwnerMaintenanceRequests = async (req, res) => {
  try {
    const { status, propertyId, escalated } = req.query;

    await MaintenanceRequest.updateMany(
      {
        owner: req.user.userId,
        status: { $in: ["Open", "In Progress"] },
        slaDueAt: { $lt: new Date() },
        escalated: false,
      },
      { escalated: true }
    );

    const filter = { owner: req.user.userId };
    if (status) filter.status = status;
    if (propertyId) filter.property = propertyId;
    if (escalated === "true") filter.escalated = true;
    const requests = await MaintenanceRequest.find(filter)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("assignedVendor", "name phone email specializations city")
      .populate("comments.addedBy", "name role")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ requests });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateMaintenanceStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;
    if (!["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid status." });
    }
    const update = { status };
    if (status === "Resolved") {
      update.escalated = false;
    }
    if (comment) {
      update.$push = { comments: { text: comment, addedBy: req.user.userId } };
    }
    const request = await MaintenanceRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      update,
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email")
      .populate("comments.addedBy", "name role");
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Request not found." });

    await createNotification({
      recipient: request.tenant?._id,
      role: "tenant",
      title: "Maintenance status updated",
      message: `${request.category} request is now ${request.status}.`,
      type: "maintenance",
      actionPath: "/tenant/maintenance",
      metadata: { requestId: request._id },
    });

    await sendMailEvent({
      to: request.tenant?.email,
      subject: `Maintenance update: ${request.category}`,
      recipientName: request.tenant?.name,
      heading: "Your maintenance request has a new status",
      lead: "An update has been posted on your maintenance ticket.",
      highlights: [
        `Category: ${request.category}`,
        `Current status: ${request.status}`,
        comment ? `Owner note: ${comment}` : null,
      ],
      actionLabel: "Open Request",
      actionPath: "/tenant/maintenance",
      accent: "#0ea5e9",
    });

    res.status(StatusCodes.OK).json({ message: "Status updated.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const addCommentToRequest = async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Comment text required." });
    const request = await MaintenanceRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { $push: { comments: { text: comment, addedBy: req.user.userId } } },
      { new: true }
    ).populate("comments.addedBy", "name role");
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Request not found." });
    res.status(StatusCodes.OK).json({ message: "Comment added.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – VENDORS
// ─────────────────────────────────────────────

const APP_VENDOR_DIRECTORY = [
  {
    name: "SparkLine Electricals",
    phone: "+91 98765 11001",
    email: "dispatch@sparklineelectricals.in",
    specializations: ["Electric"],
    city: "Ahmedabad",
    notes: "24/7 emergency response for wiring and meter issues.",
  },
  {
    name: "FlowFast Plumbing Co.",
    phone: "+91 98765 22002",
    email: "support@flowfastplumbing.in",
    specializations: ["Plumbing"],
    city: "Ahmedabad",
    notes: "Leak repair, pipe replacement, drainage and fittings.",
  },
  {
    name: "UrbanFix Carpentry",
    phone: "+91 98765 33003",
    email: "care@urbanfixcarpentry.in",
    specializations: ["Carpentry", "General"],
    city: "Ahmedabad",
    notes: "Door, cabinet, and furniture repair specialists.",
  },
  {
    name: "PrimeCoat Painters",
    phone: "+91 98765 44004",
    email: "bookings@primecoat.in",
    specializations: ["Painting"],
    city: "Ahmedabad",
    notes: "Interior and exterior paint work with quick turnaround.",
  },
  {
    name: "RapidCare Facility Services",
    phone: "+91 98765 55005",
    email: "ops@rapidcarefacility.in",
    specializations: ["General", "Other"],
    city: "Ahmedabad",
    notes: "General handyman and mixed maintenance support.",
  },
];

const ensureAppVendorDirectory = async () => {
  const existingCount = await Vendor.countDocuments({ managedByApp: true, isActive: true });
  if (existingCount > 0) return;

  await Vendor.insertMany(
    APP_VENDOR_DIRECTORY.map((v) => ({
      ...v,
      managedByApp: true,
      source: "app-directory",
      isActive: true,
    }))
  );
};

// ─────────────────────────────────────────────
//  PUBLIC – VENDOR MARKETING LEADS
// ─────────────────────────────────────────────

const submitVendorLead = async (req, res) => {
  try {
    const { companyName, contactName, email, phone, city, specializations, message } = req.body;
    if (!companyName || !contactName || !email || !phone) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Company name, contact name, email, and phone are required.",
      });
    }

    const normalizedSpecializations = Array.isArray(specializations)
      ? specializations.filter(Boolean)
      : [];

    const lead = await VendorLead.create({
      companyName,
      contactName,
      email,
      phone,
      city: city || "",
      specializations: normalizedSpecializations,
      message: message || "",
      status: "New",
    });

    res.status(StatusCodes.CREATED).json({
      message: "Thanks! Your details were submitted. Our team will contact you soon.",
      lead,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerVendors = async (req, res) => {
  try {
    await ensureAppVendorDirectory();
    const vendors = await Vendor.find({ managedByApp: true, isActive: true }).sort({ name: 1 });
    res.status(StatusCodes.OK).json({ vendors });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const assignVendorToMaintenanceRequest = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const request = await MaintenanceRequest.findOne({ _id: req.params.id, owner: req.user.userId })
      .populate("tenant", "_id name email");
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (!vendorId) {
      request.assignedVendor = undefined;
      request.vendorAssignedAt = undefined;
      await request.save();
      return res.status(StatusCodes.OK).json({ message: "Vendor unassigned.", request });
    }

    const vendor = await Vendor.findOne({ _id: vendorId, managedByApp: true, isActive: true });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor not found." });

    request.assignedVendor = vendor._id;
    request.vendorAssignedAt = new Date();
    if (request.status === "Open") request.status = "In Progress";
    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("assignedVendor", "name phone email specializations city")
      .populate("comments.addedBy", "name role");

    await createNotification({
      recipient: request.tenant?._id,
      role: "tenant",
      title: "Vendor assigned to maintenance request",
      message: `${vendor.name} has been assigned for your ${request.category} request.`,
      type: "maintenance",
      actionPath: "/tenant/maintenance",
      metadata: { requestId: request._id, vendorId: vendor._id },
    });

    await sendMailEvent({
      to: request.tenant?.email,
      subject: `Vendor assigned: ${request.category} maintenance`,
      recipientName: request.tenant?.name,
      heading: "A vendor has been assigned",
      lead: "Your owner assigned a maintenance vendor to your request.",
      highlights: [
        `Vendor: ${vendor.name}`,
        `Phone: ${vendor.phone}`,
        vendor.email ? `Email: ${vendor.email}` : null,
        `Issue: ${request.category}`,
      ],
      actionLabel: "View Request",
      actionPath: "/tenant/maintenance",
      accent: "#0ea5e9",
    });

    res.status(StatusCodes.OK).json({ message: "Vendor assigned.", request: populated });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  ADMIN – VENDOR DIRECTORY
// ─────────────────────────────────────────────

const getAdminVendors = async (_req, res) => {
  try {
    await ensureAppVendorDirectory();

    // Keep vendor directory aligned with all already-approved vendor leads.
    const approvedLeads = await VendorLead.find({ status: "Approved" });
    for (const lead of approvedLeads) {
      const lookup = [];
      if (lead.email) lookup.push({ email: lead.email });
      if (lead.phone) lookup.push({ phone: lead.phone });
      if (lead.companyName && lead.phone) lookup.push({ name: lead.companyName, phone: lead.phone });

      const existing = lookup.length
        ? await Vendor.findOne({ managedByApp: true, $or: lookup })
        : null;

      if (!existing) {
        const createdVendor = await Vendor.create({
          name: lead.companyName,
          phone: lead.phone,
          email: lead.email,
          city: lead.city || "",
          specializations: lead.specializations && lead.specializations.length ? lead.specializations : ["General"],
          notes: lead.message || "",
          managedByApp: true,
          source: "vendor-lead",
          isActive: true,
        });
        await ensureVendorPortalAccount({
          vendor: createdVendor,
          preferredName: lead.contactName || lead.companyName,
        });
      } else if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }

      if (existing) {
        await ensureVendorPortalAccount({
          vendor: existing,
          preferredName: lead.contactName || lead.companyName,
        });
      }
    }

    const vendors = await Vendor.find({ managedByApp: true, isActive: true }).sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ vendors });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const createAdminVendor = async (req, res) => {
  try {
    const { name, phone, email, specializations, city, notes } = req.body;
    if (!name || !phone) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Vendor name and phone are required." });
    }
    const normalizedSpecializations = Array.isArray(specializations)
      ? specializations.filter(Boolean)
      : [];

    const vendor = await Vendor.create({
      managedByApp: true,
      source: "admin-dashboard",
      name,
      phone,
      email: email || "",
      specializations: normalizedSpecializations,
      city: city || "",
      notes: notes || "",
      isActive: true,
    });

    res.status(StatusCodes.CREATED).json({ message: "Vendor created.", vendor });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateAdminVendor = async (req, res) => {
  try {
    const { name, phone, email, specializations, city, notes, isActive } = req.body;
    const normalizedSpecializations = Array.isArray(specializations)
      ? specializations.filter(Boolean)
      : undefined;

    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, managedByApp: true },
      {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(specializations !== undefined ? { specializations: normalizedSpecializations } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
      { new: true }
    );

    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor not found." });
    res.status(StatusCodes.OK).json({ message: "Vendor updated.", vendor });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const deleteAdminVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, managedByApp: true },
      { isActive: false },
      { new: true }
    );
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor not found." });

    await MaintenanceRequest.updateMany(
      { assignedVendor: vendor._id, status: { $in: ["Open", "In Progress"] } },
      { $unset: { assignedVendor: 1, vendorAssignedAt: 1 } }
    );

    res.status(StatusCodes.OK).json({ message: "Vendor deactivated." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getAdminVendorLeads = async (_req, res) => {
  try {
    const leads = await VendorLead.find().sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ leads });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateAdminVendorLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["New", "Contacted", "Approved", "Rejected"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid lead status." });
    }

    const lead = await VendorLead.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!lead) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor lead not found." });

    let syncedVendor = null;
    let provisioning = null;

    // Auto-create or reactivate a Vendor entry when a lead is Approved.
    if (status === "Approved") {
      const lookup = [];
      if (lead.email) lookup.push({ email: lead.email });
      if (lead.phone) lookup.push({ phone: lead.phone });
      if (lead.companyName) lookup.push({ name: lead.companyName, phone: lead.phone });

      const existing = lookup.length
        ? await Vendor.findOne({ managedByApp: true, $or: lookup })
        : null;

      if (!existing) {
        syncedVendor = await Vendor.create({
          name: lead.companyName,
          phone: lead.phone,
          email: lead.email,
          city: lead.city || "",
          specializations: lead.specializations && lead.specializations.length ? lead.specializations : ["General"],
          notes: lead.message || "",
          managedByApp: true,
          source: "vendor-lead",
          isActive: true,
        });
      } else {
        existing.name = lead.companyName || existing.name;
        existing.phone = lead.phone || existing.phone;
        existing.email = lead.email || existing.email;
        existing.city = lead.city || existing.city;
        existing.specializations =
          lead.specializations && lead.specializations.length
            ? lead.specializations
            : existing.specializations;
        existing.notes = lead.message || existing.notes;
        existing.isActive = true;
        syncedVendor = await existing.save();
      }

      provisioning = await ensureVendorPortalAccount({
        vendor: syncedVendor,
        preferredName: lead.contactName || lead.companyName,
      });
    }

    res.status(StatusCodes.OK).json({ message: "Lead status updated.", lead, vendor: syncedVendor, provisioning });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  ADMIN – PLATFORM STATS
// ─────────────────────────────────────────────
const getAdminStats = async (req, res) => {
  try {
    const [totalOwners, totalTenants, totalProperties, totalVendors, totalLeads] = await Promise.all([
      User.countDocuments({ role: "owner" }),
      User.countDocuments({ role: "tenant" }),
      Property.countDocuments({ isActive: true }),
      Vendor.countDocuments({ managedByApp: true, isActive: true }),
      VendorLead.countDocuments({}),
    ]);
    const newLeads = await VendorLead.countDocuments({ status: "New" });
    res.status(StatusCodes.OK).json({ totalOwners, totalTenants, totalProperties, totalVendors, totalLeads, newLeads });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getAdminEntityList = async (req, res) => {
  try {
    const type = (req.query.type || "").toLowerCase();

    if (type === "owners" || type === "tenants") {
      const role = type === "owners" ? "owner" : "tenant";
      const users = await User.find({ role })
        .select("name email role createdAt updatedAt")
        .sort({ createdAt: -1 });
      return res.status(StatusCodes.OK).json({ type, items: users });
    }

    if (type === "properties") {
      const properties = await Property.find({ isActive: true })
        .populate("owner", "name email")
        .select("propertyType address status rentAmount createdAt updatedAt owner")
        .sort({ createdAt: -1 });
      return res.status(StatusCodes.OK).json({ type, items: properties });
    }

    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid type. Use owners, tenants, or properties." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – DASHBOARD STATS
// ─────────────────────────────────────────────

const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const [totalProperties, vacantProperties, occupiedProperties, activeLeases,
      totalRent, pendingRent, overdueRent, openMaintenanceRequests, totalInquiries, newInquiries] = await Promise.all([
      Property.countDocuments({ owner: ownerId, isActive: true }),
      Property.countDocuments({ owner: ownerId, isActive: true, status: "Vacant" }),
      Property.countDocuments({ owner: ownerId, isActive: true, status: "Occupied" }),
      Lease.countDocuments({ owner: ownerId, isActive: true }),
      RentPayment.countDocuments({ owner: ownerId }),
      RentPayment.countDocuments({ owner: ownerId, status: "Pending" }),
      RentPayment.countDocuments({ owner: ownerId, status: "Overdue" }),
      MaintenanceRequest.countDocuments({ owner: ownerId, status: { $in: ["Open", "In Progress"] } }),
      PropertyInquiry.countDocuments({ owner: ownerId }),
      PropertyInquiry.countDocuments({ owner: ownerId, status: "New" }),
    ]);

    const paidRentAgg = await RentPayment.aggregate([
      { $match: { owner: toObjectId(ownerId), status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPaidAmount = paidRentAgg[0]?.total || 0;

    res.status(StatusCodes.OK).json({
      stats: {
        totalProperties,
        vacantProperties,
        occupiedProperties,
        activeLeases,
        totalRentRecords: totalRent,
        pendingRent,
        overdueRent,
        openMaintenanceRequests,
        totalInquiries,
        newInquiries,
        totalPaidAmount,
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const createPropertyInquiry = async (req, res) => {
  try {
    const { message } = req.body;
    const property = await Property.findOne({ _id: req.params.id, isActive: true }).populate("owner", "name email");

    if (!property) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    }

    if (String(property.owner?._id) === String(req.user.userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "You cannot inquire about your own property." });
    }

    const existing = await PropertyInquiry.findOne({ property: property._id, inquirer: req.user.userId });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "You have already submitted an inquiry for this property." });
    }

    const inquiry = await PropertyInquiry.create({
      property: property._id,
      owner: property.owner?._id,
      inquirer: req.user.userId,
      message: (message || "").trim(),
    });

    await createNotification({
      recipient: property.owner?._id,
      role: "owner",
      title: "New property inquiry",
      message: `${req.user.name || "A user"} is interested in your property in ${property.address?.city || "your listing"}.`,
      type: "inquiry",
      actionPath: "/owner/dashboard",
      senderName: req.user.name || req.user.email || "Tenant",
      metadata: { inquiryId: inquiry._id, propertyId: property._id },
    });

    await sendMailEvent({
      to: property.owner?.email,
      subject: "New inquiry for your property",
      recipientName: property.owner?.name,
      heading: "You have received a new inquiry",
      lead: "A user has expressed interest in one of your property listings.",
      highlights: [
        `Property: ${property.propertyType} in ${property.address?.city || "N/A"}`,
        `Interested user: ${req.user.name || req.user.email || "N/A"}`,
        message ? `Message: ${message}` : null,
      ],
      actionLabel: "Open Owner Dashboard",
      actionPath: "/owner/dashboard",
      accent: "#2563eb",
    });

    res.status(StatusCodes.CREATED).json({ message: "Inquiry submitted successfully.", inquiry });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerInquiries = async (req, res) => {
  try {
    const inquiries = await PropertyInquiry.find({ owner: req.user.userId })
      .populate("property", "propertyType address status numberOfRooms")
      .populate("inquirer", "name email phone")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ inquiries });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateOwnerInquiryStatus = async (req, res) => {
  try {
    const { status, visitScheduledAt, visitNote, ownerFollowUpNote } = req.body;
    const allowedStatus = ["New", "In Progress", "Contacted", "Visit Planned", "Visited", "Handled", "Closed"];

    if (!allowedStatus.includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid inquiry status." });
    }

    const updatePayload = { status };

    if (status === "Visit Planned") {
      if (!visitScheduledAt) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Visit date and time are required for planning a visit." });
      }
      const parsedVisitDate = new Date(visitScheduledAt);
      if (Number.isNaN(parsedVisitDate.getTime())) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid visit date and time." });
      }
      updatePayload.visitScheduledAt = parsedVisitDate;
      updatePayload.visitNote = String(visitNote || "").trim();
      updatePayload.revisitRequested = false;
    }

    if (status === "Visited") {
      updatePayload.visitedAt = new Date();
    }

    if (ownerFollowUpNote !== undefined) {
      updatePayload.ownerFollowUpNote = String(ownerFollowUpNote || "").trim();
    }

    const inquiry = await PropertyInquiry.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      updatePayload,
      { new: true }
    )
      .populate("property", "propertyType address status numberOfRooms")
      .populate("inquirer", "name email phone");

    if (!inquiry) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Inquiry not found." });
    }

    const propertyLabel = `${inquiry.property?.propertyType || "Property"} in ${inquiry.property?.address?.city || "your selected area"}`;
    const visitInfo = inquiry.visitScheduledAt
      ? ` Visit scheduled for ${new Date(inquiry.visitScheduledAt).toLocaleString()}.`
      : "";

    await createNotification({
      recipient: inquiry.inquirer?._id,
      role: "tenant",
      title: "Inquiry update from owner",
      message: `Your inquiry for ${propertyLabel} is now marked as ${status}.${status === "Visit Planned" ? visitInfo : ""}`,
      type: "inquiry",
      actionPath: "/tenant/inquiries",
      metadata: {
        inquiryId: inquiry._id,
        propertyId: inquiry.property?._id,
        status,
        visitScheduledAt: inquiry.visitScheduledAt || null,
      },
    });

    res.status(StatusCodes.OK).json({ message: "Inquiry status updated.", inquiry });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantInquiries = async (req, res) => {
  try {
    const inquiries = await PropertyInquiry.find({ inquirer: req.user.userId })
      .populate("property", "propertyType address status numberOfRooms")
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ inquiries });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const requestTenantRevisit = async (req, res) => {
  try {
    const inquiry = await PropertyInquiry.findOne({ _id: req.params.id, inquirer: req.user.userId });
    if (!inquiry) return res.status(StatusCodes.NOT_FOUND).json({ message: "Inquiry not found." });

    if (inquiry.status !== "Visited") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Revisit can only be requested after a visit is completed." });
    }

    inquiry.revisitRequested = true;
    await inquiry.save();

    await createNotification({
      recipient: inquiry.owner,
      role: "owner",
      title: "Tenant Requested Another Visit",
      message: `A tenant has requested another property visit for your listing.`,
      type: "inquiry",
      actionPath: "/owner/inquiries",
      senderName: req.user.name || "Tenant",
    });

    res.status(StatusCodes.OK).json({ message: "Revisit request sent to owner." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  TENANT – DASHBOARD & INFO
// ─────────────────────────────────────────────

const getTenantDashboard = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const tenantObjectId = mongoose.Types.ObjectId.createFromHexString(tenantId);

    const lease = await Lease.findOne({ tenant: tenantId, isActive: true })
      .populate("property", "propertyType address description numberOfRooms status")
      .populate("owner", "name email phone");

    const [pendingAgg, overdueAgg] = await Promise.all([
      RentPayment.aggregate([
        { $match: { tenant: tenantObjectId, status: "Pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      RentPayment.aggregate([
        { $match: { tenant: tenantObjectId, status: "Overdue" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const pendingRent = pendingAgg[0]?.total || 0;
    const overdueRent = overdueAgg[0]?.total || 0;
    const openRequests = await MaintenanceRequest.countDocuments({ tenant: tenantId, status: "Open" });

    res.status(StatusCodes.OK).json({ lease, stats: { pendingRent, overdueRent, openRequests } });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantLease = async (req, res) => {
  try {
    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true })
      .populate("property", "propertyType address description numberOfRooms")
      .populate("owner", "name email phone");
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "No active lease found." });
    res.status(StatusCodes.OK).json({ lease });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantRentHistory = async (req, res) => {
  try {
    const rents = await RentPayment.find({ tenant: req.user.userId })
      .populate("property", "propertyType address")
      .sort({ year: -1, month: -1 });
    res.status(StatusCodes.OK).json({ rents });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  TENANT – MAINTENANCE REQUESTS
// ─────────────────────────────────────────────

const createMaintenanceRequest = async (req, res) => {
  try {
    const { category, description, urgency } = req.body;
    if (!category || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Category and description are required." });
    }

    const allowedUrgency = ["Low", "Medium", "High", "Emergency"];
    const requestUrgency = allowedUrgency.includes(urgency) ? urgency : "Medium";

    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true })
      .populate("property", "propertyType address")
      .populate("owner", "name email")
      .populate("tenant", "name email");
    if (!lease) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No active lease found. Cannot raise request." });
    }

    const photos = (req.files || []).map((file) => `/uploads/maintenance/${file.filename}`);

    const request = await MaintenanceRequest.create({
      property: lease.property,
      tenant: req.user.userId,
      owner: lease.owner,
      category,
      urgency: requestUrgency,
      slaDueAt: calculateSlaDueAt(requestUrgency),
      escalated: false,
      description,
      photos,
    });

    await createNotification({
      recipient: lease.owner,
      role: "owner",
      title: "New maintenance request",
      message: `${requestUrgency} priority ${category} issue raised by tenant.`,
      type: "maintenance",
      actionPath: "/owner/maintenance",
      senderName: lease.tenant?.name || "Tenant",
      metadata: { requestId: request._id },
    });

    await sendMailEvent({
      to: lease.owner?.email,
      subject: `New maintenance request (${requestUrgency})`,
      recipientName: lease.owner?.name,
      heading: "A tenant raised a maintenance request",
      lead: "A new issue has been submitted and needs owner attention.",
      highlights: [
        `Tenant: ${lease.tenant?.name || "Tenant"}`,
        `Issue: ${category}`,
        `Urgency: ${requestUrgency}`,
        `Property: ${lease.property?.propertyType || "Property"} (${lease.property?.address?.city || "N/A"})`,
      ],
      actionLabel: "Review Request",
      actionPath: "/owner/maintenance",
      accent: "#7c3aed",
    });

    await sendMailEvent({
      to: lease.tenant?.email,
      subject: "Maintenance request submitted",
      recipientName: lease.tenant?.name,
      heading: "Your maintenance request was submitted",
      lead: "Your owner has been notified and the ticket is now active.",
      highlights: [
        `Issue: ${category}`,
        `Urgency: ${requestUrgency}`,
        `SLA due by: ${new Date(request.slaDueAt).toLocaleString()}`,
      ],
      actionLabel: "Track Request",
      actionPath: "/tenant/maintenance",
      accent: "#0ea5e9",
    });

    res.status(StatusCodes.CREATED).json({ message: "Maintenance request created.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantMaintenanceRequests = async (req, res) => {
  try {
    const requests = await MaintenanceRequest.find({ tenant: req.user.userId })
      .populate("property", "propertyType address")
      .populate("assignedVendor", "name phone email specializations city")
      .populate("comments.addedBy", "name role")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ requests });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  TENANT/OWNER – MOVE OUT REQUESTS
// ─────────────────────────────────────────────

const createMoveOutRequest = async (req, res) => {
  try {
    const { requestedMoveOutDate, reason } = req.body;

    if (!requestedMoveOutDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Requested move-out date is required." });
    }

    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true })
      .populate("property", "propertyType address")
      .populate("owner", "name email")
      .populate("tenant", "name email");
    if (!lease) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No active lease found." });
    }

    const moveOutDate = new Date(requestedMoveOutDate);
    if (Number.isNaN(moveOutDate.getTime())) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid move-out date." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    moveOutDate.setHours(0, 0, 0, 0);
    if (moveOutDate < today) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Move-out date cannot be in the past." });
    }

    const pending = await MoveOutRequest.findOne({ lease: lease._id, status: "Pending" });
    if (pending) {
      return res.status(StatusCodes.CONFLICT).json({ message: "You already have a pending move-out request." });
    }

    const request = await MoveOutRequest.create({
      lease: lease._id,
      property: lease.property,
      tenant: lease.tenant,
      owner: lease.owner,
      requestedMoveOutDate: moveOutDate,
      reason,
    });

    await createNotification({
      recipient: lease.owner?._id || lease.owner,
      role: "owner",
      title: "New move-out request",
      message: `${lease.tenant?.name || "Tenant"} submitted a move-out request for review.`,
      type: "moveout",
      actionPath: "/owner/move-out",
      senderName: lease.tenant?.name || "Tenant",
      metadata: { requestId: request._id },
    });

    await sendMailEvent({
      to: lease.owner?.email,
      subject: "Move-out request submitted by tenant",
      recipientName: lease.owner?.name,
      heading: "A move-out request needs your decision",
      lead: "Your tenant has submitted a move-out request.",
      highlights: [
        `Tenant: ${lease.tenant?.name || "Tenant"}`,
        `Requested date: ${new Date(moveOutDate).toLocaleDateString()}`,
        `Reason: ${reason || "No reason shared"}`,
      ],
      actionLabel: "Review Move-Out",
      actionPath: "/owner/move-out",
      accent: "#f97316",
    });

    await sendMailEvent({
      to: lease.tenant?.email,
      subject: "Your move-out request is submitted",
      recipientName: lease.tenant?.name,
      heading: "Move-out request submitted",
      lead: "We have sent your request to the owner. You will be notified once reviewed.",
      highlights: [
        `Requested date: ${new Date(moveOutDate).toLocaleDateString()}`,
        `Property: ${lease.property?.propertyType || "Property"} (${lease.property?.address?.city || "N/A"})`,
      ],
      actionLabel: "Track Request",
      actionPath: "/tenant/dashboard",
      accent: "#0284c7",
    });

    res.status(StatusCodes.CREATED).json({ message: "Move-out request submitted.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantMoveOutRequests = async (req, res) => {
  try {
    const requests = await MoveOutRequest.find({ tenant: req.user.userId })
      .populate("property", "propertyType address")
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ requests });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerMoveOutRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { owner: req.user.userId };
    if (status) filter.status = status;

    const requests = await MoveOutRequest.find(filter)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount")
      .sort({ createdAt: -1 });

    const leaseIds = requests.map((r) => r.lease?._id).filter(Boolean);
    let dueMap = new Map();

    if (leaseIds.length > 0) {
      const outstanding = await RentPayment.aggregate([
        {
          $match: {
            lease: { $in: leaseIds },
            status: { $in: ["Pending", "Overdue"] },
          },
        },
        {
          $group: {
            _id: "$lease",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      dueMap = new Map(outstanding.map((row) => [String(row._id), row]));
    }

    const enrichedRequests = requests.map((request) => {
      const leaseId = String(request.lease?._id || "");
      const due = dueMap.get(leaseId);
      const outstandingDueCount = due?.count || 0;
      const outstandingDueAmount = due?.totalAmount || 0;

      return {
        ...request.toObject(),
        outstandingDueCount,
        outstandingDueAmount,
        canComplete: request.status === "Approved" && outstandingDueCount === 0,
      };
    });

    res.status(StatusCodes.OK).json({ requests: enrichedRequests });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const decideMoveOutRequest = async (req, res) => {
  try {
    const { status, ownerNote, approvedLastStayingDate, closingFormalities } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Status must be Approved or Rejected." });
    }

    const request = await MoveOutRequest.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Move-out request not found." });
    }

    if (request.status !== "Pending") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Only pending requests can be updated." });
    }

    const update = {
      status,
      ownerNote: ownerNote || "",
      decidedAt: new Date(),
    };

    if (status === "Approved") {
      if (!approvedLastStayingDate || !closingFormalities) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: "Last staying date and closing formalities are required for approval.",
        });
      }

      const approvedDate = new Date(approvedLastStayingDate);
      if (Number.isNaN(approvedDate.getTime())) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid last staying date." });
      }

      update.approvedLastStayingDate = approvedDate;
      update.closingFormalities = closingFormalities;
    }

    const updatedRequest = await MoveOutRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      update,
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount");

    await createNotification({
      recipient: updatedRequest.tenant?._id,
      role: "tenant",
      title: "Move-out request reviewed",
      message: `Your move-out request was ${updatedRequest.status.toLowerCase()}.`,
      type: "moveout",
      actionPath: "/tenant/dashboard",
      metadata: { requestId: updatedRequest._id },
    });

    await sendMailEvent({
      to: updatedRequest.tenant?.email,
      subject: `Move-out request ${updatedRequest.status.toLowerCase()}`,
      recipientName: updatedRequest.tenant?.name,
      heading: `Your move-out request was ${updatedRequest.status.toLowerCase()}`,
      lead: updatedRequest.status === "Approved"
        ? "Your owner approved the move-out request. Please review the details below."
        : "Your owner reviewed the request and did not approve it at this time.",
      highlights: [
        updatedRequest.approvedLastStayingDate ? `Last staying date: ${new Date(updatedRequest.approvedLastStayingDate).toLocaleDateString()}` : null,
        updatedRequest.closingFormalities ? `Closing formalities: ${updatedRequest.closingFormalities}` : null,
        updatedRequest.ownerNote ? `Owner note: ${updatedRequest.ownerNote}` : null,
      ],
      actionLabel: "Open Dashboard",
      actionPath: "/tenant/dashboard",
      accent: updatedRequest.status === "Approved" ? "#16a34a" : "#dc2626",
    });

    res.status(StatusCodes.OK).json({ message: "Move-out request updated.", request: updatedRequest });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const completeMoveOutRequest = async (req, res) => {
  try {
    const {
      completionNote,
      unpaidRentAmount,
      maintenanceDeduction,
      otherDeduction,
      settlementNote,
    } = req.body;

    const request = await MoveOutRequest.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!request) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Move-out request not found." });
    }

    if (request.status !== "Approved") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Only approved move-out requests can be completed." });
    }

    const outstandingDue = await RentPayment.aggregate([
      {
        $match: {
          lease: request.lease,
          status: { $in: ["Pending", "Overdue"] },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dueCount = outstandingDue[0]?.count || 0;
    const dueAmount = outstandingDue[0]?.totalAmount || 0;

    if (dueCount > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Cannot complete move-out. ${dueCount} pending/overdue rent record(s) totaling $${Number(dueAmount).toFixed(2)} are still open.`,
      });
    }

    const leaseDoc = await Lease.findById(request.lease).select("securityDeposit");

    await Lease.findOneAndUpdate(
      { _id: request.lease, owner: req.user.userId, isActive: true },
      { isActive: false }
    );

    await Property.findOneAndUpdate(
      { _id: request.property, owner: req.user.userId },
      { status: "Vacant" }
    );

    const unpaid = parseMoney(unpaidRentAmount || dueAmount);
    const maintenance = parseMoney(maintenanceDeduction);
    const other = parseMoney(otherDeduction);
    const refundableDeposit = parseMoney(leaseDoc?.securityDeposit || 0);
    const finalPayableToTenant = parseMoney(Math.max(0, refundableDeposit - unpaid - maintenance - other));

    const updatedRequest = await MoveOutRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      {
        status: "Completed",
        completedAt: new Date(),
        completionNote: completionNote || "Move-out completed and property handed over.",
        settlement: {
          unpaidRentAmount: unpaid,
          maintenanceDeduction: maintenance,
          otherDeduction: other,
          refundableDeposit,
          finalPayableToTenant,
          note: settlementNote || "",
        },
      },
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount");

    await createNotification({
      recipient: updatedRequest.tenant?._id,
      role: "tenant",
      title: "Move-out completed",
      message: `Final settlement prepared. Payable amount: $${Number(finalPayableToTenant).toFixed(2)}.`,
      type: "moveout",
      actionPath: "/tenant/dashboard",
      metadata: { requestId: updatedRequest._id, finalPayableToTenant },
    });

    res.status(StatusCodes.OK).json({
      message: "Move-out completed. Lease closed and property marked vacant.",
      request: updatedRequest,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER/TENANT – COMPLIANCE DOCUMENTS
// ─────────────────────────────────────────────

const uploadOwnerComplianceDocument = async (req, res) => {
  try {
    const { leaseId, documentType, documentNumber, notes } = req.body;
    if (!leaseId || !documentType) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "leaseId and documentType are required." });
    }
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Document file is required." });
    }

    const lease = await Lease.findOne({ _id: leaseId, owner: req.user.userId });
    if (!lease) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Lease not found." });
    }

    const doc = await ComplianceDocument.create({
      lease: lease._id,
      property: lease.property,
      owner: lease.owner,
      tenant: lease.tenant,
      documentType,
      documentNumber,
      notes,
      filePath: `/uploads/compliance/${req.file.filename}`,
      uploadedByRole: "owner",
      uploadedBy: req.user.userId,
    });

    res.status(StatusCodes.CREATED).json({ message: "Document uploaded.", document: doc });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerComplianceDocuments = async (req, res) => {
  try {
    const { leaseId, tenantId } = req.query;
    const leaseFilter = { owner: req.user.userId };
    if (leaseId) leaseFilter._id = leaseId;
    if (tenantId) leaseFilter.tenant = tenantId;

    const leases = await Lease.find(leaseFilter).select("_id");
    const leaseIds = leases.map((l) => l._id);

    const documents = await ComplianceDocument.find({ lease: { $in: leaseIds } })
      .populate("tenant", "name email")
      .populate("verifiedBy", "name email")
      .populate("property", "propertyType address")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ documents });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const uploadTenantComplianceDocument = async (req, res) => {
  try {
    const { documentType, documentNumber, notes } = req.body;
    if (!documentType) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "documentType is required." });
    }
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Document file is required." });
    }

    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true });
    if (!lease) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No active lease found." });
    }

    const doc = await ComplianceDocument.create({
      lease: lease._id,
      property: lease.property,
      owner: lease.owner,
      tenant: lease.tenant,
      documentType,
      documentNumber,
      notes,
      filePath: `/uploads/compliance/${req.file.filename}`,
      uploadedByRole: "tenant",
      uploadedBy: req.user.userId,
    });

    await createNotification({
      recipient: lease.owner,
      role: "owner",
      title: "New compliance upload",
      message: `Tenant uploaded ${documentType}.`,
      type: "compliance",
      actionPath: "/owner/tenants",
      senderName: req.user.name || "Tenant",
      metadata: { documentId: doc._id },
    });

    res.status(StatusCodes.CREATED).json({ message: "Document uploaded.", document: doc });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantComplianceDocuments = async (req, res) => {
  try {
    const documents = await ComplianceDocument.find({ tenant: req.user.userId })
      .populate("property", "propertyType address")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ documents });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const createLeaseRenewal = async (req, res) => {
  try {
    const { leaseId, proposedRentAmount, proposedLeaseStartDate, proposedLeaseEndDate, note } = req.body;
    if (!leaseId || !proposedRentAmount || !proposedLeaseStartDate || !proposedLeaseEndDate) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All renewal proposal fields are required." });
    }

    const lease = await Lease.findOne({ _id: leaseId, owner: req.user.userId, isActive: true })
      .populate("tenant", "name email")
      .populate("property", "propertyType address");
    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "Active lease not found." });

    const existingPending = await LeaseRenewal.findOne({ lease: leaseId, status: "Pending" });
    if (existingPending) {
      return res.status(StatusCodes.CONFLICT).json({ message: "A pending renewal proposal already exists." });
    }

    const currentLeaseEnd = startOfDay(lease.leaseEndDate);
    const proposedStart = startOfDay(proposedLeaseStartDate);
    const proposedEnd = startOfDay(proposedLeaseEndDate);
    if (!proposedStart || !proposedEnd) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please provide valid renewal dates." });
    }
    if (proposedStart < currentLeaseEnd) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Renewal start date must be on or after current lease end date.",
      });
    }
    if (proposedEnd <= proposedStart) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Renewal end date must be after renewal start date.",
      });
    }

    const renewal = await LeaseRenewal.create({
      lease: lease._id,
      property: lease.property,
      owner: lease.owner,
      tenant: lease.tenant,
      proposedRentAmount: parseMoney(proposedRentAmount),
      proposedLeaseStartDate: proposedStart,
      proposedLeaseEndDate: proposedEnd,
      note,
      status: "Pending",
    });

    await createNotification({
      recipient: lease.tenant,
      role: "tenant",
      title: "Lease renewal proposal",
      message: "Your owner has shared a renewal proposal.",
      type: "renewal",
      actionPath: "/tenant/dashboard",
      metadata: { renewalId: renewal._id },
    });

    await sendMailEvent({
      to: lease.tenant?.email,
      subject: "New lease renewal proposal",
      recipientName: lease.tenant?.name,
      heading: "Your owner proposed a lease renewal",
      lead: "Review the proposed dates and rent, then accept or reject from your portal.",
      highlights: [
        `Proposed rent: ${formatCurrency(renewal.proposedRentAmount)}`,
        `Term: ${new Date(renewal.proposedLeaseStartDate).toLocaleDateString()} to ${new Date(renewal.proposedLeaseEndDate).toLocaleDateString()}`,
        `Property: ${lease.property?.propertyType || "Property"} (${lease.property?.address?.city || "N/A"})`,
      ],
      actionLabel: "Review Renewal",
      actionPath: "/tenant/dashboard",
      accent: "#7c3aed",
    });

    res.status(StatusCodes.CREATED).json({ message: "Renewal proposal created.", renewal });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerLeaseRenewals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { owner: req.user.userId };
    if (status) filter.status = status;

    const renewals = await LeaseRenewal.find(filter)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ renewals });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const cancelLeaseRenewal = async (req, res) => {
  try {
    const renewal = await LeaseRenewal.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId, status: "Pending" },
      { status: "Cancelled", decidedAt: new Date() },
      { new: true }
    );
    if (!renewal) return res.status(StatusCodes.NOT_FOUND).json({ message: "Pending renewal not found." });

    await createNotification({
      recipient: renewal.tenant,
      role: "tenant",
      title: "Renewal proposal cancelled",
      message: "Your owner cancelled the pending renewal proposal.",
      type: "renewal",
      actionPath: "/tenant/dashboard",
      metadata: { renewalId: renewal._id },
    });

    res.status(StatusCodes.OK).json({ message: "Renewal proposal cancelled.", renewal });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantLeaseRenewals = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { tenant: req.user.userId };
    if (status) filter.status = status;

    const renewals = await LeaseRenewal.find(filter)
      .populate("property", "propertyType address")
      .populate("owner", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ renewals });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const decideLeaseRenewal = async (req, res) => {
  try {
    const { status, decisionNote } = req.body;
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Status must be Accepted or Rejected." });
    }

    const renewal = await LeaseRenewal.findOne({ _id: req.params.id, tenant: req.user.userId, status: "Pending" });
    if (!renewal) return res.status(StatusCodes.NOT_FOUND).json({ message: "Pending renewal not found." });

    renewal.status = status;
    renewal.decisionNote = decisionNote || "";
    renewal.decidedAt = new Date();
    await renewal.save();

    if (status === "Accepted") {
      await Lease.findOneAndUpdate(
        { _id: renewal.lease, isActive: true },
        {
          leaseStartDate: renewal.proposedLeaseStartDate,
          leaseEndDate: renewal.proposedLeaseEndDate,
          rentAmount: renewal.proposedRentAmount,
        }
      );
    }

    await createNotification({
      recipient: renewal.owner,
      role: "owner",
      title: "Renewal decision received",
      message: `Tenant ${status.toLowerCase()} your renewal proposal.`,
      type: "renewal",
      actionPath: "/owner/tenants",
      senderName: req.user.name || "Tenant",
      metadata: { renewalId: renewal._id, status },
    });

    const owner = await User.findById(renewal.owner).select("name email");
    await sendMailEvent({
      to: owner?.email,
      subject: `Renewal proposal ${status.toLowerCase()} by tenant`,
      recipientName: owner?.name,
      heading: `Tenant ${status.toLowerCase()} your renewal proposal`,
      lead: "A tenant decision has been recorded on your lease renewal request.",
      highlights: [
        `Decision: ${status}`,
        decisionNote ? `Tenant note: ${decisionNote}` : null,
      ],
      actionLabel: "Open Tenant & Lease",
      actionPath: "/owner/tenants",
      accent: status === "Accepted" ? "#16a34a" : "#dc2626",
    });

    res.status(StatusCodes.OK).json({ message: `Renewal ${status.toLowerCase()}.`, renewal });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const downloadRentReceipt = async (req, res) => {
  try {
    const rent = await RentPayment.findOne({ _id: req.params.id, status: "Paid" })
      .populate("lease", "leaseStartDate leaseEndDate")
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("owner", "name email phone");

    if (!rent) return res.status(StatusCodes.NOT_FOUND).json({ message: "Paid rent record not found." });

    const requesterRole = req.user.role;
    const requesterId = String(req.user.userId);
    const allowed =
      (requesterRole === "owner" && String(rent.owner?._id) === requesterId) ||
      (requesterRole === "tenant" && String(rent.tenant?._id) === requesterId);
    if (!allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Not authorized to access this receipt." });
    }

    const filename = `${rent.receiptNumber || `receipt-${rent._id}`}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const totalPaid = Number(rent.totalAmount || rent.amount || 0);
    const baseRent = Number(rent.amount || 0);
    const lateFee = Number(rent.lateFeeAmount || 0);
    const rentPeriod = `${rent.month || "-"} ${rent.year || ""}`.trim();
    const paidDate = rent.paidDate ? new Date(rent.paidDate).toLocaleDateString() : "-";
    const dueDate = rent.dueDate ? new Date(rent.dueDate).toLocaleDateString() : "-";
    const paymentSubmittedOn = rent.paymentSubmission?.submittedAt
      ? new Date(rent.paymentSubmission.submittedAt).toLocaleDateString()
      : "N/A";
    const paymentMethod = rent.paymentSubmission?.transactionId
      ? "UPI/Bank Transfer"
      : "Manual Confirmation";

    const propertyAddress = [
      rent.property?.address?.street,
      rent.property?.address?.city,
      rent.property?.address?.state,
      rent.property?.address?.zipCode,
      rent.property?.address?.country,
    ]
      .filter(Boolean)
      .join(", ");

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;

    let cursorY = 42;
    const footerReserve = 72;

    const ensureSpace = (requiredHeight) => {
      if (cursorY + requiredHeight > doc.page.height - footerReserve) {
        doc.addPage();
        cursorY = 42;
      }
    };

    const drawSectionHeader = (title) => {
      ensureSpace(34);
      doc.roundedRect(50, cursorY, contentWidth, 24, 6).fill("#eef2ff");
      doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(11).text(title, 62, cursorY + 7);
      cursorY += 30;
    };

    const drawPartyCard = (x, y, title, lines) => {
      const width = (contentWidth - 14) / 2;
      doc.roundedRect(x, y, width, 92, 8).fillAndStroke("#f8fafc", "#e2e8f0");
      doc.fillColor("#334155").font("Helvetica-Bold").fontSize(10).text(title, x + 12, y + 10);
      let lineY = y + 28;
      lines.forEach((line) => {
        doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5).text(line || "-", x + 12, lineY, { width: width - 24 });
        lineY += 14;
      });
    };

    const drawKeyValue = (x, y, label, value, width = 240) => {
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(9).text(label, x, y, { width });
      doc.fillColor("#0f172a").font("Helvetica").fontSize(10).text(value || "-", x, y + 12, { width });
    };

    // Header
    doc.roundedRect(50, cursorY, contentWidth, 88, 10).fill("#1d4ed8");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text("PAYMENT RECEIPT", 66, cursorY + 22);
    doc.font("Helvetica").fontSize(10).fillColor("#dbeafe").text("Property Management System", 66, cursorY + 52);

    const chipX = pageWidth - 250;
    doc.roundedRect(chipX, cursorY + 14, 184, 60, 8).fill("#eff6ff");
    doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(9).text("RECEIPT NO", chipX + 12, cursorY + 24);
    doc.fillColor("#0f172a").fontSize(11).text(rent.receiptNumber || "N/A", chipX + 12, cursorY + 38);
    doc.fillColor("#334155").font("Helvetica").fontSize(8.5).text(`Generated ${new Date().toLocaleDateString()}`, chipX + 12, cursorY + 54);

    cursorY += 102;

    // Receipt Information
    drawSectionHeader("Receipt Information");
    ensureSpace(62);
    drawKeyValue(50, cursorY, "Rent Period", rentPeriod);
    drawKeyValue(300, cursorY, "Payment Date", paidDate);
    drawKeyValue(50, cursorY + 30, "Due Date", dueDate);
    drawKeyValue(300, cursorY + 30, "Status", "PAID");
    cursorY += 68;

    // Parties
    drawSectionHeader("Parties");
    ensureSpace(104);
    drawPartyCard(50, cursorY, "Received From (Tenant)", [
      rent.tenant?.name,
      rent.tenant?.email,
      rent.tenant?.phone,
    ]);
    drawPartyCard(50 + (contentWidth - 14) / 2 + 14, cursorY, "Received By (Owner)", [
      rent.owner?.name,
      rent.owner?.email,
      rent.owner?.phone,
    ]);
    cursorY += 100;

    // Property & Lease
    drawSectionHeader("Property & Lease");
    const leaseTerm = `${rent.lease?.leaseStartDate ? new Date(rent.lease.leaseStartDate).toLocaleDateString() : "-"} to ${rent.lease?.leaseEndDate ? new Date(rent.lease.leaseEndDate).toLocaleDateString() : "-"}`;
    const addressHeight = doc.heightOfString(propertyAddress || "-", { width: contentWidth - 24, align: "left" });
    ensureSpace(74 + Math.min(addressHeight, 56));
    doc.roundedRect(50, cursorY, contentWidth, 74 + Math.min(addressHeight, 56), 8).fillAndStroke("#f8fafc", "#e2e8f0");
    drawKeyValue(62, cursorY + 12, "Property Type", rent.property?.propertyType || "-");
    drawKeyValue(300, cursorY + 12, "Lease Term", leaseTerm);
    doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(9).text("Property Address", 62, cursorY + 42);
    doc.fillColor("#0f172a").font("Helvetica").fontSize(10).text(propertyAddress || "-", 62, cursorY + 54, { width: contentWidth - 24 });
    cursorY += 80 + Math.min(addressHeight, 56);

    // Payment Details
    drawSectionHeader("Payment Details");
    ensureSpace(62);
    drawKeyValue(50, cursorY, "Payment Method", paymentMethod);
    drawKeyValue(300, cursorY, "Transaction ID", rent.paymentSubmission?.transactionId || "N/A");
    drawKeyValue(50, cursorY + 30, "Submitted On", paymentSubmittedOn);
    cursorY += 68;

    // Amount Summary
    drawSectionHeader("Amount Summary");
    ensureSpace(98);
    const summaryY = cursorY;
    doc.roundedRect(50, summaryY, contentWidth, 88, 8).fillAndStroke("#f8fafc", "#cbd5e1");
    doc.fillColor("#334155").font("Helvetica").fontSize(10).text("Base Rent", 64, summaryY + 14);
    doc.text(formatCurrency(baseRent), pageWidth - 170, summaryY + 14, { width: 100, align: "right" });
    doc.text("Late Fee", 64, summaryY + 34);
    doc.text(formatCurrency(lateFee), pageWidth - 170, summaryY + 34, { width: 100, align: "right" });
    doc.moveTo(64, summaryY + 54).lineTo(pageWidth - 64, summaryY + 54).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text("Total Amount Paid", 64, summaryY + 64);
    doc.fillColor("#166534").text(formatCurrency(totalPaid), pageWidth - 170, summaryY + 64, { width: 100, align: "right" });
    cursorY += 94;

    if (rent.notes || rent.paymentSubmission?.notes) {
      drawSectionHeader("Additional Notes");
      const ownerNoteHeight = rent.notes
        ? doc.heightOfString(rent.notes, { width: contentWidth - 24 }) + 20
        : 0;
      const tenantNoteHeight = rent.paymentSubmission?.notes
        ? doc.heightOfString(rent.paymentSubmission.notes, { width: contentWidth - 24 }) + 20
        : 0;
      ensureSpace(ownerNoteHeight + tenantNoteHeight + 16);

      if (rent.notes) {
        doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(9).text("Owner Note", 50, cursorY);
        doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5).text(rent.notes, 50, cursorY + 12, { width: contentWidth });
        cursorY += ownerNoteHeight;
      }

      if (rent.paymentSubmission?.notes) {
        doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(9).text("Tenant Submission Note", 50, cursorY);
        doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5).text(rent.paymentSubmission.notes, 50, cursorY + 12, { width: contentWidth });
        cursorY += tenantNoteHeight;
      }
    }

    const footerY = Math.max(cursorY + 10, doc.page.height - 64);
    doc.moveTo(50, footerY).lineTo(pageWidth - 50, footerY).strokeColor("#cbd5e1").stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(
      "This is a system generated receipt and does not require a physical signature.",
      50,
      footerY + 10,
      { align: "center", width: contentWidth }
    );

    doc.end();
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const exportOwnerRentCsv = async (req, res) => {
  try {
    const rents = await RentPayment.find({ owner: req.user.userId })
      .populate("tenant", "name email")
      .populate("property", "propertyType address")
      .sort({ createdAt: -1 });

    const header = [
      "Receipt Number",
      "Month",
      "Year",
      "Tenant",
      "Tenant Email",
      "Property",
      "City",
      "Status",
      "Amount",
      "Late Fee",
      "Total",
      "Due Date",
      "Paid Date",
    ];
    const rows = rents.map((r) => [
      r.receiptNumber || "",
      r.month,
      r.year,
      r.tenant?.name || "",
      r.tenant?.email || "",
      r.property?.propertyType || "",
      r.property?.address?.city || "",
      r.status,
      Number(r.amount || 0).toFixed(2),
      Number(r.lateFeeAmount || 0).toFixed(2),
      Number(r.totalAmount || r.amount || 0).toFixed(2),
      r.dueDate ? new Date(r.dueDate).toISOString().slice(0, 10) : "",
      r.paidDate ? new Date(r.paidDate).toISOString().slice(0, 10) : "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="rent-report-${Date.now()}.csv"`);
    res.status(StatusCodes.OK).send(csv);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const verifyComplianceDocument = async (req, res) => {
  try {
    const { verificationStatus, verificationNote } = req.body;
    if (!["Verified", "Rejected"].includes(verificationStatus)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "verificationStatus must be Verified or Rejected." });
    }

    const doc = await ComplianceDocument.findById(req.params.id);
    if (!doc) return res.status(StatusCodes.NOT_FOUND).json({ message: "Document not found." });

    const lease = await Lease.findOne({ _id: doc.lease, owner: req.user.userId });
    if (!lease) return res.status(StatusCodes.FORBIDDEN).json({ message: "Not authorized to verify this document." });

    doc.verificationStatus = verificationStatus;
    doc.verificationNote = verificationNote || "";
    doc.verifiedBy = req.user.userId;
    doc.verifiedAt = new Date();
    await doc.save();

    await createNotification({
      recipient: doc.tenant,
      role: "tenant",
      title: "Compliance document reviewed",
      message: `${doc.documentType} has been ${verificationStatus.toLowerCase()}.`,
      type: "compliance",
      actionPath: "/tenant/dashboard",
      metadata: { documentId: doc._id, verificationStatus },
    });

    res.status(StatusCodes.OK).json({ message: "Document verification updated.", document: doc });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const filter = { recipient: req.user.userId, role: req.user.role };
    if (unreadOnly === "true") filter.isRead = false;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(StatusCodes.OK).json({ notifications });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId, role: req.user.role },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(StatusCodes.NOT_FOUND).json({ message: "Notification not found." });
    res.status(StatusCodes.OK).json({ message: "Notification marked as read.", notification });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerAnalytics = async (req, res) => {
  try {
    const ownerObjectId = toObjectId(req.user.userId);

    const [rentStatusAgg, maintenanceAgg, monthlyRentAgg] = await Promise.all([
      RentPayment.aggregate([
        { $match: { owner: ownerObjectId } },
        { $group: { _id: "$status", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
      MaintenanceRequest.aggregate([
        { $match: { owner: ownerObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      RentPayment.aggregate([
        { $match: { owner: ownerObjectId, status: "Paid" } },
        {
          $group: {
            _id: { year: "$year", month: "$month" },
            collection: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.year": 1 } },
      ]),
    ]);

    const rentSummary = {
      paid: 0,
      pending: 0,
      overdue: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    };

    for (const row of rentStatusAgg) {
      if (row._id === "Paid") {
        rentSummary.paid = row.total || 0;
        rentSummary.paidCount = row.count || 0;
      }
      if (row._id === "Pending") {
        rentSummary.pending = row.total || 0;
        rentSummary.pendingCount = row.count || 0;
      }
      if (row._id === "Overdue") {
        rentSummary.overdue = row.total || 0;
        rentSummary.overdueCount = row.count || 0;
      }
    }

    const maintenanceSummary = { Open: 0, "In Progress": 0, Resolved: 0 };
    for (const row of maintenanceAgg) {
      maintenanceSummary[row._id] = row.count;
    }

    res.status(StatusCodes.OK).json({
      analytics: {
        rentSummary,
        maintenanceSummary,
        monthlyCollection: monthlyRentAgg.map((row) => ({
          year: row._id.year,
          month: row._id.month,
          collection: row.collection,
        })),
      },
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const exportOwnerAnalyticsCsv = async (req, res) => {
  try {
    const ownerObjectId = toObjectId(req.user.userId);
    const monthlyRentAgg = await RentPayment.aggregate([
      { $match: { owner: ownerObjectId } },
      {
        $group: {
          _id: { year: "$year", month: "$month", status: "$status" },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1 } },
    ]);

    const header = ["Year", "Month", "Status", "Count", "Total Amount"];
    const rows = monthlyRentAgg.map((row) => [
      row._id.year,
      row._id.month,
      row._id.status,
      row.count,
      Number(row.total || 0).toFixed(2),
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="analytics-${Date.now()}.csv"`);
    res.status(StatusCodes.OK).send(csv);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const generateFeaturesDocument = async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const filename = `portal-features-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    doc.on("error", (err) => {
      console.error("PDF generation error:", err);
      if (!res.headersSent) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "PDF generation failed" });
      }
    });

    res.on("error", (err) => {
      console.error("Response error:", err);
      doc.end();
    });

    doc.pipe(res);

    const pageBottom = 742;
    const leftMargin = 50;
    const contentWidth = 495;
    let activeSectionColor = "#1e40af";

    const ensurePageSpace = (requiredHeight = 80) => {
      if (doc.y + requiredHeight > pageBottom) {
        doc.addPage();
      }
    };

    const drawSectionHeader = (title, color, subtitle) => {
      ensurePageSpace(80);
      activeSectionColor = color;
      doc.fontSize(20).font("Helvetica-Bold").fillColor(color).text(title);
      doc.moveDown(0.15);
      if (subtitle) {
        doc.fontSize(9.5).font("Helvetica").fillColor("#4b5563").text(subtitle, { width: 500 });
        doc.moveDown(0.15);
      }
      doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke(color);
      doc.moveDown(0.55);
    };

    const getFeatureHeight = (title, description, points) => {
      const innerWidth = contentWidth - 24;
      const bulletWidth = contentWidth - 36;

      doc.font("Helvetica-Bold").fontSize(11);
      const titleHeight = doc.heightOfString(title, { width: innerWidth });

      doc.font("Helvetica").fontSize(9.5);
      const descriptionHeight = doc.heightOfString(description, { width: innerWidth });

      doc.font("Helvetica-Bold").fontSize(9);
      const highlightsLabelHeight = doc.heightOfString("Highlights", { width: innerWidth });

      doc.font("Helvetica").fontSize(9);
      const bulletsHeight = points.reduce((sum, point) => {
        return sum + doc.heightOfString(`* ${point}`, { width: bulletWidth });
      }, 0);

      return 10 + titleHeight + 4 + descriptionHeight + 6 + highlightsLabelHeight + 3 + bulletsHeight + 10;
    };

    const drawFeature = (title, description, points) => {
      const cardHeight = getFeatureHeight(title, description, points);
      ensurePageSpace(cardHeight + 8);

      const cardTop = doc.y;
      const cardLeft = leftMargin;

      doc.roundedRect(cardLeft, cardTop, contentWidth, cardHeight, 6).fillAndStroke("#f8fafc", "#e2e8f0");

      const textX = cardLeft + 12;
      const innerWidth = contentWidth - 24;
      const bulletWidth = contentWidth - 36;
      let y = cardTop + 10;

      doc.fontSize(11).font("Helvetica-Bold").fillColor(activeSectionColor);
      doc.text(title, textX, y, { width: innerWidth });
      y = doc.y + 4;

      doc.fontSize(9.5).font("Helvetica").fillColor("#334155");
      doc.text(description, textX, y, { width: innerWidth });
      y = doc.y + 6;

      doc.fontSize(9).font("Helvetica-Bold").fillColor("#475569");
      doc.text("Highlights", textX, y, { width: innerWidth });
      y = doc.y + 3;

      doc.fontSize(9).font("Helvetica").fillColor("#475569");
      points.forEach((point) => {
        doc.text(`* ${point}`, textX + 6, y, { width: bulletWidth });
        y = doc.y;
      });

      doc.y = cardTop + cardHeight + 8;
    };

    // ============ TITLE PAGE ============
    doc.fontSize(40).font("Helvetica-Bold").fillColor("#1e40af").text("Property Management Portal", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica").fillColor("#64748b").text("Complete Feature Overview", { align: "center" });

    doc.moveDown(1.6);
    doc.fontSize(10.5).font("Helvetica").fillColor("#111827").text(
      "This document summarizes core capabilities for Owners, Tenants, and end users on the platform.",
      { align: "center", width: 420 }
    );

    doc.moveDown(1.4);
    const summaryPoints = [
      "* Owner operations in one place: property, rent, lease, and maintenance workflows",
      "* Tenant self-service journey: inquiry to rent payment, documents, and requests",
      "* Better communication and transparency through notifications, receipts, and tracking",
      "* Reporting and export options for quick business visibility",
    ];
    doc.fontSize(9.5).font("Helvetica");
    const summaryTextHeight = summaryPoints.reduce((sum, line) => sum + doc.heightOfString(line, { width: 430 }), 0);
    const summaryBoxHeight = 28 + summaryTextHeight;
    const summaryTop = doc.y;
    doc.roundedRect(70, summaryTop, 455, summaryBoxHeight, 8).fillAndStroke("#eff6ff", "#bfdbfe");
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#1d4ed8").text("What This Portal Provides", 84, summaryTop + 12);
    doc.y = summaryTop + 28;
    doc.fontSize(9.5).font("Helvetica").fillColor("#1e3a8a");
    summaryPoints.forEach((line) => {
      doc.text(line, { indent: 20, width: 430 });
    });

    doc.addPage();
    
    // ============ OWNER FEATURES ============
    drawSectionHeader(
      "FEATURES FOR PROPERTY OWNERS",
      "#1e40af",
      "End-to-end tools to manage units, tenants, payments, and portfolio performance."
    );
    
    const ownerFeatures = [
      {
        title: "Property Management",
        description: "Add, manage, and monitor multiple properties with ease. Upload property details, set vacancy status, and maintain all information in one place.",
        points: ["Add and edit multiple properties", "Set property status (Occupied/Vacant)", "Upload property images and documents", "Track property performance metrics"]
      },
      {
        title: "Client Acquisition & Lead Management",
        description: "Identify high-intent tenant inquiries and convert them into leases. Track lead funnel metrics and monitor conversion momentum.",
        points: ["View all property inquiries", "Categorize leads by status", "Track conversion metrics and momentum", "Quick action buttons for follow-up", "High-intent lead cards for priority handling"]
      },
      {
        title: "Tenant & Lease Management",
        description: "Assign tenants to properties and manage lease agreements efficiently.",
        points: ["Search and assign tenants to properties", "Create and renew lease agreements", "Track lease start and end dates", "Terminate leases with documentation", "Monitor tenant status and history"]
      },
      {
        title: "Rent Collection & Payment Tracking",
        description: "Generate rent records, track payments, and manage payment methods securely.",
        points: ["Generate monthly rent records", "Mark payments as received", "Set payment instructions (Bank/UPI/QR)", "Track pending and overdue payments", "View payment history analytics"]
      },
      {
        title: "Payment Methods Configuration",
        description: "Configure multiple payment methods to make it easy for tenants to pay rent.",
        points: ["Add bank account details", "Set UPI ID for direct transfers", "Upload payment QR codes", "Support multiple payment options", "Tenant-friendly payment setup"]
      },
      {
        title: "Maintenance Request Management",
        description: "Receive, track, and resolve tenant maintenance requests with SLA tracking.",
        points: ["View all maintenance requests from tenants", "Set urgency levels", "Track SLA due dates", "Add comments and updates", "Update request status"]
      },
      {
        title: "Lease Renewal Management",
        description: "Manage lease renewals and keep tenants informed about upcoming expiration.",
        points: ["Create lease renewal requests", "Specify new rent amount and terms", "Track tenant responses", "Cancel renewal if needed", "Automated renewal notifications"]
      },
      {
        title: "Move-Out Request Processing",
        description: "Process tenant move-out requests with proper documentation and settlement.",
        points: ["Review move-out requests from tenants", "Specify and track move-out dates", "Approve or reject requests", "Complete move-out with checklists", "Maintain move-out history"]
      },
      {
        title: "Compliance Document Management",
        description: "Upload, store, and verify important compliance documents.",
        points: ["Upload compliance documents", "Attach to properties or leases", "Verify document status", "Maintain audit trail", "Secure document storage"]
      },
      {
        title: "Analytics & Reporting",
        description: "Gain insights into portfolio performance with detailed analytics.",
        points: ["View dashboard with key metrics", "Access occupancy rate analytics", "Monitor rent collection status", "Track monthly revenue trends", "Export analytics as CSV"]
      },
      {
        title: "Owner Dashboard",
        description: "Centralized command center with real-time insights and quick actions.",
        points: ["Client Acquisition Sprint section", "High-Intent Leads overview", "Key performance metrics", "Quick action buttons", "Recent inquiries summary"]
      },
      {
        title: "Vacancy Management",
        description: "Track and promote vacant properties to attract tenants.",
        points: ["View all vacant properties", "Update vacancy status", "Promote listings", "Track vacancy duration", "Get tenant inquiries"]
      }
    ];

    ownerFeatures.forEach((feature) => {
      drawFeature(feature.title, feature.description, feature.points);
    });

    // ============ PAGE BREAK ============
    doc.addPage();
    
    // ============ TENANT FEATURES ============
    drawSectionHeader(
      "FEATURES FOR TENANTS",
      "#7c3aed",
      "A smooth tenant experience for discovery, rent, support, and compliance tasks."
    );
    
    const tenantFeatures = [
      {
        title: "Property Discovery & Browsing",
        description: "Browse available properties and submit inquiries directly to property owners.",
        points: ["View all available properties", "Filter by location, rent, and property type", "Submit inquiries to property owners", "Track inquiry status", "Receive property updates"]
      },
      {
        title: "Lease Management",
        description: "View and manage your active lease agreements easily.",
        points: ["View active lease details", "Monitor lease start and end dates", "Track lease terms and conditions", "Download lease documents", "Plan for lease renewal"]
      },
      {
        title: "Rent Payment Processing",
        description: "Pay rent conveniently through multiple payment methods.",
        points: ["View pending rent amounts", "Pay via Bank Transfer, UPI, or QR Code", "Access structured account details", "View payment history", "Download rent receipts"]
      },
      {
        title: "Rent Receipt Generation",
        description: "Receive and download professional rent receipts for your records.",
        points: ["Auto-generated receipts on payment", "Premium receipt format with all details", "Property and lease information", "Payment method tracking", "Transaction ID and date logging"]
      },
      {
        title: "Maintenance Request Submission",
        description: "Report maintenance issues and track their resolution status.",
        points: ["Submit maintenance requests easily", "Upload photos of issues", "Set urgency level", "Track request status", "Receive status updates"]
      },
      {
        title: "Compliance Document Upload",
        description: "Upload and manage required compliance documents.",
        points: ["Upload government IDs", "Submit proof of identity", "Submit address verification", "Track document verification status", "Maintain document audit trail"]
      },
      {
        title: "Direct Tenant Inquiries",
        description: "Communicate with property owners about properties and leases.",
        points: ["Send inquiries to owners", "Track inquiry responses", "View owner messages", "Share additional information", "Reference inquiry history"]
      },
      {
        title: "Lease Renewal Decisions",
        description: "Accept or reject lease renewal proposals from property owners.",
        points: ["Receive renewal notifications", "View new rental terms", "Review lease changes", "Accept renewal with confirmation", "Provide counter-offers"]
      },
      {
        title: "Move-Out Request Submission",
        description: "Submit formal move-out requests with proper notice.",
        points: ["Request move-out", "Specify intended move-out date", "Provide move-out reason", "Track approval status", "Complete exit checklist"]
      },
      {
        title: "Tenant Dashboard",
        description: "Personalized dashboard with success accelerator and conversion actions.",
        points: ["View Success Accelerator section", "Monitor readiness score", "Clear pending dues", "Upload missing documents", "Engage with owners"]
      },
      {
        title: "Real-Time Notifications",
        description: "Stay updated with instant notifications on all activities.",
        points: ["Rent due notifications", "Maintenance status updates", "Lease renewal reminders", "Message notifications", "Owner responses"]
      },
      {
        title: "Payment History & Records",
        description: "View complete payment history with detailed records.",
        points: ["Track all rent payments", "View payment dates and amounts", "Download payment receipts", "Export payment history", "Reference payment records"]
      }
    ];

    tenantFeatures.forEach((feature) => {
      drawFeature(feature.title, feature.description, feature.points);
    });

    // ============ PAGE BREAK ============
    doc.addPage();
    
    // ============ PLATFORM FEATURES ============
    drawSectionHeader(
      "PLATFORM-WIDE FEATURES",
      "#059669",
      "Common services that improve trust, security, speed, and operational visibility."
    );

    const platformFeatures = [
      {
        title: "Role-Based Access Control",
        description: "Secure role-based access ensuring data isolation between owners and tenants.",
        points: ["Owner-only sections", "Tenant-only sections", "Public discovery sections", "Secure authentication", "Session management"]
      },
      {
        title: "User Authentication & Security",
        description: "Enterprise-grade security for user accounts and data protection.",
        points: ["Secure sign-up and login", "Email verification", "Password recovery", "Secure session tokens", "Data encryption"]
      },
      {
        title: "Real-Time Notifications System",
        description: "Instant notifications for all platform activities.",
        points: ["Email notifications", "System notifications", "Activity tracking", "Notification history", "Read/unread status"]
      },
      {
        title: "Document Management System",
        description: "Secure upload and storage of all documents.",
        points: ["Compliance documents", "Lease agreements", "Rent receipts", "Payment proofs", "Secure file storage"]
      },
      {
        title: "Email Communication",
        description: "Automated email notifications for all important events.",
        points: ["Account creation confirmations", "Payment confirmations", "Maintenance updates", "Lease notifications", "Inquiry responses"]
      },
      {
        title: "Data Export & Reporting",
        description: "Export data for external analysis and record-keeping.",
        points: ["CSV exports for analytics", "Rent data exports", "Property reports", "Date range filtering", "Custom report generation"]
      },
      {
        title: "Mobile Responsive Design",
        description: "Fully responsive interface for mobile, tablet, and desktop.",
        points: ["Mobile app-like experience", "Touch-friendly interface", "Responsive layouts", "Fast loading times", "Cross-device sync"]
      },
      {
        title: "Modern User Interface",
        description: "Intuitive and attractive user interface for better engagement.",
        points: ["Clean dashboard design", "Animated carousels", "Smooth transitions", "Contextual modals", "Progress indicators"]
      },
      {
        title: "Search & Filtering Features",
        description: "Powerful search and filtering capabilities across the platform.",
        points: ["Property search", "Tenant search", "Inquiry filtering", "Date range filtering", "Status-based filtering"]
      },
      {
        title: "Analytics & Insights",
        description: "Data-driven insights for better decision making.",
        points: ["Portfolio analytics", "Revenue tracking", "Occupancy metrics", "Payment history", "Performance trends"]
      }
    ];

    platformFeatures.forEach((feature) => {
      drawFeature(feature.title, feature.description, feature.points);
    });

    // ============ FINAL PAGE - GETTING STARTED ============
    doc.addPage();
    drawSectionHeader("GETTING STARTED", "#0369a1", "Follow these steps to go live quickly for both user roles.");
    
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1e40af").text("For Property Owners:");
    doc.moveDown(0.4);
    doc.fontSize(9.5).font("Helvetica").fillColor("#475569");
    doc.text("* Sign up with your email and create your owner account", { indent: 15 });
    doc.text("* Add your properties with details, photos, and rental expectations", { indent: 15 });
    doc.text("* Set up payment methods (Bank/UPI/QR Code) to receive tenant payments", { indent: 15 });
    doc.text("* Configure payment instructions and wait for tenant assignments", { indent: 15 });
    doc.text("* Review tenant inquiries and convert them into leases", { indent: 15 });
    doc.text("* Generate monthly rent records and track collections", { indent: 15 });
    doc.text("* Manage maintenance requests and lease renewals", { indent: 15 });
    doc.text("* Monitor analytics and optimize your portfolio", { indent: 15 });
    
    doc.moveDown(1.2);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#7c3aed").text("For Tenants:");
    doc.moveDown(0.4);
    doc.fontSize(9.5).font("Helvetica").fillColor("#475569");
    doc.text("* Sign up with your email and create your tenant account", { indent: 15 });
    doc.text("* Browse available properties and submit inquiries", { indent: 15 });
    doc.text("* Wait for owner response and proceed with lease negotiation", { indent: 15 });
    doc.text("* Upload required compliance documents", { indent: 15 });
    doc.text("* Accept lease agreement from property owner", { indent: 15 });
    doc.text("* Pay rent using convenient payment methods", { indent: 15 });
    doc.text("* Submit maintenance requests as needed", { indent: 15 });
    doc.text("* Manage move-out or lease renewal", { indent: 15 });

    doc.moveDown(1.2);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e40af").text("Need Help?");
    doc.moveDown(0.3);
    doc.fontSize(9.5).font("Helvetica").fillColor("#475569");
    doc.text("* Visit our FAQ section for answers to common questions", { indent: 15 });
    doc.text("* Contact our support team for additional assistance", { indent: 15 });
    doc.text("* Review our privacy policy and terms of service", { indent: 15 });

    doc.moveDown(1.5);
    doc.fontSize(8).fillColor("#94a3b8");
    const generatedDate = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    doc.text("Generated on " + generatedDate, { align: "center" });
    doc.text("Property Management Portal. All rights reserved.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("Error generating features document:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: Owner Expense Tracker
// ─────────────────────────────────────────────────────────────────────────────

const addExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { propertyId, category, title, amount, date, notes } = req.body;

    if (!propertyId || !category || !title || !amount || !date) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "propertyId, category, title, amount, and date are required." });
    }

    const property = await Property.findOne({ _id: propertyId, owner: ownerId, isActive: true });
    if (!property) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });
    }

    const parsedAmount = parseMoney(amount);
    if (parsedAmount <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Amount must be greater than 0." });
    }

    const expense = await Expense.create({
      owner: ownerId,
      property: propertyId,
      category,
      title: title.trim(),
      amount: parsedAmount,
      date: new Date(date),
      notes: (notes || "").trim(),
    });

    await expense.populate("property", "propertyType address");
    res.status(StatusCodes.CREATED).json({ message: "Expense added.", expense });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerExpenses = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { propertyId, category, financialYear, startDate, endDate } = req.query;

    const filter = { owner: ownerId };
    if (propertyId) filter.property = propertyId;
    if (category) filter.category = category;
    if (financialYear) filter.financialYear = financialYear;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate("property", "propertyType address")
      .sort({ date: -1 });

    // Aggregate totals by category
    const categoryTotals = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Net income: total paid rent minus expenses (filtered by same property/period if applicable)
    const rentFilter = { owner: ownerId, status: "Paid" };
    if (propertyId) rentFilter.property = propertyId;
    if (startDate || endDate) {
      rentFilter.paidDate = {};
      if (startDate) rentFilter.paidDate.$gte = new Date(startDate);
      if (endDate) rentFilter.paidDate.$lte = new Date(endDate);
    }
    const rentAgg = await RentPayment.aggregate([
      { $match: { owner: toObjectId(ownerId), status: "Paid", ...(propertyId ? { property: toObjectId(propertyId) } : {}) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRentCollected = rentAgg[0]?.total || 0;
    const netIncome = totalRentCollected - totalExpenses;

    res.status(StatusCodes.OK).json({ expenses, categoryTotals, totalExpenses, totalRentCollected, netIncome });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const expense = await Expense.findOne({ _id: req.params.id, owner: ownerId });
    if (!expense) return res.status(StatusCodes.NOT_FOUND).json({ message: "Expense not found." });

    const { category, title, amount, date, notes } = req.body;
    if (category) expense.category = category;
    if (title) expense.title = title.trim();
    if (amount !== undefined) {
      const parsed = parseMoney(amount);
      if (parsed <= 0) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Amount must be greater than 0." });
      expense.amount = parsed;
    }
    if (date) expense.date = new Date(date);
    if (notes !== undefined) expense.notes = (notes || "").trim();

    await expense.save();
    await expense.populate("property", "propertyType address");
    res.status(StatusCodes.OK).json({ message: "Expense updated.", expense });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, owner: ownerId });
    if (!expense) return res.status(StatusCodes.NOT_FOUND).json({ message: "Expense not found." });
    res.status(StatusCodes.OK).json({ message: "Expense deleted." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: Advanced Analytics & Tax Reports
// ─────────────────────────────────────────────────────────────────────────────

const getAdvancedAnalytics = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { financialYear } = req.query;

    // Determine date range from financial year (default: current FY)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    if (financialYear && /^\d{4}-\d{2}$/.test(financialYear)) {
      fyStartYear = parseInt(financialYear.split("-")[0], 10);
    }

    const fyStart = new Date(fyStartYear, 3, 1);   // April 1
    const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59); // March 31

    const ownerOid = toObjectId(ownerId);
    const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fyMonths = [
      { year: fyStartYear, month: 4 },
      { year: fyStartYear, month: 5 },
      { year: fyStartYear, month: 6 },
      { year: fyStartYear, month: 7 },
      { year: fyStartYear, month: 8 },
      { year: fyStartYear, month: 9 },
      { year: fyStartYear, month: 10 },
      { year: fyStartYear, month: 11 },
      { year: fyStartYear, month: 12 },
      { year: fyStartYear + 1, month: 1 },
      { year: fyStartYear + 1, month: 2 },
      { year: fyStartYear + 1, month: 3 },
    ];
    const fyMonthYearClauses = fyMonths.map(({ year, month }) => ({
      year,
      $or: [
        { month },
        { month: String(month) },
        { month: monthLong[month - 1] },
        { month: monthShort[month - 1] },
      ],
    }));
    const paidRentFyMatch = {
      owner: ownerOid,
      status: "Paid",
      $or: [
        { paidDate: { $gte: fyStart, $lte: fyEnd } },
        {
          $and: [
            { $or: [{ paidDate: { $exists: false } }, { paidDate: null }] },
            { $or: fyMonthYearClauses },
          ],
        },
      ],
    };
    const monthToNumberExpr = {
      $switch: {
        branches: [
          { case: { $in: ["$month", ["January", "Jan"]] }, then: 1 },
          { case: { $in: ["$month", ["February", "Feb"]] }, then: 2 },
          { case: { $in: ["$month", ["March", "Mar"]] }, then: 3 },
          { case: { $in: ["$month", ["April", "Apr"]] }, then: 4 },
          { case: { $in: ["$month", ["May"]] }, then: 5 },
          { case: { $in: ["$month", ["June", "Jun"]] }, then: 6 },
          { case: { $in: ["$month", ["July", "Jul"]] }, then: 7 },
          { case: { $in: ["$month", ["August", "Aug"]] }, then: 8 },
          { case: { $in: ["$month", ["September", "Sep"]] }, then: 9 },
          { case: { $in: ["$month", ["October", "Oct"]] }, then: 10 },
          { case: { $in: ["$month", ["November", "Nov"]] }, then: 11 },
          { case: { $in: ["$month", ["December", "Dec"]] }, then: 12 },
        ],
        default: { $convert: { input: "$month", to: "int", onError: 0, onNull: 0 } },
      },
    };

    // Monthly rent income (last 12 months within FY)
    const monthlyRent = await RentPayment.aggregate([
      { $match: paidRentFyMatch },
      {
        $addFields: {
          analyticsMonth: {
            $cond: [
              { $ifNull: ["$paidDate", false] },
              { $month: "$paidDate" },
              monthToNumberExpr,
            ],
          },
          analyticsYear: {
            $cond: [
              { $ifNull: ["$paidDate", false] },
              { $year: "$paidDate" },
              "$year",
            ],
          },
        },
      },
      { $match: { analyticsMonth: { $gte: 1, $lte: 12 } } },
      { $group: { _id: { month: "$analyticsMonth", year: "$analyticsYear" }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Monthly expenses
    const monthlyExpenses = await Expense.aggregate([
      { $match: { owner: ownerOid, date: { $gte: fyStart, $lte: fyEnd } } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Expenses by category
    const expensesByCategory = await Expense.aggregate([
      { $match: { owner: ownerOid, date: { $gte: fyStart, $lte: fyEnd } } },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
    ]);

    // Fallback: include paid vendor maintenance requests missing linked expense rows
    const missingMaintenance = await getMissingVendorMaintenanceExpenses({ ownerOid, fyStart, fyEnd });
    const monthlyExpensesCombined = mergeAggregateRows(monthlyExpenses, missingMaintenance.monthlyRows);
    const expensesByCategoryCombined = mergeCategoryRows(expensesByCategory, missingMaintenance.categoryRows);

    // Occupancy timeline (per property, count of months occupied vs total months in FY)
    const properties = await Property.find({ owner: ownerId, isActive: true }, "propertyType address status");
    const occupancyData = await Promise.all(
      properties.map(async (p) => {
        const monthsOccupied = await RentPayment.distinct("month", {
          owner: ownerOid,
          property: p._id,
          status: "Paid",
          paidDate: { $gte: fyStart, $lte: fyEnd },
        });
        return {
          propertyId: p._id,
          label: `${p.propertyType} - ${p.address?.city || ""}`,
          monthsOccupied: monthsOccupied.length,
          currentStatus: p.status,
        };
      })
    );

    // Maintenance cost breakdown
    const maintenanceByCategory = await MaintenanceRequest.aggregate([
      { $match: { owner: ownerOid, createdAt: { $gte: fyStart, $lte: fyEnd } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Income statement totals
    const totalRentAgg = await RentPayment.aggregate([
      { $match: paidRentFyMatch },
      { $group: { _id: null, total: { $sum: "$amount" }, lateFees: { $sum: "$lateFeeAmount" } } },
    ]);
    const totalExpensesAgg = await Expense.aggregate([
      { $match: { owner: ownerOid, date: { $gte: fyStart, $lte: fyEnd } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalIncome = totalRentAgg[0]?.total || 0;
    const totalLateFees = totalRentAgg[0]?.lateFees || 0;
    const totalExpensesAmount = (totalExpensesAgg[0]?.total || 0) + missingMaintenance.total;
    const netProfit = totalIncome + totalLateFees - totalExpensesAmount;

    res.status(StatusCodes.OK).json({
      financialYear: `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`,
      fyStart,
      fyEnd,
      incomeStatement: {
        totalRentIncome: totalIncome,
        totalLateFees,
        totalExpenses: totalExpensesAmount,
        netProfit,
      },
      monthlyRent,
      monthlyExpenses: monthlyExpensesCombined,
      expensesByCategory: expensesByCategoryCombined,
      occupancyData,
      maintenanceByCategory,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const downloadTaxReport = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { financialYear } = req.query;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

    if (financialYear && /^\d{4}-\d{2}$/.test(financialYear)) {
      fyStartYear = parseInt(financialYear.split("-")[0], 10);
    }

    const fyStart = new Date(fyStartYear, 3, 1);
    const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
    const fyLabel = `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;

    const ownerOid = toObjectId(ownerId);
    const owner = await User.findById(ownerId, "name email phone");

    const [rentPayments, expenses, properties] = await Promise.all([
      RentPayment.find({ owner: ownerOid, status: "Paid", paidDate: { $gte: fyStart, $lte: fyEnd } })
        .populate("property", "propertyType address")
        .populate("tenant", "name email")
        .sort({ paidDate: 1 }),
      Expense.find({ owner: ownerOid, date: { $gte: fyStart, $lte: fyEnd } })
        .populate("property", "propertyType address")
        .sort({ date: 1 }),
      Property.find({ owner: ownerOid, isActive: true }, "propertyType address"),
    ]);

    const missingMaintenance = await getMissingVendorMaintenanceExpenses({ ownerOid, fyStart, fyEnd });
    const reportExpenses = [...expenses, ...missingMaintenance.entries].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    const totalIncome = rentPayments.reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpenses = reportExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    const doc = new PDFDocument({ margin: 50, size: "A4", bufferPages: true });
    const filename = `tax-report-FY${fyLabel}-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    const contentWidth = doc.page.width - 100;
    let y = 50;

    const ensureSpace = (h) => {
      if (y + h > doc.page.height - 60) { doc.addPage(); y = 50; }
    };

    const sectionHeader = (title) => {
      ensureSpace(32);
      doc.roundedRect(50, y, contentWidth, 24, 5).fill("#1d4ed8");
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(11).text(title, 62, y + 7);
      y += 32;
    };

    const row = (label, value, shade) => {
      ensureSpace(20);
      if (shade) doc.rect(50, y, contentWidth, 18).fill("#f8fafc");
      doc.fillColor("#334155").font("Helvetica").fontSize(9.5).text(label, 62, y + 4, { width: contentWidth * 0.6 });
      doc.fillColor("#0f172a").font("Helvetica-Bold").text(value, 62 + contentWidth * 0.6, y + 4, { width: contentWidth * 0.35, align: "right" });
      doc.rect(50, y, contentWidth, 18).stroke("#e2e8f0");
      y += 20;
    };

    // Cover
    doc.roundedRect(50, y, contentWidth, 80, 10).fill("#1e3a8a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("ANNUAL TAX REPORT", 66, y + 20);
    doc.font("Helvetica").fontSize(11).fillColor("#bfdbfe").text(`Financial Year ${fyLabel}`, 66, y + 50);
    y += 100;

    doc.fillColor("#475569").font("Helvetica").fontSize(10)
      .text(`Owner: ${owner?.name || "-"}`, 50, y)
      .text(`Email: ${owner?.email || "-"}`, 50, y + 14)
      .text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 50, y + 28);
    y += 60;

    // Income Summary
    sectionHeader("INCOME SUMMARY");
    row("Total Rent Collected", formatCurrency(totalIncome), false);
    row("Total Expenses", formatCurrency(totalExpenses), true);
    ensureSpace(22);
    doc.roundedRect(50, y, contentWidth, 22, 4).fill("#dcfce7");
    doc.fillColor("#14532d").font("Helvetica-Bold").fontSize(11)
      .text("NET PROFIT / TAXABLE INCOME", 62, y + 6)
      .text(formatCurrency(netProfit), 62 + contentWidth * 0.6, y + 6, { width: contentWidth * 0.35, align: "right" });
    y += 32;

    // Property-wise income
    sectionHeader("PROPERTY-WISE RENT INCOME");
    const byProperty = {};
    rentPayments.forEach((r) => {
      const pid = String(r.property?._id);
      if (!byProperty[pid]) {
        byProperty[pid] = { label: `${r.property?.propertyType || "-"} - ${r.property?.address?.city || "-"}`, total: 0, count: 0 };
      }
      byProperty[pid].total += r.amount || 0;
      byProperty[pid].count += 1;
    });
    Object.values(byProperty).forEach((p, i) => {
      row(`${p.label} (${p.count} payments)`, formatCurrency(p.total), i % 2 === 0);
    });
    if (Object.keys(byProperty).length === 0) {
      doc.fillColor("#64748b").font("Helvetica").fontSize(9).text("No payments recorded.", 62, y); y += 16;
    }

    // Expense category breakdown
    y += 10;
    sectionHeader("EXPENSES BY CATEGORY");
    const byCat = {};
    reportExpenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    Object.entries(byCat).forEach(([cat, total], i) => {
      row(cat, formatCurrency(total), i % 2 === 0);
    });
    if (reportExpenses.length === 0) {
      doc.fillColor("#64748b").font("Helvetica").fontSize(9).text("No expenses recorded.", 62, y); y += 16;
    }

    // Detailed rent payments table
    y += 10;
    sectionHeader("DETAILED RENT PAYMENTS");
    ensureSpace(18);
    doc.roundedRect(50, y, contentWidth, 16, 3).fill("#dbeafe");
    doc.fillColor("#1e40af").font("Helvetica-Bold").fontSize(8.5)
      .text("Month/Year", 56, y + 4)
      .text("Tenant", 150, y + 4)
      .text("Property", 280, y + 4)
      .text("Amount", 430, y + 4, { width: 80, align: "right" });
    y += 18;
    rentPayments.forEach((r, i) => {
      ensureSpace(16);
      if (i % 2 === 0) doc.rect(50, y, contentWidth, 16).fill("#f8fafc");
      doc.fillColor("#374151").font("Helvetica").fontSize(8.5)
        .text(`${r.month || "-"} ${r.year || ""}`, 56, y + 3)
        .text(r.tenant?.name || "-", 150, y + 3, { width: 120 })
        .text(`${r.property?.propertyType || "-"} ${r.property?.address?.city || ""}`, 280, y + 3, { width: 140 })
        .text(formatCurrency(r.amount), 430, y + 3, { width: 80, align: "right" });
      doc.rect(50, y, contentWidth, 16).stroke("#e2e8f0");
      y += 18;
    });

    // Footer
    doc.addPage();
    y = 50;
    sectionHeader("DISCLAIMER");
    doc.fillColor("#475569").font("Helvetica").fontSize(9)
      .text("This report is auto-generated from your property management records for informational purposes only.", 62, y, { width: contentWidth - 24 });
    y += 16;
    doc.text("Consult a qualified Chartered Accountant for official tax filings (ITR). The figures in this report", 62, y, { width: contentWidth - 24 });
    y += 14;
    doc.text("should be cross-verified with actual bank statements before submission.", 62, y);

    doc.end();
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: Digital Rent Agreement PDF
// ─────────────────────────────────────────────────────────────────────────────

const downloadRentAgreement = async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.leaseId)
      .populate("property", "propertyType address numberOfRooms description")
      .populate("tenant", "name email phone")
      .populate("owner", "name email phone");

    if (!lease) return res.status(StatusCodes.NOT_FOUND).json({ message: "Lease not found." });

    const requesterId = String(req.user.userId);
    const isOwner = req.user.role === "owner" && String(lease.owner?._id) === requesterId;
    const isTenant = req.user.role === "tenant" && String(lease.tenant?._id) === requesterId;
    if (!isOwner && !isTenant) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Not authorized." });
    }

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const filename = `rent-agreement-${lease._id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    const contentWidth = doc.page.width - 100;
    let y = 50;

    const ensureSpace = (h) => {
      if (y + h > doc.page.height - 60) { doc.addPage(); y = 50; }
    };

    // Header
    doc.roundedRect(50, y, contentWidth, 70, 10).fill("#1e3a8a");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(18).text("RESIDENTIAL RENTAL AGREEMENT", 66, y + 18);
    doc.font("Helvetica").fontSize(10).fillColor("#bfdbfe").text("This agreement is computer-generated from lease records.", 66, y + 46);
    y += 85;

    // Preamble
    const leaseStart = lease.leaseStartDate ? new Date(lease.leaseStartDate).toLocaleDateString("en-IN") : "-";
    const leaseEnd = lease.leaseEndDate ? new Date(lease.leaseEndDate).toLocaleDateString("en-IN") : "-";
    const propertyAddress = [
      lease.property?.address?.street,
      lease.property?.address?.city,
      lease.property?.address?.state,
      lease.property?.address?.pincode,
    ].filter(Boolean).join(", ");

    doc.fillColor("#1e293b").font("Helvetica").fontSize(10)
      .text(
        `This Rent Agreement is entered into on ${new Date().toLocaleDateString("en-IN")} between:`,
        50, y, { width: contentWidth }
      );
    y += 22;

    // Parties
    const cardH = 80;
    // Landlord
    doc.roundedRect(50, y, (contentWidth - 14) / 2, cardH, 8).fillAndStroke("#eff6ff", "#bfdbfe");
    doc.fillColor("#1e40af").font("Helvetica-Bold").fontSize(10).text("LANDLORD (First Party)", 62, y + 10);
    doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5)
      .text(lease.owner?.name || "-", 62, y + 28)
      .text(lease.owner?.email || "-", 62, y + 42)
      .text(lease.owner?.phone || "-", 62, y + 56);
    // Tenant
    const tx = 50 + (contentWidth - 14) / 2 + 14;
    doc.roundedRect(tx, y, (contentWidth - 14) / 2, cardH, 8).fillAndStroke("#f0fdf4", "#bbf7d0");
    doc.fillColor("#166534").font("Helvetica-Bold").fontSize(10).text("TENANT (Second Party)", tx + 12, y + 10);
    doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5)
      .text(lease.tenant?.name || "-", tx + 12, y + 28)
      .text(lease.tenant?.email || "-", tx + 12, y + 42)
      .text(lease.tenant?.phone || "-", tx + 12, y + 56);
    y += cardH + 18;

    // Property details
    doc.roundedRect(50, y, contentWidth, 20, 5).fill("#1d4ed8");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("PROPERTY DETAILS", 62, y + 5);
    y += 26;

    const clauseRow = (label, value, shade) => {
      ensureSpace(20);
      if (shade) doc.rect(50, y, contentWidth, 18).fill("#f8fafc");
      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(9).text(label, 62, y + 4, { width: 180 });
      doc.fillColor("#0f172a").font("Helvetica").fontSize(9.5).text(value || "-", 246, y + 4, { width: contentWidth - 200 });
      doc.rect(50, y, contentWidth, 18).stroke("#e2e8f0");
      y += 20;
    };

    clauseRow("Property Type", lease.property?.propertyType || "-", false);
    clauseRow("Address", propertyAddress, true);
    clauseRow("Number of Rooms", String(lease.property?.numberOfRooms || "-"), false);
    clauseRow("Lease Start Date", leaseStart, true);
    clauseRow("Lease End Date", leaseEnd, false);
    clauseRow("Monthly Rent", formatCurrency(lease.rentAmount), true);
    clauseRow("Security Deposit", formatCurrency(lease.securityDeposit || 0), false);
    clauseRow("Rent Due Day", `${lease.rentDueDay || 1}${getDaySuffix(lease.rentDueDay || 1)} of every month`, true);
    clauseRow("Grace Period", `${lease.graceDays || 0} day(s)`, false);
    clauseRow("Late Fee", lease.lateFeeType === "percent" ? `${lease.lateFeeValue || 0}% of monthly rent` : formatCurrency(lease.lateFeeValue || 0), true);
    y += 10;

    // Terms and Conditions
    ensureSpace(28);
    doc.roundedRect(50, y, contentWidth, 20, 5).fill("#1d4ed8");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("TERMS AND CONDITIONS", 62, y + 5);
    y += 28;

    const clauses = [
      "1. The Tenant shall pay the monthly rent on or before the due date specified above.",
      "2. A late fee will be charged as specified above if rent is paid after the grace period.",
      "3. The Security Deposit is refundable at the end of the tenancy, subject to deductions for damages beyond normal wear and tear.",
      "4. The Tenant shall maintain the premises in good condition and shall not cause any damage to the property.",
      "5. The Tenant shall not sublet the property without the prior written consent of the Landlord.",
      "6. The Tenant shall use the premises solely for residential purposes.",
      "7. The Landlord shall be responsible for major structural repairs. The Tenant shall be responsible for minor day-to-day maintenance.",
      "8. Either party may terminate this agreement with 30 days' written notice, subject to the terms of the lease.",
      "9. This agreement is subject to the laws of India and the respective state legislation on rent control.",
      "10. Any disputes arising under this agreement shall be subject to the jurisdiction of courts in the applicable city.",
    ];

    clauses.forEach((clause) => {
      ensureSpace(30);
      doc.fillColor("#1e293b").font("Helvetica").fontSize(9.5)
        .text(clause, 62, y, { width: contentWidth - 24 });
      y += doc.heightOfString(clause, { width: contentWidth - 24 }) + 8;
    });

    // Signatures
    y += 20;
    ensureSpace(120);
    doc.roundedRect(50, y, contentWidth, 20, 5).fill("#1d4ed8");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("SIGNATURES", 62, y + 5);
    y += 28;

    const sigW = (contentWidth - 14) / 2;
    doc.rect(50, y + 50, sigW - 20, 1).stroke("#374151");
    doc.fillColor("#374151").font("Helvetica").fontSize(9)
      .text("Landlord Signature", 50, y + 56)
      .text(lease.owner?.name || "-", 50, y + 68);
    doc.rect(50 + sigW + 14, y + 50, sigW - 20, 1).stroke("#374151");
    doc.fillColor("#374151").font("Helvetica").fontSize(9)
      .text("Tenant Signature", 50 + sigW + 14, y + 56)
      .text(lease.tenant?.name || "-", 50 + sigW + 14, y + 68);
    y += 90;

    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
      .text("This is a computer-generated document. Digital signatures pending. For legal enforceability, please sign physically or via Aadhaar eSign.", 50, y, { width: contentWidth, align: "center" });

    doc.end();
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getDaySuffix = (day) => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: Property Rating & Review System
// ─────────────────────────────────────────────────────────────────────────────

const submitPropertyReview = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const { propertyId, overallRating, maintenanceRating, locationRating, valueRating, title, comment, pros, cons } = req.body;

    if (!propertyId) return res.status(StatusCodes.BAD_REQUEST).json({ message: "propertyId is required." });
    if (!overallRating || !maintenanceRating || !locationRating || !valueRating) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All four ratings are required." });
    }

    const property = await Property.findById(propertyId);
    if (!property) return res.status(StatusCodes.NOT_FOUND).json({ message: "Property not found." });

    // Allow only tenants who have had (or have active) a lease on this property
    const lease = await Lease.findOne({ property: propertyId, tenant: tenantId });
    if (!lease) return res.status(StatusCodes.FORBIDDEN).json({ message: "You can only review a property you have/had a lease for." });

    const existing = await PropertyReview.findOne({ property: propertyId, tenant: tenantId });
    if (existing) return res.status(StatusCodes.CONFLICT).json({ message: "You have already reviewed this property." });

    const review = await PropertyReview.create({
      property: propertyId,
      tenant: tenantId,
      owner: property.owner,
      overallRating: Number(overallRating),
      maintenanceRating: Number(maintenanceRating),
      locationRating: Number(locationRating),
      valueRating: Number(valueRating),
      title: (title || "").trim(),
      comment: (comment || "").trim(),
      pros: (pros || "").trim(),
      cons: (cons || "").trim(),
    });

    await createNotification({
      recipient: property.owner,
      role: "owner",
      title: "New property review",
      message: `${req.user.name || "A tenant"} left a ${overallRating}-star review for your property in ${property.address?.city || "your listing"}.`,
      type: "system",
      actionPath: "/owner/reviews",
      senderName: req.user.name || req.user.email,
    });

    await review.populate("tenant", "name");
    res.status(StatusCodes.CREATED).json({ message: "Review submitted.", review });
  } catch (err) {
    if (err.code === 11000) return res.status(StatusCodes.CONFLICT).json({ message: "You have already reviewed this property." });
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getPropertyReviews = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await PropertyReview.find({ property: propertyId, isPublic: true })
      .populate("tenant", "name")
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? (reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length).toFixed(1)
      : null;

    res.status(StatusCodes.OK).json({ reviews, avgRating, totalReviews: reviews.length });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getOwnerPropertyReviews = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const reviews = await PropertyReview.find({ owner: ownerId })
      .populate("property", "propertyType address")
      .populate("tenant", "name email")
      .sort({ createdAt: -1 });

    // Aggregate per property
    const byProperty = {};
    reviews.forEach((r) => {
      const pid = String(r.property?._id);
      if (!byProperty[pid]) {
        byProperty[pid] = {
          property: r.property,
          reviews: [],
          totalOverall: 0,
        };
      }
      byProperty[pid].reviews.push(r);
      byProperty[pid].totalOverall += r.overallRating;
    });

    const propertySummaries = Object.values(byProperty).map((p) => ({
      property: p.property,
      reviewCount: p.reviews.length,
      avgOverallRating: (p.totalOverall / p.reviews.length).toFixed(1),
    }));

    res.status(StatusCodes.OK).json({ reviews, propertySummaries, totalReviews: reviews.length });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const replyToReview = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Reply text is required." });

    const review = await PropertyReview.findOne({ _id: req.params.id, owner: ownerId });
    if (!review) return res.status(StatusCodes.NOT_FOUND).json({ message: "Review not found." });

    review.ownerReply = reply.trim();
    review.ownerRepliedAt = new Date();
    await review.save();

    res.status(StatusCodes.OK).json({ message: "Reply saved.", review });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantReviews = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const reviews = await PropertyReview.find({ tenant: tenantId })
      .populate("property", "propertyType address")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ reviews });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const review = await PropertyReview.findOneAndDelete({ _id: req.params.id, tenant: tenantId });
    if (!review) return res.status(StatusCodes.NOT_FOUND).json({ message: "Review not found." });
    res.status(StatusCodes.OK).json({ message: "Review deleted." });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE: Razorpay Payment Gateway Integration
// ─────────────────────────────────────────────────────────────────────────────

const getRazorpayInstance = () => {
  const Razorpay = require("razorpay");
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured.");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// POST /tenant/rent/:id/create-payment-order
const createRazorpayOrder = async (req, res) => {
  try {
    const tenantId = req.user.userId;
    const rent = await RentPayment.findOne({ _id: req.params.id, tenant: tenantId });
    if (!rent) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });
    if (rent.status === "Paid") return res.status(StatusCodes.BAD_REQUEST).json({ message: "Rent is already paid." });

    const instance = getRazorpayInstance();
    const amountPaise = Math.round(Number(rent.totalAmount || rent.amount || 0) * 100); // Razorpay uses paise
    if (amountPaise <= 0) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid rent amount." });

    const order = await instance.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `rent_${rent._id}_${Date.now()}`,
      notes: {
        rentId: rent._id.toString(),
        tenantId,
        month: rent.month,
        year: String(rent.year),
      },
    });

    // Save orderId for later verification
    await RentPayment.findByIdAndUpdate(rent._id, { razorpayOrderId: order.id });

    res.status(StatusCodes.OK).json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      rentId: rent._id,
      month: rent.month,
      year: rent.year,
    });
  } catch (err) {
    if (err.message === "Razorpay keys are not configured.") {
      return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: "Online payment is not enabled. Please pay manually." });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// POST /tenant/rent/:id/verify-payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const crypto = require("crypto");
    const tenantId = req.user.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Missing payment verification fields." });
    }

    const rent = await RentPayment.findOne({ _id: req.params.id, tenant: tenantId })
      .populate("property", "propertyType address")
      .populate("tenant", "name email");
    if (!rent) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });

    // Verify Razorpay signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({ message: "Online payment is not enabled." });

    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Payment verification failed. Invalid signature." });
    }

    // Mark rent as paid automatically (online payment = instant verification)
    const paidNow = new Date();
    const receiptNumber = rent.receiptNumber || `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = Number((Number(rent.amount || 0) + Number(rent.lateFeeAmount || 0)).toFixed(2));

    const updatedRent = await RentPayment.findByIdAndUpdate(
      rent._id,
      {
        status: "Paid",
        paidDate: paidNow,
        receiptNumber,
        totalAmount,
        paymentMethod: "online",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentSubmission: {
          status: "Verified",
          transactionId: razorpay_payment_id,
          paidAt: paidNow,
          submittedAt: paidNow,
          notes: "Paid via Razorpay online payment gateway",
        },
      },
      { new: true }
    ).populate("property", "propertyType address").populate("tenant", "name email");

    // Notify tenant
    await createNotification({
      recipient: rent.tenant?._id,
      role: "tenant",
      title: "Rent payment successful",
      message: `Your ${rent.month} ${rent.year} rent payment of ${formatCurrency(totalAmount)} was received via online payment.`,
      type: "rent",
      actionPath: "/tenant/rent",
      metadata: { rentId: rent._id, receiptNumber, paymentId: razorpay_payment_id },
    });

    // Notify owner
    await createNotification({
      recipient: rent.owner,
      role: "owner",
      title: "Online rent payment received",
      message: `${rent.tenant?.name || "Tenant"} paid ${formatCurrency(totalAmount)} for ${rent.month} ${rent.year} via Razorpay.`,
      type: "rent",
      actionPath: "/owner/rent",
      metadata: { rentId: rent._id, receiptNumber, paymentId: razorpay_payment_id },
    });

    res.status(StatusCodes.OK).json({
      message: "Payment verified. Rent marked as paid.",
      rent: updatedRent,
      receiptNumber,
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  VENDOR – AUTH (self-register linking to directory entry)
// ─────────────────────────────────────────────

const vendorRegister = async (req, res) => {
  try {
    res.status(StatusCodes.BAD_REQUEST).json({
      message:
        "Vendor self-registration is disabled. Your account is created automatically when admin approves your vendor request.",
    });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  VENDOR – MAINTENANCE REQUESTS
// ─────────────────────────────────────────────

const getVendorProfile = async (req, res) => {
  try {
    const [vendor, user] = await Promise.all([
      Vendor.findOne({ userId: req.user.userId }),
      User.findById(req.user.userId).select("-password"),
    ]);
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User profile not found." });
    res.status(StatusCodes.OK).json({ vendor, user });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const updateVendorProfile = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      countryCode,
      phone,
      vendorName,
      city,
      specializations,
      notes,
    } = req.body;

    const [vendor, user] = await Promise.all([
      Vendor.findOne({ userId: req.user.userId }),
      User.findById(req.user.userId),
    ]);

    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });
    if (!user) return res.status(StatusCodes.NOT_FOUND).json({ message: "User profile not found." });

    const normalizedFirst = (firstName || user.firstName || "").trim();
    const normalizedMiddle = (middleName !== undefined ? middleName : user.middleName || "").trim();
    const normalizedLast = (lastName || user.lastName || "").trim();
    const normalizedName = [normalizedFirst, normalizedMiddle, normalizedLast].filter(Boolean).join(" ");
    const normalizedEmail = (email || user.email || "").trim().toLowerCase();
    const normalizedCountryCode = ((countryCode || user.countryCode || "+91") + "").trim();
    const normalizedPhoneDigits = (phone || user.phone || "").toString().replace(/\D/g, "");

    if (!normalizedFirst || !normalizedLast || !normalizedEmail || !normalizedPhoneDigits) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "First name, last name, email and phone are required.",
      });
    }

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.userId } });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Email already in use by another account." });
    }

    user.firstName = normalizedFirst;
    user.middleName = normalizedMiddle;
    user.lastName = normalizedLast;
    user.name = normalizedName;
    user.email = normalizedEmail;
    user.countryCode = normalizedCountryCode;
    user.phone = `${normalizedCountryCode}${normalizedPhoneDigits}`;
    await user.save();

    if (vendorName !== undefined) vendor.name = String(vendorName || "").trim() || vendor.name;
    if (city !== undefined) vendor.city = String(city || "").trim();
    if (notes !== undefined) vendor.notes = String(notes || "").trim();
    if (email !== undefined) vendor.email = normalizedEmail;
    if (phone !== undefined) vendor.phone = normalizedPhoneDigits;
    if (Array.isArray(specializations)) {
      const cleanSpecs = specializations
        .map((s) => String(s || "").trim())
        .filter((s) => ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"].includes(s));
      vendor.specializations = cleanSpecs.length ? cleanSpecs : ["General"];
    }

    await vendor.save();

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(StatusCodes.OK).json({ message: "Vendor profile updated.", user: safeUser, vendor });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getVendorMaintenanceRequests = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });

    const { status } = req.query;
    const filter = { assignedVendor: vendor._id };
    if (status) filter.status = status;

    const requests = await MaintenanceRequest.find(filter)
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("owner", "name email phone")
      .populate("assignedVendor", "name phone email specializations")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({ requests, vendor });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const submitVendorQuote = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });

    const { amount, description } = req.body;
    if (!amount || !description) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Quote amount and description are required." });
    }

    const request = await MaintenanceRequest.findOne({ _id: req.params.id, assignedVendor: vendor._id });
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (request.quoteStatus === "Approved") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Quote already approved. Cannot resubmit." });
    }

    request.vendorQuote = { amount: Number(amount), description, submittedAt: new Date() };
    request.quoteStatus = "Pending";
    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("owner", "name email")
      .populate("tenant", "name");

    await createNotification({
      recipient: populated.owner?._id,
      role: "owner",
      title: "Vendor submitted a quote",
      message: `${vendor.name} submitted a quote of ₹${Number(amount).toLocaleString("en-IN")} for the ${request.category} request.`,
      type: "maintenance",
      actionPath: "/owner/maintenance",
      metadata: { requestId: request._id },
    });

    res.status(StatusCodes.OK).json({ message: "Quote submitted. Awaiting owner approval.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const uploadVendorWorkPhotos = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });

    const request = await MaintenanceRequest.findOne({ _id: req.params.id, assignedVendor: vendor._id });
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (!req.files || req.files.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No photos uploaded." });
    }

    const photoPaths = req.files.map((f) => `/uploads/maintenance/${path.basename(f.filename)}`);
    request.vendorWorkPhotos = [...(request.vendorWorkPhotos || []), ...photoPaths];
    await request.save();

    res.status(StatusCodes.OK).json({ message: "Work photos uploaded.", vendorWorkPhotos: request.vendorWorkPhotos });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const markVendorWorkComplete = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });

    const request = await MaintenanceRequest.findOne({ _id: req.params.id, assignedVendor: vendor._id });
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (request.quoteStatus !== "Approved") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Quote must be approved before marking work as complete." });
    }

    request.workCompletedAt = new Date();
    request.status = "Resolved";
    await request.save();

    const populated = await MaintenanceRequest.findById(request._id)
      .populate("owner", "name email")
      .populate("tenant", "name email");

    await createNotification({
      recipient: populated.owner?._id,
      role: "owner",
      title: "Vendor marked work as complete",
      message: `${vendor.name} has completed the ${request.category} maintenance work.`,
      type: "maintenance",
      actionPath: "/owner/maintenance",
      metadata: { requestId: request._id },
    });

    await createNotification({
      recipient: populated.tenant?._id,
      role: "tenant",
      title: "Maintenance work completed",
      message: `The ${request.category} issue has been resolved by the vendor.`,
      type: "maintenance",
      actionPath: "/tenant/maintenance",
      metadata: { requestId: request._id },
    });

    res.status(StatusCodes.OK).json({ message: "Work marked as complete.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const raiseVendorPaymentRequest = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId });
    if (!vendor) return res.status(StatusCodes.NOT_FOUND).json({ message: "Vendor profile not found." });

    const { amount, description } = req.body;
    if (!amount) return res.status(StatusCodes.BAD_REQUEST).json({ message: "Payment amount is required." });

    const request = await MaintenanceRequest.findOne({ _id: req.params.id, assignedVendor: vendor._id });
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (!request.workCompletedAt) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Work must be marked complete before raising a payment request." });
    }

    if (request.vendorPaymentRequest?.status === "Paid") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Payment already completed." });
    }

    request.vendorPaymentRequest = {
      amount: Number(amount),
      description: description || `Payment for ${request.category} maintenance work`,
      raisedAt: new Date(),
      status: "Pending",
    };
    await request.save();

    const populated = await MaintenanceRequest.findById(request._id).populate("owner", "name email");

    await createNotification({
      recipient: populated.owner?._id,
      role: "owner",
      title: "Vendor raised a payment request",
      message: `${vendor.name} is requesting payment of ₹${Number(amount).toLocaleString("en-IN")} for ${request.category} work.`,
      type: "maintenance",
      actionPath: "/owner/maintenance",
      metadata: { requestId: request._id },
    });

    res.status(StatusCodes.OK).json({ message: "Payment request raised. Awaiting owner payment.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
//  OWNER – VENDOR QUOTE DECISION & PAYMENT
// ─────────────────────────────────────────────

const decideVendorQuote = async (req, res) => {
  try {
    const { decision, rejectionNote } = req.body;
    if (!["Approved", "Rejected"].includes(decision)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Decision must be Approved or Rejected." });
    }

    const request = await MaintenanceRequest.findOne({ _id: req.params.id, owner: req.user.userId })
      .populate("assignedVendor", "name email userId")
      .populate("tenant", "name email");
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });
    if (request.quoteStatus !== "Pending") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No pending quote to decide on." });
    }

    request.quoteStatus = decision;
    if (decision === "Approved" && request.status === "Open") {
      request.status = "In Progress";
    }
    if (rejectionNote) {
      request.comments = request.comments || [];
      request.comments.push({ text: `Quote rejected: ${rejectionNote}`, addedBy: req.user.userId });
    }
    await request.save();

    // Notify the vendor user if linked
    if (request.assignedVendor?.userId) {
      await createNotification({
        recipient: request.assignedVendor.userId,
        role: "vendor",
        title: `Quote ${decision.toLowerCase()}`,
        message: decision === "Approved"
          ? `Your quote of ₹${Number(request.vendorQuote?.amount || 0).toLocaleString("en-IN")} was approved. Please proceed with the work.`
          : `Your quote was rejected.${rejectionNote ? ` Reason: ${rejectionNote}` : ""}`,
        type: "maintenance",
        actionPath: "/vendor/maintenance",
        metadata: { requestId: request._id },
      });
    }

    res.status(StatusCodes.OK).json({ message: `Quote ${decision.toLowerCase()}.`, request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const completeVendorPayment = async (req, res) => {
  try {
    const { paymentNote } = req.body;
    const request = await MaintenanceRequest.findOne({ _id: req.params.id, owner: req.user.userId })
      .populate("property", "propertyType address")
      .populate("assignedVendor", "name email userId")
      .populate("tenant", "name email");
    if (!request) return res.status(StatusCodes.NOT_FOUND).json({ message: "Maintenance request not found." });

    if (request.vendorPaymentRequest?.status !== "Pending") {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "No pending payment request to complete." });
    }

    request.vendorPaymentRequest.status = "Paid";
    request.vendorPaymentRequest.paidAt = new Date();

    if (request.assignedVendor?.userId) {
      await createNotification({
        recipient: request.assignedVendor.userId,
        role: "vendor",
        title: "Payment completed",
        message: `The owner has completed payment of ₹${Number(request.vendorPaymentRequest?.amount || 0).toLocaleString("en-IN")} for the ${request.category} work.`,
        type: "maintenance",
        actionPath: "/vendor/maintenance",
        metadata: { requestId: request._id },
      });
    }

    if (paymentNote) {
      request.comments = request.comments || [];
      request.comments.push({ text: `Payment note: ${paymentNote}`, addedBy: req.user.userId });
    }

    await request.save();

    const expenseAmount = parseMoney(
      request.vendorQuote?.amount || request.vendorPaymentRequest?.amount || 0
    );
    if (expenseAmount > 0 && request.property) {
      await Expense.create({
        owner: req.user.userId,
        property: request.property._id,
        source: "vendor-maintenance",
        maintenanceRequest: request._id,
        category: "Maintenance",
        title: `Vendor maintenance - ${request.category}`,
        amount: expenseAmount,
        date: request.vendorPaymentRequest.paidAt,
        notes: [
          request.assignedVendor?.name ? `Vendor: ${request.assignedVendor.name}` : null,
          request.vendorQuote?.description ? `Quote: ${request.vendorQuote.description}` : null,
          paymentNote ? `Owner note: ${paymentNote}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      });
    }

    res.status(StatusCodes.OK).json({ message: "Payment marked as completed.", request });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

module.exports = {
  // Auth
  signUp,
  signIn,
  forgotPassword,
  getProfile,
  updateProfile,
  uploadProfilePicture,
  // Owner – Property
  addProperty,
  getOwnerProperties,
  getPublicProperties,
  submitVendorLead,
  getPropertyById,
  updateProperty,
  uploadPropertyPhotos,
  removePropertyPhoto,
  deleteProperty,
  createPropertyInquiry,
  getOwnerInquiries,
  updateOwnerInquiryStatus,
  // Owner – Tenants
  getTenantUsers,
  assignTenant,
  getOwnerLeases,
  updateLease,
  terminateLease,
  // Owner – Rent
  generateRentRecord,
  getOwnerRentPayments,
  updateRentPaymentInstructions,
  markRentPaid,
  markRentOverdue,
  downloadRentReceipt,
  exportOwnerRentCsv,
  // Owner – Payment Details
  getOwnerPaymentDetails,
  updateOwnerPaymentDetails,
  deleteOwnerPaymentDetails,
  uploadOwnerPaymentQrCode,
  // Owner – Vacancy
  getVacantProperties,
  updatePropertyStatus,
  // Owner – Maintenance
  getOwnerMaintenanceRequests,
  updateMaintenanceStatus,
  addCommentToRequest,
  // Owner – Vendors
  getOwnerVendors,
  assignVendorToMaintenanceRequest,
  decideVendorQuote,
  completeVendorPayment,
  // Vendor Portal
  vendorRegister,
  getVendorProfile,
  updateVendorProfile,
  getVendorMaintenanceRequests,
  submitVendorQuote,
  uploadVendorWorkPhotos,
  markVendorWorkComplete,
  raiseVendorPaymentRequest,
  // Admin – Vendors
  getAdminVendors,
  createAdminVendor,
  updateAdminVendor,
  deleteAdminVendor,
  getAdminVendorLeads,
  updateAdminVendorLeadStatus,
  getAdminStats,
  getAdminEntityList,
  // Owner – Dashboard
  getOwnerDashboard,
  getOwnerAnalytics,
  exportOwnerAnalyticsCsv,
  // Tenant
  getTenantDashboard,
  getTenantLease,
  getTenantRentHistory,
  submitTenantRentPayment,
  getTenantOwnerPaymentDetails,
  getTenantInquiries,
  requestTenantRevisit,
  createMaintenanceRequest,
  getTenantMaintenanceRequests,
  createMoveOutRequest,
  getTenantMoveOutRequests,
  getOwnerMoveOutRequests,
  decideMoveOutRequest,
  completeMoveOutRequest,
  createLeaseRenewal,
  getOwnerLeaseRenewals,
  cancelLeaseRenewal,
  getTenantLeaseRenewals,
  decideLeaseRenewal,
  uploadOwnerComplianceDocument,
  getOwnerComplianceDocuments,
  verifyComplianceDocument,
  uploadTenantComplianceDocument,
  getTenantComplianceDocuments,
  getNotifications,
  markNotificationRead,
  // Features Document
  generateFeaturesDocument,
  // Expenses
  addExpense,
  getOwnerExpenses,
  updateExpense,
  deleteExpense,
  // Advanced Analytics & Tax
  getAdvancedAnalytics,
  downloadTaxReport,
  // Rent Agreement
  downloadRentAgreement,
  // Reviews
  submitPropertyReview,
  getPropertyReviews,
  getOwnerPropertyReviews,
  replyToReview,
  getTenantReviews,
  deleteReview,
  // Razorpay Payment Gateway
  createRazorpayOrder,
  verifyRazorpayPayment,
};
