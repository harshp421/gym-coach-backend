import { type EmailMessage } from "./sender.js";
export declare function enqueueEmail(msg: EmailMessage): Promise<void>;
export declare function processNextBatch(): Promise<number>;
//# sourceMappingURL=queue.service.d.ts.map