/**
 * Build the system prompt that primes the coach. Caps each section so a
 * very-active user never blows out the context window. We shoot for
 * <2000 tokens — well below Llama-3.3-70b's 128k limit but fast and cheap.
 */
export declare function buildSystemPrompt(userId: string, name: string | null): Promise<string>;
//# sourceMappingURL=context.service.d.ts.map