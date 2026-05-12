import { z } from "zod";
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    imageUrl: z.ZodOptional<z.ZodURL>;
}, z.core.$strip>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
//# sourceMappingURL=coach.schemas.d.ts.map