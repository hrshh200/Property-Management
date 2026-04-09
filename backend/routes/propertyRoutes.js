const express = require("express");
const router = express.Router();
const { verifyToken, requireOwner, requireTenant } = require("../middleware/authMiddleware");
const { uploadMaintenancePhotos, uploadComplianceDocument } = require("../middleware/uploadMiddleware");
const {
  signUp, signIn, getProfile, updateProfile,
  addProperty, getOwnerProperties, getPropertyById, updateProperty, deleteProperty,
  getTenantUsers, assignTenant, getOwnerLeases, updateLease, terminateLease,
  generateRentRecord, getOwnerRentPayments, markRentPaid, markRentOverdue,
  getVacantProperties, updatePropertyStatus,
  getOwnerMaintenanceRequests, updateMaintenanceStatus, addCommentToRequest,
  getOwnerDashboard,
  getTenantDashboard, getTenantLease, getTenantRentHistory,
  createMaintenanceRequest, getTenantMaintenanceRequests,
  createMoveOutRequest, getTenantMoveOutRequests,
  getOwnerMoveOutRequests, decideMoveOutRequest, completeMoveOutRequest,
  uploadOwnerComplianceDocument, getOwnerComplianceDocuments,
  uploadTenantComplianceDocument, getTenantComplianceDocuments,
} = require("../controllers/propertyController");

// ── Auth ──────────────────────────────────────
router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.get("/auth/profile", verifyToken, getProfile);
router.put("/auth/profile", verifyToken, updateProfile);

// ── Owner – Dashboard ─────────────────────────
router.get("/owner/dashboard", verifyToken, requireOwner, getOwnerDashboard);

// ── Owner – Properties ────────────────────────
router.post("/owner/properties", verifyToken, requireOwner, addProperty);
router.get("/owner/properties", verifyToken, requireOwner, getOwnerProperties);
router.get("/owner/properties/:id", verifyToken, requireOwner, getPropertyById);
router.put("/owner/properties/:id", verifyToken, requireOwner, updateProperty);
router.delete("/owner/properties/:id", verifyToken, requireOwner, deleteProperty);
router.patch("/owner/properties/:id/status", verifyToken, requireOwner, updatePropertyStatus);

// ── Owner – Vacancy ───────────────────────────
router.get("/owner/vacancies", verifyToken, requireOwner, getVacantProperties);

// ── Owner – Tenants & Leases ──────────────────
router.get("/owner/tenant-users", verifyToken, requireOwner, getTenantUsers);
router.post("/owner/leases", verifyToken, requireOwner, assignTenant);
router.get("/owner/leases", verifyToken, requireOwner, getOwnerLeases);
router.put("/owner/leases/:id", verifyToken, requireOwner, updateLease);
router.patch("/owner/leases/:id/terminate", verifyToken, requireOwner, terminateLease);

// ── Owner – Rent ──────────────────────────────
router.post("/owner/rent", verifyToken, requireOwner, generateRentRecord);
router.get("/owner/rent", verifyToken, requireOwner, getOwnerRentPayments);
router.patch("/owner/rent/:id/paid", verifyToken, requireOwner, markRentPaid);
router.post("/owner/rent/mark-overdue", verifyToken, requireOwner, markRentOverdue);

// ── Owner – Maintenance ───────────────────────
router.get("/owner/maintenance", verifyToken, requireOwner, getOwnerMaintenanceRequests);
router.patch("/owner/maintenance/:id/status", verifyToken, requireOwner, updateMaintenanceStatus);
router.post("/owner/maintenance/:id/comment", verifyToken, requireOwner, addCommentToRequest);

// ── Owner – Move-Out Requests ──────────────────
router.get("/owner/move-out", verifyToken, requireOwner, getOwnerMoveOutRequests);
router.patch("/owner/move-out/:id/decision", verifyToken, requireOwner, decideMoveOutRequest);
router.patch("/owner/move-out/:id/complete", verifyToken, requireOwner, completeMoveOutRequest);

// ── Owner – Compliance Documents ───────────────
router.get("/owner/compliance-documents", verifyToken, requireOwner, getOwnerComplianceDocuments);
router.post(
  "/owner/compliance-documents",
  verifyToken,
  requireOwner,
  uploadComplianceDocument.single("document"),
  uploadOwnerComplianceDocument
);

// ── Tenant – Dashboard ────────────────────────
router.get("/tenant/dashboard", verifyToken, requireTenant, getTenantDashboard);

// ── Tenant – Lease & Rent ─────────────────────
router.get("/tenant/lease", verifyToken, requireTenant, getTenantLease);
router.get("/tenant/rent-history", verifyToken, requireTenant, getTenantRentHistory);

// ── Tenant – Maintenance ──────────────────────
router.post(
  "/tenant/maintenance",
  verifyToken,
  requireTenant,
  uploadMaintenancePhotos.array("photos", 5),
  createMaintenanceRequest
);
router.get("/tenant/maintenance", verifyToken, requireTenant, getTenantMaintenanceRequests);

// ── Tenant – Move-Out Requests ─────────────────
router.post("/tenant/move-out", verifyToken, requireTenant, createMoveOutRequest);
router.get("/tenant/move-out", verifyToken, requireTenant, getTenantMoveOutRequests);

// ── Tenant – Compliance Documents ──────────────
router.get("/tenant/compliance-documents", verifyToken, requireTenant, getTenantComplianceDocuments);
router.post(
  "/tenant/compliance-documents",
  verifyToken,
  requireTenant,
  uploadComplianceDocument.single("document"),
  uploadTenantComplianceDocument
);

module.exports = router;
