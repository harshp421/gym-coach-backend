export type EmailContent = {
    subject: string;
    html: string;
    text: string;
};
export declare function verificationEmail(input: {
    name: string | null;
    link: string;
}): EmailContent;
export declare function passwordResetEmail(input: {
    link: string;
}): EmailContent;
//# sourceMappingURL=templates.d.ts.map