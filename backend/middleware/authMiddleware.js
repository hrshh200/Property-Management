const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided. Unauthorized." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const requireOwner = (req, res, next) => {
  if (req.user.role !== "owner") {
    return res.status(403).json({ message: "Access denied. Owner only." });
  }
  next();
};

const requireTenant = (req, res, next) => {
  if (req.user.role !== "tenant") {
    return res.status(403).json({ message: "Access denied. Tenant only." });
  }
  next();
};

const requireVendor = (req, res, next) => {
  if (req.user.role !== "vendor") {
    return res.status(403).json({ message: "Access denied. Vendor only." });
  }
  next();
};

const requireAdmin = async (req, res, next) => {
  try {
    const defaultAdminEmail = String(process.env.ADMIN_LOGIN_EMAIL || "admin@admin.com").trim().toLowerCase();
    const tokenEmail = String(req.user?.email || "").trim().toLowerCase();

    if (req.user?.role === "admin" && tokenEmail === defaultAdminEmail) {
      return next();
    }

    const allowList = String(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (allowList.length === 0) {
      return res.status(503).json({ message: "Admin access is not configured." });
    }

    const user = await User.findById(req.user.userId).select("email");
    const email = String(user?.email || "").trim().toLowerCase();
    if (!email || !allowList.includes(email)) {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    next();
  } catch (err) {
    return res.status(500).json({ message: "Unable to verify admin access." });
  }
};

module.exports = { verifyToken, requireOwner, requireTenant, requireVendor, requireAdmin };
