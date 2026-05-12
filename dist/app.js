import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { pool } from "./config/dbConnect.js";
import { ENV } from "./config/env.config.js";
import { HttpError } from "./utils/http-error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { openapiSpec } from "./docs/openapi.js";
import authRouter from "./features/auth/routes/auth.routes.js";
import profileRouter from "./features/profile/routes/profile.routes.js";
import exercisesRouter from "./features/exercises/routes/exercises.routes.js";
import userExercisesRouter from "./features/exercises/routes/user-exercises.routes.js";
import workoutsRouter from "./features/workouts/routes/workout.routes.js";
import sessionsRouter from "./features/workouts/routes/sessions.routes.js";
import planEditRouter from "./features/workouts/routes/plan-edit.routes.js";
import coachRouter from "./features/coach/routes/coach.routes.js";
const app = express();
app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
// Access log: one line per request once the response closes.
app.use(requestLogger());
app.get("/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true, db: "up" });
    }
    catch {
        res.status(503).json({ ok: false, db: "down" });
    }
});
// API docs: Swagger UI at /docs, raw OpenAPI JSON at /docs.json.
app.get("/docs.json", (_req, res) => {
    res.json(openapiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: "Gym Coach API",
    swaggerOptions: { persistAuthorization: true },
}));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", profileRouter);
app.use("/api/v1/exercises", exercisesRouter);
app.use("/api/v1/user-exercises", userExercisesRouter);
app.use("/api/v1/workouts", workoutsRouter);
app.use("/api/v1/workouts", sessionsRouter);
app.use("/api/v1/workouts", planEditRouter);
app.use("/api/v1/coach", coachRouter);
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
const errorHandler = (err, _req, res, _next) => {
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
//# sourceMappingURL=app.js.map