export declare const pool: import("pg").Pool;
export declare function verifyDbConnection(): Promise<void>;
export declare function closePool(): Promise<void>;
/**
 * Retries once on the specific class of pg errors that mean "the socket
 * I handed you was dead" — `Connection terminated`, ECONNRESET, etc.
 * The pool drops the broken client on the first failure, so the retry
 * hits a fresh one. Use for short, idempotent queries — the email worker
 * is the main customer.
 */
export declare function withConnectionRetry<T>(fn: () => Promise<T>): Promise<T>;
export declare function isStaleConnectionError(err: unknown): boolean;
//# sourceMappingURL=dbConnect.d.ts.map