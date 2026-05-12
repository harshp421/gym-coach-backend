import type { User, Account } from "../auth.types.js";
import type { LoginInput, RegisterInput, ResetPasswordInput } from "../auth.schemas.js";
export declare function findUserByEmail(email: string): Promise<User | null>;
export declare function findUserById(id: string): Promise<User | null>;
export declare function createUser(input: {
    email: string;
    passwordHash: string | null;
    name?: string | null;
    avatarUrl?: string | null;
}): Promise<User>;
export declare function updateUserPassword(userId: string, passwordHash: string): Promise<void>;
export declare function findAccountByProvider(provider: string, providerAccountId: string): Promise<Account | null>;
export declare function createAccount(input: {
    userId: string;
    provider: string;
    providerAccountId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | null;
}): Promise<Account>;
export declare function verifyEmail(plainToken: string): Promise<{
    userId: string;
}>;
export declare function resendVerificationFor(userId: string): Promise<void>;
export type AuthResult = {
    user: User;
};
export declare function registerUser(input: RegisterInput): Promise<AuthResult>;
export declare function loginUser(input: LoginInput): Promise<AuthResult>;
export declare function requestPasswordReset(email: string): Promise<void>;
export declare function resetUserPassword(input: ResetPasswordInput): Promise<void>;
export declare function loginWithProvider(input: {
    provider: string;
    providerAccountId: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
}): Promise<AuthResult>;
//# sourceMappingURL=auth.service.d.ts.map