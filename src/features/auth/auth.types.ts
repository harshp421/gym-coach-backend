export type User = {
    id: string
    email: string
    passwordHash: string | null
    name: string | null
    avatarUrl: string | null
    emailVerified: Date | null
    createdAt: Date
    updatedAt: Date
}

export type PublicUser = Omit<User, "passwordHash">

export type Account = {
    id: string
    userId: string
    provider: string
    providerAccountId: string
    accessToken: string | null
    refreshToken: string | null
    expiresAt: Date | null
    createdAt: Date
    updatedAt: Date
}

export type JwtPayload = {
    sub: string
    email: string
}

declare global {
    namespace Express {
        interface Request {
            user?: PublicUser
        }
    }
}
