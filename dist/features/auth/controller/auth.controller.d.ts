import type { Request, Response } from "express";
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function logout(_req: Request, res: Response): Promise<void>;
export declare function me(req: Request, res: Response): Promise<void>;
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
export declare function resetPassword(req: Request, res: Response): Promise<void>;
export declare function verifyEmail(req: Request, res: Response): Promise<void>;
export declare function resendVerification(req: Request, res: Response): Promise<void>;
export declare function oauth(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map