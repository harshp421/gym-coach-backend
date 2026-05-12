import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { pool } from "./config/dbConnect.js";
import { ENV } from "./config/env.config.js";
import { HttpError } from "./utils/http-error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { openapiSpec } from "./docs/openapi.js";
import authRouter from "./features/auth/routes/auth.routes.js";
import profileRouter from "./features/profile/routes/profile.routes.js";
import exercisesRouter from "./features/exercises/routes/exercises.routes.js";
import userExercisesRouter from "./features/exercises/routes/user-exercises.routes.js";
import workoutsRouter from "./features/workouts/routes/workout.routes.js";
import sessionsRouter from "./features/workouts/routes/sessions.routes.js";
import planEditRouter from "./features/workouts/routes/plan-edit.routes.js";
import coachRouter from "./features/coach/routes/coach.routes.js";
import dietRouter from "./features/diet/routes/diet.routes.js";

const app = express();

// Behind a reverse proxy (Render / Fly / nginx) Express needs to trust the
// first hop so req.secure, req.ip and Set-Cookie's `Secure` flag work off
// the X-Forwarded-* headers instead of the loopback connection.
if (ENV.GYM_ENVIRONMENT === "production") {
  app.set("trust proxy", 1);
}

app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Access log: one line per request once the response closes.
app.use(requestLogger());

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch {
    res.status(503).json({ ok: false, db: "down" });
  }
});

// API docs: Swagger UI at /docs, raw OpenAPI JSON at /docs.json. Only
// mounted outside production so we don't leak the full API surface to
// drive-by scanners. Set GYM_DOCS_ENABLED=1 to force-enable in prod.
const docsEnabled =
  ENV.GYM_ENVIRONMENT !== "production" || process.env.GYM_DOCS_ENABLED === "1";
if (docsEnabled) {
  app.get("/docs.json", (_req: Request, res: Response) => {
    res.json(openapiSpec);
  });
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiSpec, {
      customSiteTitle: "Gym Coach API",
      swaggerOptions: { persistAuthorization: true },
    }),
  );
}

// Catch-all rate limit on every /api/v1/* route. The tighter per-feature
// limiters (auth, coach) still apply on top — Express runs them in order.
app.use("/api/v1", rateLimit("api"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", profileRouter);
app.use("/api/v1/exercises", exercisesRouter);
app.use("/api/v1/user-exercises", userExercisesRouter);
app.use("/api/v1/workouts", workoutsRouter);
app.use("/api/v1/workouts", sessionsRouter);
app.use("/api/v1/workouts", planEditRouter);
app.use("/api/v1/coach", coachRouter);
app.use("/api/v1/diet", dietRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ error: err.message, ...(err.details ?? {}) });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

export default app;
