import type { SplitType } from "../../workouts/workout.types.js"

// Mirrors frontend/src/schemas/workout.ts SPLIT_LABEL. Used by the coach
// system prompt so the model sees a human-readable label instead of the
// snake_case enum value.
export const SPLIT_LABEL: Record<SplitType, string> = {
    full_body: "Full body",
    upper_lower: "Upper / Lower",
    push_pull_legs: "Push / Pull / Legs",
    bro_split: "Bro split",
    custom: "Custom",
}
