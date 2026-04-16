const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const connectDB = require("./config/config");
const propertyRoutes = require("./routes/propertyRoutes");

const app = express();

const normalizeOrigin = (value) => (value || "").trim().replace(/\/$/, "");

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://property-management-gamma-six.vercel.app",
  process.env.CLIENT_URL,
  process.env.CORS_ORIGIN,
]
  .map(normalizeOrigin)
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  // Allow Vercel preview and production domains.
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalizedOrigin)) return true;

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Property Management API Docs",
  swaggerOptions: { persistAuthorization: true },
}));

app.use("/api", propertyRoutes);

app.get("/", (req, res) => res.send("Property Management API is running."));

const start = async () => {
  try {
    const connected = await connectDB(process.env.MONGO_URL);
    if (!connected) {
      console.log("Database connection failed. Server not started.");
      process.exit(1);
    }

    console.log("Database connected.");

    const port = process.env.PORT || 5000;
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the existing process or change PORT in backend/.env.`);
        process.exit(1);
      }

      console.error("Server startup error:", err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
};

start();
