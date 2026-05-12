export type EmailMessage = {
    to: string;
    subject: string;
    html: string;
    text: string;
};
export declare function sendEmailNow(msg: EmailMessage): Promise<void>;
//# sourceMappingURL=sender.d.ts.map