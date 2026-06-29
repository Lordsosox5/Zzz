import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ── Desktop mode: serve the built Vite frontend as static files ──────────────
// Set DESKTOP_MODE=1 and FRONTEND_DIST=/path/to/ehr/dist/public when running
// inside the Electron wrapper. This lets a single Express process serve both
// the API and the React SPA with no separate Vite dev server needed.
const frontendDist = process.env["FRONTEND_DIST"];
if (frontendDist) {
  // Serve JS/CSS/images and other static assets directly
  app.use(express.static(frontendDist, {
    maxAge: "1d",        // cache static assets aggressively — they're fingerprinted by Vite
    index:  false,       // let the SPA fallback below handle /
  }));

  // SPA fallback — any path not matched above serves index.html so that
  // React Router (wouter) can handle client-side navigation
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  logger.info({ frontendDist }, "Desktop mode: serving frontend static files");
}

export default app;
