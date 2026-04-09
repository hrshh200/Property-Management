const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Property = require("../models/Property");
const Lease = require("../models/Lease");
const RentPayment = require("../models/RentPayment");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const MoveOutRequest = require("../models/MoveOutRequest");
const ComplianceDocument = require("../models/ComplianceDocument");
const { StatusCodes } = require("http-status-codes");

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────

const signUp = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "All fields are required." });
    }
    if (!["owner", "tenant"].includes(role)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Role must be owner or tenant." });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ message: "Email already registered." });
    }
    const user = await User.create({ name, email, password, phone, role });
    const token = jwt.sign(
      { userId: user._id, role: user.role, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.status(StatusCodes.CREATED).json({
      message: "Registration successful.",
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
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
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone },
      { new: true, runValidators: true }
    ).select("-password");
    res.status(StatusCodes.OK).json({ message: "Profile updated.", user });
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
    const { propertyId, tenantId, leaseStartDate, leaseEndDate, rentAmount, securityDeposit, rentDueDay } = req.body;
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
    const { leaseStartDate, leaseEndDate, rentAmount, securityDeposit, rentDueDay } = req.body;
    const lease = await Lease.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { leaseStartDate, leaseEndDate, rentAmount, securityDeposit, rentDueDay },
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
    const lease = await Lease.findOne({ _id: leaseId, owner: req.user.userId, isActive: true });
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
      dueDate,
      month,
      year,
      notes,
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
    const rent = await RentPayment.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      { status: "Paid", paidDate: paidDate || new Date(), notes },
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email");
    if (!rent) return res.status(StatusCodes.NOT_FOUND).json({ message: "Rent record not found." });
    res.status(StatusCodes.OK).json({ message: "Rent marked as paid.", rent });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const markRentOverdue = async (req, res) => {
  try {
    const updated = await RentPayment.updateMany(
      { owner: req.user.userId, status: "Pending", dueDate: { $lt: new Date() } },
      { status: "Overdue" }
    );
    res.status(StatusCodes.OK).json({ message: `${updated.modifiedCount} rent record(s) marked overdue.` });
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
    const { status, propertyId } = req.query;
    const filter = { owner: req.user.userId };
    if (status) filter.status = status;
    if (propertyId) filter.property = propertyId;
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
      { $match: { owner: require("mongoose").Types.ObjectId.createFromHexString(ownerId), status: "Paid" } },
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

    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true });
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
      description,
      photos,
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

    const lease = await Lease.findOne({ tenant: req.user.userId, isActive: true });
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

    res.status(StatusCodes.OK).json({ message: "Move-out request updated.", request: updatedRequest });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const completeMoveOutRequest = async (req, res) => {
  try {
    const { completionNote } = req.body;

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

    await Lease.findOneAndUpdate(
      { _id: request.lease, owner: req.user.userId, isActive: true },
      { isActive: false }
    );

    await Property.findOneAndUpdate(
      { _id: request.property, owner: req.user.userId },
      { status: "Vacant" }
    );

    const updatedRequest = await MoveOutRequest.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.userId },
      {
        status: "Completed",
        completedAt: new Date(),
        completionNote: completionNote || "Move-out completed and property handed over.",
      },
      { new: true }
    )
      .populate("property", "propertyType address")
      .populate("tenant", "name email phone")
      .populate("lease", "leaseStartDate leaseEndDate rentAmount");

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

    res.status(StatusCodes.CREATED).json({ message: "Document uploaded.", document: doc });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

const getTenantComplianceDocuments = async (req, res) => {
  try {
    const documents = await ComplianceDocument.find({ tenant: req.user.userId })
      .populate("property", "propertyType address")
      .sort({ createdAt: -1 });
    res.status(StatusCodes.OK).json({ documents });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: err.message });
  }
};

module.exports = {
  // Auth
  signUp,
  signIn,
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
  // Owner – Vacancy
  getVacantProperties,
  updatePropertyStatus,
  // Owner – Maintenance
  getOwnerMaintenanceRequests,
  updateMaintenanceStatus,
  addCommentToRequest,
  // Owner – Dashboard
  getOwnerDashboard,
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
  uploadOwnerComplianceDocument,
  getOwnerComplianceDocuments,
  uploadTenantComplianceDocument,
  getTenantComplianceDocuments,
};
