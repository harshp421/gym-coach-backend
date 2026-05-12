import type { Request, Response } from "express";
export declare function listMessages(req: Request, res: Response): Promise<void>;
export declare function clearMessages(req: Request, res: Response): Promise<void>;
/**
 * POST /api/v1/coach/messages — Server-Sent Events.
 * Persists the user message, streams assistant tokens, persists the
 * assembled assistant message at the end. Aborts the upstream Groq call
 * if the client disconnects mid-stream.
 */
export declare function sendMessage(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=coach.controller.d.ts.map