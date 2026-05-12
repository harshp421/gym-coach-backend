export class HttpError extends Error {
    status;
    /**
     * Optional structured payload merged into the JSON response alongside
     * `error: <message>`. Use sparingly — for cases where the client needs
     * a discriminator beyond the message string (e.g. session_in_progress
     * carries the in-flight `sessionId` so the UI can deep-link).
     */
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.name = "HttpError";
        this.details = details;
    }
}
//# sourceMappingURL=http-error.js.map