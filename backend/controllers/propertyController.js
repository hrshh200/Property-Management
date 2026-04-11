const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Property = require("../models/Property");
const Lease = require("../models/Lease");
const RentPayment = require("../models/RentPayment");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const MoveOutRequest = require("../models/MoveOutRequest");
const ComplianceDocument = require("../models/ComplianceDocument");
const LeaseRenewal = require("../models/LeaseRenewal");
const Notification = require("../models/Notification");
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

const createNotification = async ({ recipient, role, title, message, type = "system", actionPath, metadata }) => {
  try {
    await Notification.create({ recipient, role, title, message, type, actionPath, metadata });
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
    const user = await User.findOne({ email: email.toLowerCase() });
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
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
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
    const leases = await Lease.find({ owner: req.user.userId, isActive: true })
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
    const { leaseId, month, year, dueDate, notes } = req.body;
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

const markRentPaid = async (req, res) => {
  try {
    const { paidDate, notes } = req.body;

    const rentRecord = await RentPayment.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!rentRecord) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });

    const receiptNumber = rentRecord.receiptNumber || `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = Number((Number(rentRecord.amount || 0) + Number(rentRecord.lateFeeAmount || 0)).toFixed(2));

    const rent = await RentPayment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      {
        status: "Paid",
        paidDate: paidDate || new Date(),
        notes,
        receiptNumber,
        totalAmount,
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
    let modifiedCount = 0;

    for (const record of records) {
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
        message: `${record.month} ${record.year} rent is overdue. Late fee applied: $${Number(lateFeeAmount).toFixed(2)}.`,
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
//  OWNER – DASHBOARD STATS
// ─────────────────────────────────────────────

const getOwnerDashboard = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const [totalProperties, vacantProperties, occupiedProperties, activeLeases,
      totalRent, pendingRent, overdueRent, openMaintenanceRequests] = await Promise.all([
      Property.countDocuments({ owner: ownerId, isActive: true }),
      Property.countDocuments({ owner: ownerId, isActive: true, status: "Vacant" }),
      Property.countDocuments({ owner: ownerId, isActive: true, status: "Occupied" }),
      Lease.countDocuments({ owner: ownerId, isActive: true }),
      RentPayment.countDocuments({ owner: ownerId }),
      RentPayment.countDocuments({ owner: ownerId, status: "Pending" }),
      RentPayment.countDocuments({ owner: ownerId, status: "Overdue" }),
      MaintenanceRequest.countDocuments({ owner: ownerId, status: { $in: ["Open", "In Progress"] } }),
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
        totalPaidAmount,
      },
    });
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

    doc.fontSize(20).text("Rent Payment Receipt", { align: "center" });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Receipt No: ${rent.receiptNumber || "N/A"}`);
    doc.text(`Month/Year: ${rent.month} ${rent.year}`);
    doc.text(`Paid Date: ${rent.paidDate ? new Date(rent.paidDate).toLocaleDateString() : "N/A"}`);
    doc.moveDown();
    doc.text(`Tenant: ${rent.tenant?.name || "-"}`);
    doc.text(`Owner: ${rent.owner?.name || "-"}`);
    doc.text(`Property: ${rent.property?.propertyType || "-"}`);
    doc.text(
      `Address: ${rent.property?.address?.street || ""}, ${rent.property?.address?.city || ""}, ${rent.property?.address?.state || ""}`
    );
    doc.moveDown();
    doc.text(`Base Rent: $${Number(rent.amount || 0).toFixed(2)}`);
    doc.text(`Late Fee: $${Number(rent.lateFeeAmount || 0).toFixed(2)}`);
    doc.font("Helvetica-Bold").text(`Total Paid: $${Number(rent.totalAmount || rent.amount || 0).toFixed(2)}`);
    doc.font("Helvetica");

    if (rent.notes) {
      doc.moveDown();
      doc.text(`Notes: ${rent.notes}`);
    }

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

module.exports = {
  // Auth
  signUp,
  signIn,
  forgotPassword,
  getProfile,
  updateProfile,
  // Owner – Property
  addProperty,
  getOwnerProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  // Owner – Tenants
  getTenantUsers,
  assignTenant,
  getOwnerLeases,
  updateLease,
  terminateLease,
  // Owner – Rent
  generateRentRecord,
  getOwnerRentPayments,
  markRentPaid,
  markRentOverdue,
  downloadRentReceipt,
  exportOwnerRentCsv,
  // Owner – Vacancy
  getVacantProperties,
  updatePropertyStatus,
  // Owner – Maintenance
  getOwnerMaintenanceRequests,
  updateMaintenanceStatus,
  addCommentToRequest,
  // Owner – Dashboard
  getOwnerDashboard,
  getOwnerAnalytics,
  exportOwnerAnalyticsCsv,
  // Tenant
  getTenantDashboard,
  getTenantLease,
  getTenantRentHistory,
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
};
