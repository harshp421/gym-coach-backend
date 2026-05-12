import type { SetLog, WorkoutSession, WorkoutSessionWithSets } from "../sessions.types.js";
import type { CompleteSessionInput, LogSetInput } from "../sessions.schemas.js";
/**
 * Start a session against a plan_day. Pulls plan_id from the day so the
 * client doesn't need to send it. Returns 409 if the user already has an
 * in-progress session — we lean on the partial unique index to enforce this
 * and translate the unique_violation into a friendly error.
 */
export declare function createSession(userId: string, planDayId: string): Promise<WorkoutSession>;
export declare function getActiveSession(userId: string): Promise<WorkoutSessionWithSets | null>;
export declare function getSession(userId: string, sessionId: string): Promise<WorkoutSessionWithSets>;
/**
 * Mark a session complete. No-op-with-error if it's already completed —
 * we don't want to silently reset completed_at and confuse history.
 */
export declare function completeSession(userId: string, sessionId: string, input: CompleteSessionInput): Promise<WorkoutSession>;
/**
 * Abandon an in-progress session. We refuse to delete completed sessions —
 * those are history and live forever (until the user is deleted).
 */
export declare function abandonSession(userId: string, sessionId: string): Promise<void>;
/**
 * UPSERT a set log against (session, plan_exercise, set_number). Refuses to
 * write to a completed session. Verifies the plan_exercise belongs to the
 * session's plan_day so a user can't log under another plan's exercise.
 */
export declare function upsertSetLog(userId: string, sessionId: string, input: LogSetInput): Promise<SetLog>;
export declare function deleteSetLog(userId: string, sessionId: string, setLogId: string): Promise<void>;
//# sourceMappingURL=sessions.service.d.ts.map