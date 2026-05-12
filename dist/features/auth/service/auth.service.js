import crypto from "node:crypto";
import { pool } from "../../../config/dbConnect.js";
import { ENV } from "../../../config/env.config.js";
import { hashPassword, comparePassword } from "../../../utils/password.js";
import { HttpError } from "../../../utils/http-error.js";
import { enqueueEmail } from "../../../utils/email/queue.service.js";
import { verificationEmail, passwordResetEmail, } from "../../../utils/email/templates.js";
const RESET_TOKEN_TTL_MIN = 60;
const VERIFY_TOKEN_TTL_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;
// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function mapUser(row) {
    return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        name: row.name,
        avatarUrl: row.avatar_url,
        emailVerified: row.email_verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapAccount(row) {
    return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        providerAccountId: row.provider_account_id,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
// ---------------------------------------------------------------------------
// User queries
// ---------------------------------------------------------------------------
export async function findUserByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
}
export async function findUserById(id) {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
}
export async function createUser(input) {
    const result = await pool.query(`INSERT INTO users (email, password_hash, name, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [input.email, input.passwordHash, input.name ?? null, input.avatarUrl ?? null]);
    return mapUser(result.rows[0]);
}
export async function updateUserPassword(userId, passwordHash) {
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        passwordHash,
        userId,
    ]);
}
// ---------------------------------------------------------------------------
// Account queries (social provider linking)
// ---------------------------------------------------------------------------
export async function findAccountByProvider(provider, providerAccountId) {
    const result = await pool.query(`SELECT * FROM accounts
         WHERE provider = $1 AND provider_account_id = $2`, [provider, providerAccountId]);
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
}
export async function createAccount(input) {
    const result = await pool.query(`INSERT INTO accounts
            (user_id, provider, provider_account_id, access_token, refresh_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [
        input.userId,
        input.provider,
        input.providerAccountId,
        input.accessToken ?? null,
        input.refreshToken ?? null,
        input.expiresAt ?? null,
    ]);
    return mapAccount(result.rows[0]);
}
// ---------------------------------------------------------------------------
// Email verification — token columns live on `users` (no extra table)
// ---------------------------------------------------------------------------
async function setVerificationToken(userId) {
    const plain = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(plain);
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
    await pool.query(`UPDATE users
         SET email_verification_token_hash = $1,
             email_verification_expires_at = $2
         WHERE id = $3`, [tokenHash, expiresAt, userId]);
    return plain;
}
async function queueVerificationEmail(user, plainToken) {
    const link = `${ENV.FRONTEND_URL}/verify-email?token=${plainToken}`;
    const content = verificationEmail({ name: user.name, link });
    await enqueueEmail({ to: user.email, ...content });
}
export async function verifyEmail(plainToken) {
    const tokenHash = hashToken(plainToken);
    const result = await pool.query(`UPDATE users
         SET email_verified = now(),
             email_verification_token_hash = NULL,
             email_verification_expires_at = NULL
         WHERE email_verification_token_hash = $1
           AND email_verification_expires_at > now()
         RETURNING id`, [tokenHash]);
    if (!result.rows[0]) {
        throw new HttpError(400, "Invalid or expired verification link");
    }
    return { userId: result.rows[0].id };
}
export async function resendVerificationFor(userId) {
    const user = await findUserById(userId);
    if (!user)
        throw new HttpError(404, "User not found");
    if (user.emailVerified)
        throw new HttpError(400, "Email already verified");
    // Rate-limit: enforce a minimum cooldown between resends.
    const lastResult = await pool.query(`SELECT last_verification_sent_at FROM users WHERE id = $1`, [user.id]);
    const lastSent = lastResult.rows[0]?.last_verification_sent_at ?? null;
    if (lastSent) {
        const elapsedMs = Date.now() - new Date(lastSent).getTime();
        const remainingSec = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
        if (remainingSec > 0) {
            throw new HttpError(429, `Please wait ${remainingSec}s before requesting another link`);
        }
    }
    const token = await setVerificationToken(user.id);
    await pool.query(`UPDATE users SET last_verification_sent_at = now() WHERE id = $1`, [user.id]);
    await queueVerificationEmail(user, token);
}
// ---------------------------------------------------------------------------
// Password reset tokens (separate table — kept from earlier)
// ---------------------------------------------------------------------------
async function createPasswordResetToken(userId) {
    const plain = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(plain);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MIN * 60 * 1000);
    await pool.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`, [userId, tokenHash, expiresAt]);
    return plain;
}
async function consumeResetToken(token) {
    const tokenHash = hashToken(token);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const found = await client.query(`SELECT id, user_id FROM password_reset_tokens
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
             LIMIT 1`, [tokenHash]);
        if (!found.rows[0]) {
            await client.query("ROLLBACK");
            return null;
        }
        await client.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [
            found.rows[0].id,
        ]);
        await client.query("COMMIT");
        return { userId: found.rows[0].user_id };
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        client.release();
    }
}
export async function registerUser(input) {
    const email = input.email.toLowerCase();
    const existing = await findUserByEmail(email);
    if (existing)
        throw new HttpError(409, "Email already in use");
    const passwordHash = await hashPassword(input.password);
    const user = await createUser({
        email,
        passwordHash,
        name: input.name,
    });
    // Fire off the verification email (queued, not awaited send)
    const token = await setVerificationToken(user.id);
    await queueVerificationEmail(user, token);
    return { user };
}
export async function loginUser(input) {
    const user = await findUserByEmail(input.email.toLowerCase());
    if (!user || !user.passwordHash) {
        throw new HttpError(401, "Invalid email or password");
    }
    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid)
        throw new HttpError(401, "Invalid email or password");
    return { user };
}
export async function requestPasswordReset(email) {
    const user = await findUserByEmail(email.toLowerCase());
    if (!user)
        return; // silent — no email enumeration
    const token = await createPasswordResetToken(user.id);
    const link = `${ENV.FRONTEND_URL}/reset-password?token=${token}`;
    const content = passwordResetEmail({ link });
    await enqueueEmail({ to: user.email, ...content });
}
export async function resetUserPassword(input) {
    const consumed = await consumeResetToken(input.token);
    if (!consumed)
        throw new HttpError(400, "Invalid or expired token");
    const passwordHash = await hashPassword(input.password);
    await updateUserPassword(consumed.userId, passwordHash);
}
export async function loginWithProvider(input) {
    const linked = await findAccountByProvider(input.provider, input.providerAccountId);
    if (linked) {
        const user = await findUserById(linked.userId);
        if (!user)
            throw new HttpError(500, "Linked account references missing user");
        return { user };
    }
    let user = await findUserByEmail(input.email.toLowerCase());
    if (!user) {
        user = await createUser({
            email: input.email.toLowerCase(),
            passwordHash: null,
            name: input.name,
            avatarUrl: input.avatarUrl,
        });
    }
    await createAccount({
        userId: user.id,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
    });
    return { user };
}
//# sourceMappingURL=auth.service.js.map