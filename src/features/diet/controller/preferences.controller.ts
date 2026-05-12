import type { Request, Response } from "express"
import * as preferencesService from "../service/preferences.service.js"
import { userId } from "../../../utils/req-helpers.js"

// GET /api/v1/diet/preferences
//   Always returns a row (created with defaults if missing). hasAnswered
//   tells the frontend whether to send them through the questionnaire.
export async function getPreferences(req: Request, res: Response) {
    const preferences = await preferencesService.getOrCreatePreferences(
        userId(req),
    )
    res.json({
        preferences,
        hasAnswered: preferences.completedAt != null,
    })
}

// PUT /api/v1/diet/preferences — partial update from the settings screen.
export async function updatePreferences(req: Request, res: Response) {
    const preferences = await preferencesService.updatePreferences(
        userId(req),
        req.body,
    )
    res.json({ preferences })
}

// POST /api/v1/diet/preferences/complete — questionnaire submit.
export async function completePreferences(req: Request, res: Response) {
    const preferences = await preferencesService.completePreferences(
        userId(req),
        req.body,
    )
    res.status(201).json({ preferences })
}
