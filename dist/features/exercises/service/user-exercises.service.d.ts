import type { UserExercise } from "../user-exercises.types.js";
import type { CreateUserExerciseInput, UpdateUserExerciseInput } from "../user-exercises.schemas.js";
export declare function listUserExercises(userId: string, opts?: {
    includeArchived?: boolean;
}): Promise<UserExercise[]>;
/** Look up by id, scoped to the user. Returns null if not found / not owned. */
export declare function findUserExerciseById(userId: string, id: string): Promise<UserExercise | null>;
export declare function createUserExercise(userId: string, input: CreateUserExerciseInput): Promise<UserExercise>;
export declare function updateUserExercise(userId: string, id: string, input: UpdateUserExerciseInput): Promise<UserExercise>;
export declare function archiveUserExercise(userId: string, id: string): Promise<UserExercise>;
export declare function restoreUserExercise(userId: string, id: string): Promise<UserExercise>;
//# sourceMappingURL=user-exercises.service.d.ts.map