const express = require("express");
const router = express.Router();
const { verifyToken, requireOwner, requireTenant, requireVendor, requireAdmin } = require("../middleware/authMiddleware");
const { uploadMaintenancePhotos, uploadComplianceDocument, uploadPaymentQrCode, uploadProfilePicture, uploadPropertyPhotos } = require("../middleware/uploadMiddleware");
const {
  signUp, signIn, forgotPassword, getProfile, updateProfile,
  uploadProfilePicture: uploadProfilePictureController,
  addProperty, getOwnerProperties, getPropertyById, updateProperty, uploadPropertyPhotos: uploadPropertyPhotosController, removePropertyPhoto, deleteProperty,
  getPublicProperties, submitVendorLead, createPropertyInquiry, getOwnerInquiries, updateOwnerInquiryStatus,
  getTenantUsers, assignTenant, getOwnerLeases, updateLease, terminateLease,
  generateRentRecord, getOwnerRentPayments, updateRentPaymentInstructions, markRentPaid, markRentOverdue,
  getVacantProperties, updatePropertyStatus,
  getOwnerMaintenanceRequests, updateMaintenanceStatus, addCommentToRequest,
  getOwnerVendors, assignVendorToMaintenanceRequest, decideVendorQuote, completeVendorPayment,
  getAdminVendors, createAdminVendor, updateAdminVendor, deleteAdminVendor, getAdminVendorLeads, updateAdminVendorLeadStatus, getAdminStats, getAdminEntityList,
  getOwnerDashboard, getOwnerAnalytics, exportOwnerAnalyticsCsv,
  getTenantDashboard, getTenantLease, getTenantRentHistory, submitTenantRentPayment, getTenantOwnerPaymentDetails, getTenantInquiries, requestTenantRevisit,
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
  generateFeaturesDocument,
  createRazorpayOrder,
  verifyRazorpayPayment,
  // New features
  addExpense, getOwnerExpenses, updateExpense, deleteExpense,
  getAdvancedAnalytics, downloadTaxReport,
  downloadRentAgreement,
  submitPropertyReview, getPropertyReviews, getOwnerPropertyReviews, replyToReview, getTenantReviews, deleteReview,
  // Vendor Portal
  getVendorProfile, updateVendorProfile, getVendorMaintenanceRequests, submitVendorQuote, uploadVendorWorkPhotos, markVendorWorkComplete, raiseVendorPaymentRequest,
} = require("../controllers/propertyController");

// ── Auth ──────────────────────────────────────
router.post("/auth/signup", signUp);
router.post("/auth/signin", signIn);
router.post("/auth/forgot-password", forgotPassword);
router.get("/auth/profile", verifyToken, getProfile);
router.put("/auth/profile", verifyToken, updateProfile);
router.post("/auth/profile-picture", verifyToken, uploadProfilePicture.single("profilePicture"), uploadProfilePictureController);

// ── Public – Property Discovery ──────────────
router.get("/properties/public", getPublicProperties);
router.post("/vendors/contact", submitVendorLead);
router.get("/features/download", generateFeaturesDocument);

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
router.post("/owner/properties/:id/photos", verifyToken, requireOwner, uploadPropertyPhotos.array("photos", 20), uploadPropertyPhotosController);
router.delete("/owner/properties/:id/photos", verifyToken, requireOwner, removePropertyPhoto);
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
router.patch("/owner/maintenance/:id/assign-vendor", verifyToken, requireOwner, assignVendorToMaintenanceRequest);
router.patch("/owner/maintenance/:id/quote-decision", verifyToken, requireOwner, decideVendorQuote);
router.patch("/owner/maintenance/:id/complete-payment", verifyToken, requireOwner, completeVendorPayment);

// ── Vendor Portal ─────────────────────────────
router.get("/vendor/profile", verifyToken, requireVendor, getVendorProfile);
router.put("/vendor/profile", verifyToken, requireVendor, updateVendorProfile);
router.get("/vendor/maintenance", verifyToken, requireVendor, getVendorMaintenanceRequests);
router.post("/vendor/maintenance/:id/quote", verifyToken, requireVendor, submitVendorQuote);
router.post(
  "/vendor/maintenance/:id/work-photos",
  verifyToken,
  requireVendor,
  uploadMaintenancePhotos.array("photos", 10),
  uploadVendorWorkPhotos
);
router.patch("/vendor/maintenance/:id/complete", verifyToken, requireVendor, markVendorWorkComplete);
router.post("/vendor/maintenance/:id/payment-request", verifyToken, requireVendor, raiseVendorPaymentRequest);

// ── Owner – Vendors ───────────────────────────
router.get("/owner/vendors", verifyToken, requireOwner, getOwnerVendors);

// ── Admin – Vendor Directory & Leads ──────────
router.get("/admin/stats", verifyToken, requireAdmin, getAdminStats);
router.get("/admin/insights", verifyToken, requireAdmin, getAdminEntityList);
router.get("/admin/vendors", verifyToken, requireAdmin, getAdminVendors);
router.post("/admin/vendors", verifyToken, requireAdmin, createAdminVendor);
router.put("/admin/vendors/:id", verifyToken, requireAdmin, updateAdminVendor);
router.delete("/admin/vendors/:id", verifyToken, requireAdmin, deleteAdminVendor);
router.get("/admin/vendor-leads", verifyToken, requireAdmin, getAdminVendorLeads);
router.patch("/admin/vendor-leads/:id/status", verifyToken, requireAdmin, updateAdminVendorLeadStatus);

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
router.post("/tenant/rent/:id/create-payment-order", verifyToken, requireTenant, createRazorpayOrder);
router.post("/tenant/rent/:id/verify-payment", verifyToken, requireTenant, verifyRazorpayPayment);
router.get("/tenant/owner-payment-details", verifyToken, requireTenant, getTenantOwnerPaymentDetails);
router.get("/tenant/inquiries", verifyToken, requireTenant, getTenantInquiries);
router.patch("/tenant/inquiries/:id/request-revisit", verifyToken, requireTenant, requestTenantRevisit);
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

// ── Owner – Expenses ──────────────────────────
router.post("/owner/expenses", verifyToken, requireOwner, addExpense);
router.get("/owner/expenses", verifyToken, requireOwner, getOwnerExpenses);
router.put("/owner/expenses/:id", verifyToken, requireOwner, updateExpense);
router.delete("/owner/expenses/:id", verifyToken, requireOwner, deleteExpense);

// ── Owner – Advanced Analytics & Tax Report ───
router.get("/owner/advanced-analytics", verifyToken, requireOwner, getAdvancedAnalytics);
router.get("/owner/tax-report/download", verifyToken, requireOwner, downloadTaxReport);

// ── Rent Agreement ────────────────────────────
router.get("/leases/:leaseId/rent-agreement", verifyToken, downloadRentAgreement);

// ── Reviews ───────────────────────────────────
router.post("/tenant/reviews", verifyToken, requireTenant, submitPropertyReview);
router.get("/tenant/reviews", verifyToken, requireTenant, getTenantReviews);
router.delete("/tenant/reviews/:id", verifyToken, requireTenant, deleteReview);
router.get("/owner/reviews", verifyToken, requireOwner, getOwnerPropertyReviews);
router.patch("/owner/reviews/:id/reply", verifyToken, requireOwner, replyToReview);
router.get("/properties/:propertyId/reviews", getPropertyReviews);

module.exports = router;
