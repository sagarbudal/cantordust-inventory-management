import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import apiRoutes from "./routes/api.js";

const PORT = parseInt(process.env.PORT || "5000", 10);

async function startServer() {
  await connectDB();

  const app = express();

  const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        // Allow all Vercel deployments (production + preview URLs)
        if (origin.endsWith(".vercel.app")) {
          return callback(null, true);
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "video-equipment-backend" });
  });

  app.use("/api", apiRoutes);

  app.listen(PORT, () => {
    console.log(`[BACKEND] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[BACKEND] Failed to start:", err);
  process.exit(1);
});
