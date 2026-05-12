export type EmailContent = { subject: string; html: string; text: string }

export function verificationEmail(input: {
    name: string | null
    link: string
}): EmailContent {
    const greeting = input.name ? `Hi ${input.name},` : "Hi,"
    const subject = "Verify your email"
    const text = `${greeting}

Click the link below to verify your email and finish setting up your gym coach account:

${input.link}

This link expires in 24 hours.`

    const html = `
        <p style="font-family: sans-serif; font-size: 16px;">${greeting}</p>
        <p style="font-family: sans-serif; font-size: 16px;">
          Click below to verify your email and finish setting up your account.
        </p>
        <p style="margin: 24px 0;">
          <a href="${input.link}"
             style="background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:999px;
                    text-decoration:none;font-family:sans-serif;font-weight:600;">
            Verify email
          </a>
        </p>
        <p style="font-family: sans-serif; font-size: 13px; color: #666;">
          This link expires in 24 hours.
        </p>
    `

    return { subject, html, text }
}

export function passwordResetEmail(input: { link: string }): EmailContent {
    const subject = "Reset your gym coach password"
    const text = `Click the link below to reset your password:

${input.link}

This link expires in 1 hour. If you didn't request this, ignore this email.`

    const html = `
        <p style="font-family: sans-serif; font-size: 16px;">
          Click below to reset your password.
        </p>
        <p style="margin: 24px 0;">
          <a href="${input.link}"
             style="background:#0a0a0a;color:#fff;padding:12px 24px;border-radius:999px;
                    text-decoration:none;font-family:sans-serif;font-weight:600;">
            Reset password
          </a>
        </p>
        <p style="font-family: sans-serif; font-size: 13px; color: #666;">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
    `

    return { subject, html, text }
}
