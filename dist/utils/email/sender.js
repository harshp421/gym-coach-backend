import { Resend } from "resend";
import { ENV } from "../../config/env.config.js";
const resend = ENV.RESEND_API_KEY ? new Resend(ENV.RESEND_API_KEY) : null;
export async function sendEmailNow(msg) {
    if (!resend) {
        console.log(`[email] (no RESEND_API_KEY, dev fallback) → ${msg.to}`);
        console.log(`        subject: ${msg.subject}`);
        console.log(`        body:    ${msg.text.replace(/\n/g, "\n                 ")}`);
        return;
    }
    const result = await resend.emails.send({
        from: ENV.EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
    });
    if (result.error) {
        throw new Error(`Resend send failed: ${result.error.message}`);
    }
}
//# sourceMappingURL=sender.js.map