const express = require("express");
const router = express.Router();
const { verifyToken, requireOwner, requireTenant } = require("../middleware/authMiddleware");
const { uploadMaintenancePhotos, uploadComplianceDocument, uploadPaymentQrCode } = require("../middleware/uploadMiddleware");
const {
  signUp, signIn, forgotPassword, getProfile, updateProfile,
  addProperty, getOwnerProperties, getPropertyById, updateProperty, deleteProperty,
  getPublicProperties, createPropertyInquiry, getOwnerInquiries, updateOwnerInquiryStatus,
  getTenantUsers, assignTenant, getOwnerLeases, updateLease, terminateLease,
  generateRentRecord, getOwnerRentPayments, updateRentPaymentInstructions, markRentPaid, markRentOverdue,
  getVacantProperties, updatePropertyStatus,
  getOwnerMaintenanceRequests, updateMaintenanceStatus, addCommentToRequest,
  getOwnerDashboard, getOwnerAnalytics, exportOwnerAnalyticsCsv,
  getTenantDashboard, getTenantLease, getTenantRentHistory, submitTenantRentPayment, getTenantOwnerPaymentDetails, getTenantInquiries,
  createMaintenanceRequest, getTenantMaintenanceRequests,
  createMoveOutRequest, getTenantMoveOutRequests,
  getOwnerMoveOutRequests, decideMoveOutRequest, completeMoveOutRequest,
  createLeaseRenewal, getOwnerLeaseRenewals, cancelLeaseRenewal,
  getTenantLeaseRenewals, decideLeaseRenewal,
  downloadRentReceipt, exportOwnerRentCsv,
  uploadOwnerComplianceDocument, getOwnerComplianceDocuments,
  verifyComplianceDocument,
  uploadTenantComplianceDocument, getTenantComplianceDocuments,
  getNotifications, markNotificationRead,
  getOwnerPaymentDetails,
  updateOwnerPaymentDetails,
  deleteOwnerPaymentDetails,
  uploadOwnerPaymentQrCode,
} = require("../controllers/propertyController");

// ── Auth ──────────────────────────────────────
router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.post("/auth/forgot-password", forgotPassword);
router.get("/auth/profile", verifyToken, getProfile);
router.put("/auth/profile", verifyToken, updateProfile);

// ── Public – Property Discovery ──────────────
router.get("/properties/public", getPublicProperties);

// ── Owner – Dashboard ─────────────────────────
router.get("/owner/dashboard", verifyToken, requireOwner, getOwnerDashboard);
router.get("/owner/analytics", verifyToken, requireOwner, getOwnerAnalytics);
router.get("/owner/analytics/export", verifyToken, requireOwner, exportOwnerAnalyticsCsv);
router.get("/owner/inquiries", verifyToken, requireOwner, getOwnerInquiries);
router.patch("/owner/inquiries/:id/status", verifyToken, requireOwner, updateOwnerInquiryStatus);

// ── Owner – Properties ────────────────────────
router.post("/owner/properties", verifyToken, requireOwner, addProperty);
router.get("/owner/properties", verifyToken, requireOwner, getOwnerProperties);
router.get("/owner/properties/:id", verifyToken, requireOwner, getPropertyById);
router.put("/owner/properties/:id", verifyToken, requireOwner, updateProperty);
router.delete("/owner/properties/:id", verifyToken, requireOwner, deleteProperty);
router.patch("/owner/properties/:id/status", verifyToken, requireOwner, updatePropertyStatus);
router.post("/properties/:id/inquiries", verifyToken, createPropertyInquiry);

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
router.patch("/owner/rent/:id/payment-instructions", verifyToken, requireOwner, updateRentPaymentInstructions);
router.patch("/owner/rent/:id/paid", verifyToken, requireOwner, markRentPaid);
router.post("/owner/rent/mark-overdue", verifyToken, requireOwner, markRentOverdue);
router.get("/owner/rent/export", verifyToken, requireOwner, exportOwnerRentCsv);
router.get("/rent/:id/receipt", verifyToken, downloadRentReceipt);

// ── Owner – Payment Details ────────────────────
router.get("/owner/payment-details", verifyToken, requireOwner, getOwnerPaymentDetails);
router.put("/owner/payment-details", verifyToken, requireOwner, updateOwnerPaymentDetails);
router.delete("/owner/payment-details", verifyToken, requireOwner, deleteOwnerPaymentDetails);
router.post(
  "/owner/payment-details/qr-upload",
  verifyToken,
  requireOwner,
  uploadPaymentQrCode.single("qrCode"),
  uploadOwnerPaymentQrCode
);

// ── Owner – Renewals ─────────────────────────
router.get("/owner/renewals", verifyToken, requireOwner, getOwnerLeaseRenewals);
router.post("/owner/renewals", verifyToken, requireOwner, createLeaseRenewal);
router.patch("/owner/renewals/:id/cancel", verifyToken, requireOwner, cancelLeaseRenewal);

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
router.patch("/owner/compliance-documents/:id/verify", verifyToken, requireOwner, verifyComplianceDocument);
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
router.post("/tenant/rent/:id/submit-payment", verifyToken, requireTenant, submitTenantRentPayment);
router.get("/tenant/owner-payment-details", verifyToken, requireTenant, getTenantOwnerPaymentDetails);
router.get("/tenant/inquiries", verifyToken, requireTenant, getTenantInquiries);
router.get("/tenant/renewals", verifyToken, requireTenant, getTenantLeaseRenewals);
router.patch("/tenant/renewals/:id/decision", verifyToken, requireTenant, decideLeaseRenewal);

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

// ── Notifications ────────────────────────────
router.get("/notifications", verifyToken, getNotifications);
router.patch("/notifications/:id/read", verifyToken, markNotificationRead);

module.exports = router;
