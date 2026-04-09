const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const connectDB = require("./config/config");
const propertyRoutes = require("./routes/propertyRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  process.env.CORS_ORIGIN,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  // Allow Vercel preview and production domains.
  if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) return true;

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
