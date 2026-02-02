/**
 * Meal Prep Service - Business logic for meal prep mode
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
import type { Database } from '../db/database.js';
import type { MealPrepPlan, PrepTask, MealPrepPlanInput } from '../types/meal-prep.js';
import { RecipeService } from './recipe-service.js';
export declare class MealPrepService {
    private db;
    private recipeService;
    constructor(db: Database, recipeService: RecipeService);
    generateMealPrepPlan(input: MealPrepPlanInput): MealPrepPlan;
    getMealPrepPlan(id: string): MealPrepPlan | undefined;
    completeTask(planId: string, taskId: string): PrepTask;
    uncompleteTask(planId: string, taskId: string): PrepTask;
    deleteMealPrepPlan(id: string): void;
    private analyzeSharedIngredients;
    private generatePrepTasks;
    private estimatePrepTime;
    private calculateTotalTime;
    private normalizeIngredientKey;
    private getTasks;
    private getTask;
    private getTaskRecipeIds;
    private getTaskPlanId;
}
//# sourceMappingURL=meal-prep-service.d.ts.map