import type { Request, Response } from "express";
export declare function createSession(req: Request, res: Response): Promise<void>;
export declare function getActiveSession(req: Request, res: Response): Promise<void>;
export declare function getSession(req: Request, res: Response): Promise<void>;
export declare function completeSession(req: Request, res: Response): Promise<void>;
export declare function abandonSession(req: Request, res: Response): Promise<void>;
export declare function logSet(req: Request, res: Response): Promise<void>;
export declare function deleteSet(req: Request, res: Response): Promise<void>;
export declare function listRecentSessions(req: Request, res: Response): Promise<void>;
export declare function getExerciseHistory(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=sessions.controller.d.ts.map