// Pure functions for calorie + macro targets. No DB, no IO — easy to
// unit-test in isolation. Called by the diet plan service before the AI
// flow and (later) on `GET /diet/plan` for live target read-out.
//
// Worked example — 28y male, 178cm, 78kg, moderate activity, bulk goal:
//   BMR  = 10*78 + 6.25*178 - 5*28 + 5  = 1757.5
//   TDEE = 1757.5 * 1.55                 = 2724.1
//   kcal = 2724.1 + 300 (bulk)           ≈ 3024
//   prot = 1.8g/kg * 78                  = 140g   ( 560 kcal)
//   fat  = (3024 * 0.25) / 9             ≈  84g   ( 756 kcal)
//   carb = (3024 - 560 - 756) / 4        ≈ 427g

export type Sex = "male" | "female" | "other"
export type ActivityLevel =
    | "sedentary"
    | "light"
    | "moderate"
    | "active"
    | "very_active"
export type Goal = "cut" | "maintain" | "bulk" | "recomp"

export type TargetInputs = {
    sex: Sex
    ageYears: number
    heightCm: number
    weightKg: number
    activityLevel: ActivityLevel
    goal: Goal
}

export type Targets = {
    bmr: number
    tdee: number
    calorieTarget: number
    proteinTargetG: number
    carbTargetG: number
    fatTargetG: number
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
}

const GOAL_ADJUSTMENT_KCAL: Record<Goal, number> = {
    cut: -500,
    recomp: -150,
    maintain: 0,
    bulk: 300,
}

// Floor: don't ever prescribe below 1200 kcal — well below medically safe
// levels even for very small people. Ceiling: 4500 sanity cap so a 200kg
// "very active" bulker doesn't get a 5000 kcal target by accident.
const MIN_CALORIES = 1200
const MAX_CALORIES = 4500

/** Whole-year age from an ISO date string (YYYY-MM-DD), evaluated at `now`. */
export function computeAge(dobIso: string, now: Date = new Date()): number {
    // Treat date-only strings as UTC so a midnight-local DOB doesn't shift
    // age across timezone boundaries.
    const dob = new Date(`${dobIso}T00:00:00Z`)
    if (Number.isNaN(dob.getTime())) {
        throw new Error(`Invalid date of birth: ${dobIso}`)
    }
    let age = now.getUTCFullYear() - dob.getUTCFullYear()
    const monthDelta = now.getUTCMonth() - dob.getUTCMonth()
    if (
        monthDelta < 0 ||
        (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())
    ) {
        age--
    }
    return Math.max(0, age)
}

/** Mifflin–St Jeor BMR (kcal/day). */
export function computeBMR(input: {
    sex: Sex
    weightKg: number
    heightCm: number
    ageYears: number
}): number {
    const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears
    if (input.sex === "male") return base + 5
    if (input.sex === "female") return base - 161
    // 'other' → average of male and female formulas (base+5 + base-161)/2.
    return base - 78
}

export function computeTDEE(bmr: number, activityLevel: ActivityLevel): number {
    return bmr * ACTIVITY_MULTIPLIER[activityLevel]
}

export function computeCalorieTarget(tdee: number, goal: Goal): number {
    const adjusted = tdee + GOAL_ADJUSTMENT_KCAL[goal]
    return Math.round(clamp(adjusted, MIN_CALORIES, MAX_CALORIES))
}

/**
 * Macro split:
 *   protein = 2.0 g/kg (cut/recomp) or 1.8 g/kg (maintain/bulk)
 *   fat     = 25% of calories ÷ 9
 *   carbs   = remainder ÷ 4
 */
export function computeMacroTargets(
    weightKg: number,
    calorieTarget: number,
    goal: Goal,
): { proteinTargetG: number; carbTargetG: number; fatTargetG: number } {
    const proteinPerKg = goal === "cut" || goal === "recomp" ? 2.0 : 1.8
    const proteinTargetG = Math.round(proteinPerKg * weightKg)
    const fatTargetG = Math.round((0.25 * calorieTarget) / 9)
    const remainingKcal =
        calorieTarget - proteinTargetG * 4 - fatTargetG * 9
    const carbTargetG = Math.max(0, Math.round(remainingKcal / 4))
    return { proteinTargetG, carbTargetG, fatTargetG }
}

export function computeTargets(input: TargetInputs): Targets {
    const bmr = computeBMR(input)
    const tdee = computeTDEE(bmr, input.activityLevel)
    const calorieTarget = computeCalorieTarget(tdee, input.goal)
    const macros = computeMacroTargets(input.weightKg, calorieTarget, input.goal)
    return {
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        calorieTarget,
        proteinTargetG: macros.proteinTargetG,
        carbTargetG: macros.carbTargetG,
        fatTargetG: macros.fatTargetG,
    }
}

/**
 * Convenience: derive targets straight from a Profile shape + a current
 * weight reading (latest body_metrics row). All required profile fields
 * must be set — caller is responsible for null-checking before calling.
 */
export function targetsFromProfile(args: {
    profile: {
        sex: Sex
        dateOfBirth: string
        heightCm: number
        activityLevel: ActivityLevel
        goal: Goal
    }
    currentWeightKg: number
    now?: Date
}): Targets {
    const ageYears = computeAge(args.profile.dateOfBirth, args.now)
    return computeTargets({
        sex: args.profile.sex,
        ageYears,
        heightCm: args.profile.heightCm,
        weightKg: args.currentWeightKg,
        activityLevel: args.profile.activityLevel,
        goal: args.profile.goal,
    })
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n))
}
