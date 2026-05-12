export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const fields = {};
            for (const issue of result.error.issues) {
                const field = String(issue.path[0]);
                if (!fields[field])
                    fields[field] = issue.message;
            }
            return res.status(400).json({ error: "Invalid input", fields });
        }
        req.body = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map