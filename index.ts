import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import router from "./routes/route";

dotenv.config();

const app = express();

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

app.use(express.json());

// Optional Rate Limiting
if (process.env.RATE_LIMIT === "true") {
  const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 60, // 60 requests per 5 minutes
    message: {
      success: false,
      message: "Too many requests, please slow down and try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/v1", limiter);
}

// Optional API Key Authentication Middleware
const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const configuredKey = process.env.API_KEY;
  // If no API_KEY is set in environment, leave endpoints open
  if (!configuredKey || configuredKey.trim() === "") {
    return next();
  }

  const clientKey = req.headers["x-api-key"] || req.query.apiKey;
  if (!clientKey || clientKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key. Provide via 'x-api-key' header or '?apiKey=' query param.",
    });
  }

  next();
};

// Health Check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Root Information
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "MoviesBoxHD API",
    status: "running",
    version: "1.1.0",
    docs: {
      mediaInfo: "GET /api/v1/mediaInfo?id={IMDb_ID}",
      getSeasonList: "GET /api/v1/getSeasonList?id={IMDb_ID}",
      getStream: "POST /api/v1/getStream (Body: { file, key })",
    },
  });
});

// Protected API v1 Routes
app.use("/api/v1", apiKeyAuth, router);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`MoviesBoxHD API server running on port ${PORT}`);
  });
}

export default app;
