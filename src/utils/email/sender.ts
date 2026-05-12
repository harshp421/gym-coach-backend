import nodemailer, { type Transporter } from "nodemailer"
import { ENV } from "../../config/env.config.js"

// Build a single, reused transporter at import time. The pool keeps a few
// open connections to the SMTP server so we're not re-negotiating TLS on
// every send (the email worker can fire several per tick).
//
// All four SMTP vars must be set, otherwise we fall back to console
// logging so dev keeps working without configuration.
let transporter: Transporter | null = null
if (ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: ENV.SMTP_HOST,
        port: ENV.SMTP_PORT,
        // 465 uses implicit TLS, 587 uses STARTTLS. nodemailer's `secure`
        // means "implicit TLS from the start".
        secure: ENV.SMTP_PORT === 465,
        auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
        pool: true,
        maxConnections: 3,
    })
    // Best-effort connectivity check at boot. Doesn't throw — we don't
    // want a bad SMTP config to take down the worker — just logs so it's
    // visible. The first actual send will surface a real error.
    transporter.verify((err) => {
        if (err) {
            console.warn(`[email] SMTP verify failed: ${err.message}`)
        } else {
            console.log(`[email] SMTP ready (${ENV.SMTP_HOST}:${ENV.SMTP_PORT})`)
        }
    })
}

export type EmailMessage = {
    to: string
    subject: string
    html: string
    text: string
}

export async function sendEmailNow(msg: EmailMessage): Promise<void> {
    if (!transporter) {
        console.log(`[email] (SMTP not configured, dev fallback) → ${msg.to}`)
        console.log(`        subject: ${msg.subject}`)
        console.log(
            `        body:    ${msg.text.replace(/\n/g, "\n                 ")}`,
        )
        return
    }

    await transporter.sendMail({
        from: ENV.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
    })
}
