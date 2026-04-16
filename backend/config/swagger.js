const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Property Management API",
      version: "1.0.0",
      description: "REST API documentation for the Property Management System",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication & profile" },
      { name: "Public", description: "Public property discovery" },
      { name: "Owner – Dashboard", description: "Owner dashboard & analytics" },
      { name: "Owner – Properties", description: "Property CRUD" },
      { name: "Owner – Leases", description: "Tenant assignment & lease management" },
      { name: "Owner – Rent", description: "Rent records & payments" },
      { name: "Owner – Renewals", description: "Lease renewal management" },
      { name: "Owner – Maintenance", description: "Maintenance request handling" },
      { name: "Owner – Move-Out", description: "Move-out request decisions" },
      { name: "Owner – Compliance", description: "Compliance document management" },
      { name: "Owner – Inquiries", description: "Property inquiry management" },
      { name: "Tenant – Dashboard", description: "Tenant dashboard" },
      { name: "Tenant – Lease & Rent", description: "Lease and rent history" },
      { name: "Tenant – Maintenance", description: "Maintenance requests" },
      { name: "Tenant – Move-Out", description: "Move-out requests" },
      { name: "Tenant – Compliance", description: "Compliance documents" },
      { name: "Notifications", description: "In-app notifications" },
    ],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────
      "/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName", "lastName", "email", "phone", "password", "confirmPassword", "role"],
                  properties: {
                    firstName: { type: "string", example: "John" },
                    middleName: { type: "string", example: "A." },
                    lastName: { type: "string", example: "Doe" },
                    email: { type: "string", format: "email", example: "john@example.com" },
                    countryCode: { type: "string", example: "+91" },
                    phone: { type: "string", example: "9876543210" },
                    password: { type: "string", minLength: 6, example: "secret123" },
                    confirmPassword: { type: "string", example: "secret123" },
                    role: { type: "string", enum: ["owner", "tenant"] },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User registered successfully" },
            400: { description: "Validation error" },
          },
        },
      },
      "/auth/signin": {
        post: {
          tags: ["Auth"],
          summary: "Sign in and receive a JWT",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "john@example.com" },
                    password: { type: "string", example: "secret123" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Signed in successfully, returns token" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Send a password-reset email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Reset email sent" },
            404: { description: "User not found" },
          },
        },
      },
      "/auth/profile": {
        get: {
          tags: ["Auth"],
          summary: "Get current user profile",
          responses: {
            200: { description: "Profile data" },
            401: { description: "Unauthorized" },
          },
        },
        put: {
          tags: ["Auth"],
          summary: "Update current user profile",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    middleName: { type: "string" },
                    lastName: { type: "string" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ── Public ────────────────────────────────────────────────────────
      "/properties/public": {
        get: {
          tags: ["Public"],
          summary: "Browse all public (available) properties",
          security: [],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: { 200: { description: "List of available properties" } },
        },
      },
      "/properties/{id}/inquiries": {
        post: {
          tags: ["Public"],
          summary: "Submit an inquiry for a property",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string", example: "I am interested in this property." } },
                },
              },
            },
          },
          responses: {
            201: { description: "Inquiry submitted" },
            409: { description: "Duplicate inquiry" },
          },
        },
      },

      // ── Owner – Dashboard ─────────────────────────────────────────────
      "/owner/dashboard": {
        get: {
          tags: ["Owner – Dashboard"],
          summary: "Get owner dashboard summary",
          responses: { 200: { description: "Dashboard data" }, 401: { description: "Unauthorized" } },
        },
      },
      "/owner/analytics": {
        get: {
          tags: ["Owner – Dashboard"],
          summary: "Get owner analytics",
          responses: { 200: { description: "Analytics data" } },
        },
      },
      "/owner/analytics/export": {
        get: {
          tags: ["Owner – Dashboard"],
          summary: "Export analytics as CSV",
          responses: { 200: { description: "CSV file download" } },
        },
      },

      // ── Owner – Inquiries ─────────────────────────────────────────────
      "/owner/inquiries": {
        get: {
          tags: ["Owner – Inquiries"],
          summary: "Get all inquiries for owner properties",
          responses: { 200: { description: "List of inquiries" } },
        },
      },
      "/owner/inquiries/{id}/status": {
        patch: {
          tags: ["Owner – Inquiries"],
          summary: "Update inquiry status",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", enum: ["pending", "contacted", "closed"] } },
                },
              },
            },
          },
          responses: { 200: { description: "Status updated" } },
        },
      },

      // ── Owner – Properties ────────────────────────────────────────────
      "/owner/properties": {
        get: {
          tags: ["Owner – Properties"],
          summary: "List all owner properties",
          responses: { 200: { description: "Properties array" } },
        },
        post: {
          tags: ["Owner – Properties"],
          summary: "Add a new property",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "address", "rent", "propertyType"],
                  properties: {
                    title: { type: "string" },
                    address: { type: "string" },
                    rent: { type: "number" },
                    propertyType: { type: "string", enum: ["apartment", "house", "commercial", "studio"] },
                    description: { type: "string" },
                    bedrooms: { type: "integer" },
                    bathrooms: { type: "integer" },
                    area: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Property created" } },
        },
      },
      "/owner/properties/{id}": {
        get: {
          tags: ["Owner – Properties"],
          summary: "Get a property by ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Property data" }, 404: { description: "Not found" } },
        },
        put: {
          tags: ["Owner – Properties"],
          summary: "Update a property",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: { 200: { description: "Property updated" } },
        },
        delete: {
          tags: ["Owner – Properties"],
          summary: "Delete a property",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Property deleted" } },
        },
      },
      "/owner/properties/{id}/status": {
        patch: {
          tags: ["Owner – Properties"],
          summary: "Update property availability status",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", enum: ["available", "occupied", "maintenance"] } },
                },
              },
            },
          },
          responses: { 200: { description: "Status updated" } },
        },
      },

      // ── Owner – Vacancy ───────────────────────────────────────────────
      "/owner/vacancies": {
        get: {
          tags: ["Owner – Properties"],
          summary: "Get vacant properties",
          responses: { 200: { description: "Vacant properties list" } },
        },
      },

      // ── Owner – Leases ────────────────────────────────────────────────
      "/owner/tenant-users": {
        get: {
          tags: ["Owner – Leases"],
          summary: "Get all tenant user accounts",
          responses: { 200: { description: "Tenant users list" } },
        },
      },
      "/owner/leases": {
        get: {
          tags: ["Owner – Leases"],
          summary: "List all leases",
          responses: { 200: { description: "Leases array" } },
        },
        post: {
          tags: ["Owner – Leases"],
          summary: "Assign a tenant to a property (create lease)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tenantId", "propertyId", "startDate", "endDate", "rentAmount"],
                  properties: {
                    tenantId: { type: "string" },
                    propertyId: { type: "string" },
                    startDate: { type: "string", format: "date" },
                    endDate: { type: "string", format: "date" },
                    rentAmount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Lease created" } },
        },
      },
      "/owner/leases/{id}": {
        put: {
          tags: ["Owner – Leases"],
          summary: "Update a lease",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: { 200: { description: "Lease updated" } },
        },
      },
      "/owner/leases/{id}/terminate": {
        patch: {
          tags: ["Owner – Leases"],
          summary: "Terminate a lease",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Lease terminated" } },
        },
      },

      // ── Owner – Rent ──────────────────────────────────────────────────
      "/owner/rent": {
        get: {
          tags: ["Owner – Rent"],
          summary: "Get all rent payment records",
          responses: { 200: { description: "Rent records" } },
        },
        post: {
          tags: ["Owner – Rent"],
          summary: "Generate a rent record",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["leaseId", "dueDate", "amount"],
                  properties: {
                    leaseId: { type: "string" },
                    dueDate: { type: "string", format: "date" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Rent record generated" } },
        },
      },
      "/owner/rent/{id}/paid": {
        patch: {
          tags: ["Owner – Rent"],
          summary: "Mark rent as paid",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Marked as paid" } },
        },
      },
      "/owner/rent/mark-overdue": {
        post: {
          tags: ["Owner – Rent"],
          summary: "Mark overdue rent records",
          responses: { 200: { description: "Records updated" } },
        },
      },
      "/owner/rent/export": {
        get: {
          tags: ["Owner – Rent"],
          summary: "Export rent records as CSV",
          responses: { 200: { description: "CSV file" } },
        },
      },
      "/rent/{id}/receipt": {
        get: {
          tags: ["Owner – Rent"],
          summary: "Download a rent receipt PDF",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "PDF receipt" } },
        },
      },

      // ── Owner – Renewals ──────────────────────────────────────────────
      "/owner/renewals": {
        get: {
          tags: ["Owner – Renewals"],
          summary: "List all lease renewals",
          responses: { 200: { description: "Renewals list" } },
        },
        post: {
          tags: ["Owner – Renewals"],
          summary: "Create a lease renewal",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["leaseId", "newEndDate"],
                  properties: {
                    leaseId: { type: "string" },
                    newEndDate: { type: "string", format: "date" },
                    newRentAmount: { type: "number" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Renewal created" } },
        },
      },
      "/owner/renewals/{id}/cancel": {
        patch: {
          tags: ["Owner – Renewals"],
          summary: "Cancel a lease renewal",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Renewal cancelled" } },
        },
      },

      // ── Owner – Maintenance ───────────────────────────────────────────
      "/owner/maintenance": {
        get: {
          tags: ["Owner – Maintenance"],
          summary: "Get all maintenance requests",
          responses: { 200: { description: "Maintenance requests" } },
        },
      },
      "/owner/maintenance/{id}/status": {
        patch: {
          tags: ["Owner – Maintenance"],
          summary: "Update maintenance request status",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", enum: ["pending", "in-progress", "resolved"] } },
                },
              },
            },
          },
          responses: { 200: { description: "Status updated" } },
        },
      },
      "/owner/maintenance/{id}/comment": {
        post: {
          tags: ["Owner – Maintenance"],
          summary: "Add a comment to a maintenance request",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["text"],
                  properties: { text: { type: "string" } },
                },
              },
            },
          },
          responses: { 201: { description: "Comment added" } },
        },
      },

      // ── Owner – Move-Out ──────────────────────────────────────────────
      "/owner/move-out": {
        get: {
          tags: ["Owner – Move-Out"],
          summary: "Get all move-out requests",
          responses: { 200: { description: "Move-out requests" } },
        },
      },
      "/owner/move-out/{id}/decision": {
        patch: {
          tags: ["Owner – Move-Out"],
          summary: "Approve or reject a move-out request",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { decision: { type: "string", enum: ["approved", "rejected"] } },
                },
              },
            },
          },
          responses: { 200: { description: "Decision recorded" } },
        },
      },
      "/owner/move-out/{id}/complete": {
        patch: {
          tags: ["Owner – Move-Out"],
          summary: "Mark a move-out as complete",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Move-out completed" } },
        },
      },

      // ── Owner – Compliance ────────────────────────────────────────────
      "/owner/compliance-documents": {
        get: {
          tags: ["Owner – Compliance"],
          summary: "List owner compliance documents",
          responses: { 200: { description: "Documents list" } },
        },
        post: {
          tags: ["Owner – Compliance"],
          summary: "Upload a compliance document",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["document"],
                  properties: {
                    document: { type: "string", format: "binary" },
                    title: { type: "string" },
                    propertyId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Document uploaded" } },
        },
      },
      "/owner/compliance-documents/{id}/verify": {
        patch: {
          tags: ["Owner – Compliance"],
          summary: "Verify a compliance document",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Document verified" } },
        },
      },

      // ── Tenant – Dashboard ────────────────────────────────────────────
      "/tenant/dashboard": {
        get: {
          tags: ["Tenant – Dashboard"],
          summary: "Get tenant dashboard summary",
          responses: { 200: { description: "Dashboard data" } },
        },
      },

      // ── Tenant – Lease & Rent ─────────────────────────────────────────
      "/tenant/lease": {
        get: {
          tags: ["Tenant – Lease & Rent"],
          summary: "Get tenant's active lease",
          responses: { 200: { description: "Lease data" } },
        },
      },
      "/tenant/rent-history": {
        get: {
          tags: ["Tenant – Lease & Rent"],
          summary: "Get tenant's rent payment history",
          responses: { 200: { description: "Rent history" } },
        },
      },
      "/tenant/inquiries": {
        get: {
          tags: ["Tenant – Lease & Rent"],
          summary: "Get tenant's property inquiries",
          responses: { 200: { description: "Inquiries list" } },
        },
      },
      "/tenant/renewals": {
        get: {
          tags: ["Tenant – Lease & Rent"],
          summary: "Get tenant's lease renewals",
          responses: { 200: { description: "Renewals list" } },
        },
      },
      "/tenant/renewals/{id}/decision": {
        patch: {
          tags: ["Tenant – Lease & Rent"],
          summary: "Accept or reject a lease renewal as tenant",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { decision: { type: "string", enum: ["accepted", "rejected"] } },
                },
              },
            },
          },
          responses: { 200: { description: "Decision recorded" } },
        },
      },

      // ── Tenant – Maintenance ──────────────────────────────────────────
      "/tenant/maintenance": {
        get: {
          tags: ["Tenant – Maintenance"],
          summary: "Get tenant's maintenance requests",
          responses: { 200: { description: "Maintenance requests" } },
        },
        post: {
          tags: ["Tenant – Maintenance"],
          summary: "Create a maintenance request (with optional photos)",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["title", "description"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"], default: "medium" },
                    photos: {
                      type: "array",
                      items: { type: "string", format: "binary" },
                      maxItems: 5,
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Request created" } },
        },
      },

      // ── Tenant – Move-Out ─────────────────────────────────────────────
      "/tenant/move-out": {
        get: {
          tags: ["Tenant – Move-Out"],
          summary: "Get tenant's move-out requests",
          responses: { 200: { description: "Move-out requests" } },
        },
        post: {
          tags: ["Tenant – Move-Out"],
          summary: "Submit a move-out request",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["moveOutDate", "reason"],
                  properties: {
                    moveOutDate: { type: "string", format: "date" },
                    reason: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Request submitted" } },
        },
      },

      // ── Tenant – Compliance ───────────────────────────────────────────
      "/tenant/compliance-documents": {
        get: {
          tags: ["Tenant – Compliance"],
          summary: "Get tenant's compliance documents",
          responses: { 200: { description: "Documents list" } },
        },
        post: {
          tags: ["Tenant – Compliance"],
          summary: "Upload a compliance document as tenant",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["document"],
                  properties: {
                    document: { type: "string", format: "binary" },
                    title: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 201: { description: "Document uploaded" } },
        },
      },

      // ── Notifications ─────────────────────────────────────────────────
      "/notifications": {
        get: {
          tags: ["Notifications"],
          summary: "Get all notifications for the current user",
          responses: { 200: { description: "Notifications list" } },
        },
      },
      "/notifications/{id}/read": {
        patch: {
          tags: ["Notifications"],
          summary: "Mark a notification as read",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Notification marked as read" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
