import type { Request, Response, NextFunction } from "express"
import type { ZodType } from "zod"

export function validateBody<T>(schema: ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            const fields: Record<string, string> = {}
            for (const issue of result.error.issues) {
                const field = String(issue.path[0])
                if (!fields[field]) fields[field] = issue.message
            }
            return res.status(400).json({ error: "Invalid input", fields })
        }
        req.body = result.data
        next()
    }
}
