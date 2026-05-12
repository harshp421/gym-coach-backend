export type UserExercise = {
    id: string
    userId: string
    name: string
    slug: string
    primaryMuscles: string[]
    secondaryMuscles: string[]
    equipment: string | null
    mechanic: "compound" | "isolation" | null
    level: "beginner" | "intermediate" | "advanced"
    instructions: string[]
    demoUrl: string | null
    archivedAt: string | null
    createdAt: string
    updatedAt: string
}
