import { pool, withConnectionRetry } from "../../config/dbConnect.js";
import { sendEmailNow } from "./sender.js";
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 5;
// Add an email to the queue. Returns immediately — the worker picks it up.
export async function enqueueEmail(msg) {
    await withConnectionRetry(() => pool.query(`INSERT INTO mail_queue (to_email, subject, html, text)
             VALUES ($1, $2, $3, $4)`, [msg.to, msg.subject, msg.html, msg.text]));
}
// Claim and process a batch of pending emails. Called by the worker.
// Returns the number of jobs processed (0 = idle tick).
//
// The transactional claim is wrapped in withConnectionRetry to handle the
// Neon-specific case of stale pooled connections — pg-pool drops the bad
// socket on first failure, the retry hits a fresh one.
export async function processNextBatch() {
    const claimed = await withConnectionRetry(async () => {
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            const claim = await client.query(`UPDATE mail_queue
                 SET status = 'sending', attempts = attempts + 1
                 WHERE id IN (
                     SELECT id FROM mail_queue
                     WHERE status = 'pending'
                       AND scheduled_at <= now()
                       AND attempts < $1
                     ORDER BY created_at
                     LIMIT $2
                     FOR UPDATE SKIP LOCKED
                 )
                 RETURNING id, to_email, subject, html, text, attempts`, [MAX_ATTEMPTS, BATCH_SIZE]);
            await client.query("COMMIT");
            return claim.rows;
        }
        catch (err) {
            try {
                await client.query("ROLLBACK");
            }
            catch {
                // ROLLBACK on a dead connection is itself doomed — ignore.
            }
            throw err;
        }
        finally {
            client.release();
        }
    });
    // Send each claimed job. Failures get exponential backoff or move to 'failed'.
    for (const job of claimed) {
        try {
            await sendEmailNow({
                to: job.to_email,
                subject: job.subject,
                html: job.html,
                text: job.text,
            });
            await withConnectionRetry(() => pool.query(`UPDATE mail_queue SET status = 'sent', sent_at = now() WHERE id = $1`, [job.id]));
        }
        catch (err) {
            const finalFailure = job.attempts >= MAX_ATTEMPTS;
            // Backoff: 1m, 2m, 4m, 8m, 16m
            const backoffMs = 60_000 * Math.pow(2, job.attempts - 1);
            const retryAt = new Date(Date.now() + backoffMs);
            await withConnectionRetry(() => pool.query(`UPDATE mail_queue
                     SET status = $1, last_error = $2, scheduled_at = $3
                     WHERE id = $4`, [
                finalFailure ? "failed" : "pending",
                err instanceof Error ? err.message : String(err),
                retryAt,
                job.id,
            ]));
        }
    }
    return claimed.length;
}
//# sourceMappingURL=queue.service.js.map