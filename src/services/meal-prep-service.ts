/**
 * Meal Prep Service - Business logic for meal prep mode
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db/database.js';
import type { MealPrepPlan, PrepTask, SharedIngredient, MealPrepPlanInput, PrepTaskType } from '../types/meal-prep.js';
import type { Recipe, Ingredient } from '../types/recipe.js';
import type { Duration } from '../types/units.js';
import { RecipeService } from './recipe-service.js';

export class MealPrepService {
  constructor(private db: Database, private recipeService: RecipeService) {}

  generateMealPrepPlan(input: MealPrepPlanInput): MealPrepPlan {
    const { recipeIds, servingsOverride } = input;
    if (recipeIds.length === 0) throw new Error('At least one recipe is required for meal prep');
    const recipes: Recipe[] = [];
    for (const recipeId of recipeIds) {
      const recipe = this.recipeService.getRecipe(recipeId);
      if (!recipe) throw new Error('Recipe not found: ' + recipeId);
      recipes.push(recipe);
    }
    const sharedIngredients = this.analyzeSharedIngredients(recipes, servingsOverride);
    const tasks = this.generatePrepTasks(recipes, sharedIngredients);
    const totalTime = this.calculateTotalTime(tasks);
    const planId = uuidv4();
    const now = new Date().toISOString();
    return this.db.transaction(() => {
      this.db.run('INSERT INTO meal_prep_plans (id, created_at) VALUES (?, ?)', [planId, now]);
      for (const recipeId of recipeIds) {
        this.db.run('INSERT INTO meal_prep_plan_recipes (plan_id, recipe_id) VALUES (?, ?)', [planId, recipeId]);
      }
      for (const task of tasks) {
        this.db.run('INSERT INTO prep_tasks (id, plan_id, description, duration_minutes, task_order, completed, task_type, ingredient_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [task.id, planId, task.description, task.duration.minutes, task.order, task.completed ? 1 : 0, task.taskType, task.ingredientName ?? null]);
        for (const rid of task.recipeIds) {
          this.db.run('INSERT INTO prep_task_recipes (task_id, recipe_id) VALUES (?, ?)', [task.id, rid]);
        }
      }
      return { id: planId, recipeIds, tasks, totalTime, sharedIngredients, createdAt: new Date(now) };
    });
  }

  getMealPrepPlan(id: string): MealPrepPlan | undefined {
    const planRow = this.db.get<[string, string]>('SELECT id, created_at FROM meal_prep_plans WHERE id = ?', [id]);
    if (!planRow) return undefined;
    const [planId, createdAt] = planRow;
    const recipeRows = this.db.exec('SELECT recipe_id FROM meal_prep_plan_recipes WHERE plan_id = ?', [planId]);
    const recipeIds = recipeRows.map((row) => row[0] as string);
    const tasks = this.getTasks(planId);
    const recipes = recipeIds.map((rid) => this.recipeService.getRecipe(rid)).filter((r): r is Recipe => r !== undefined);
    const sharedIngredients = this.analyzeSharedIngredients(recipes);
    const totalTime = this.calculateTotalTime(tasks);
    return { id: planId, recipeIds, tasks, totalTime, sharedIngredients, createdAt: new Date(createdAt) };
  }

  completeTask(planId: string, taskId: string): PrepTask {
    const task = this.getTask(taskId);
    if (!task) throw new Error('Task not found: ' + taskId);
    const taskPlanId = this.getTaskPlanId(taskId);
    if (taskPlanId !== planId) throw new Error('Task ' + taskId + ' does not belong to plan ' + planId);
    this.db.run('UPDATE prep_tasks SET completed = 1 WHERE id = ?', [taskId]);
    return { ...task, completed: true };
  }

  uncompleteTask(planId: string, taskId: string): PrepTask {
    const task = this.getTask(taskId);
    if (!task) throw new Error('Task not found: ' + taskId);
    const taskPlanId = this.getTaskPlanId(taskId);
    if (taskPlanId !== planId) throw new Error('Task ' + taskId + ' does not belong to plan ' + planId);
    this.db.run('UPDATE prep_tasks SET completed = 0 WHERE id = ?', [taskId]);
    return { ...task, completed: false };
  }

  deleteMealPrepPlan(id: string): void {
    const plan = this.getMealPrepPlan(id);
    if (!plan) throw new Error('Meal prep plan not found: ' + id);
    this.db.transaction(() => {
      this.db.run('DELETE FROM prep_task_recipes WHERE task_id IN (SELECT id FROM prep_tasks WHERE plan_id = ?)', [id]);
      this.db.run('DELETE FROM prep_tasks WHERE plan_id = ?', [id]);
      this.db.run('DELETE FROM meal_prep_plan_recipes WHERE plan_id = ?', [id]);
      this.db.run('DELETE FROM meal_prep_plans WHERE id = ?', [id]);
    });
  }

  private analyzeSharedIngredients(recipes: Recipe[], servingsOverride?: Map<string, number>): SharedIngredient[] {
    const ingredientMap = new Map<string, { name: string; unit: string; recipeIds: Set<string>; quantities: Map<string, number> }>();
    for (const recipe of recipes) {
      const scaleFactor = servingsOverride ? (servingsOverride.get(recipe.id) ?? recipe.servings) / recipe.servings : 1;
      for (const ingredient of recipe.ingredients) {
        const key = this.normalizeIngredientKey(ingredient);
        const scaledQuantity = ingredient.quantity * scaleFactor;
        const existing = ingredientMap.get(key);
        if (existing) {
          existing.recipeIds.add(recipe.id);
          const currentQty = existing.quantities.get(recipe.id) ?? 0;
          existing.quantities.set(recipe.id, currentQty + scaledQuantity);
        } else {
          ingredientMap.set(key, { name: ingredient.name, unit: ingredient.unit, recipeIds: new Set([recipe.id]), quantities: new Map([[recipe.id, scaledQuantity]]) });
        }
      }
    }
    const sharedIngredients: SharedIngredient[] = [];
    for (const entry of ingredientMap.values()) {
      if (entry.recipeIds.size > 1) {
        let totalQuantity = 0;
        for (const qty of entry.quantities.values()) totalQuantity += qty;
        sharedIngredients.push({ name: entry.name, totalQuantity, unit: entry.unit, recipeIds: Array.from(entry.recipeIds), quantitiesPerRecipe: entry.quantities });
      }
    }
    return sharedIngredients;
  }

  private generatePrepTasks(recipes: Recipe[], sharedIngredients: SharedIngredient[]): PrepTask[] {
    const tasks: PrepTask[] = [];
    let order = 1;
    for (const shared of sharedIngredients) {
      tasks.push({ id: uuidv4(), description: 'Prepare ' + shared.name + ' (' + shared.totalQuantity.toFixed(2) + ' ' + shared.unit + ' total for ' + shared.recipeIds.length + ' recipes)', recipeIds: shared.recipeIds, duration: { minutes: this.estimatePrepTime(shared.name) }, order: order++, completed: false, taskType: 'ingredient_prep', ingredientName: shared.name });
    }
    const sharedIngredientKeys = new Set(sharedIngredients.map((s) => this.normalizeIngredientKey({ name: s.name, unit: s.unit } as Ingredient)));
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = this.normalizeIngredientKey(ingredient);
        if (!sharedIngredientKeys.has(key)) {
          tasks.push({ id: uuidv4(), description: 'Prepare ' + ingredient.name + ' (' + ingredient.quantity + ' ' + ingredient.unit + ') for ' + recipe.title, recipeIds: [recipe.id], duration: { minutes: this.estimatePrepTime(ingredient.name) }, order: order++, completed: false, taskType: 'ingredient_prep', ingredientName: ingredient.name });
        }
      }
    }
    for (const recipe of recipes) {
      for (const instruction of recipe.instructions) {
        tasks.push({ id: uuidv4(), description: '[' + recipe.title + '] Step ' + instruction.step + ': ' + instruction.text, recipeIds: [recipe.id], duration: instruction.duration ?? { minutes: 5 }, order: order++, completed: false, taskType: 'cooking' });
      }
    }
    return tasks;
  }

  private estimatePrepTime(ingredientName: string): number {
    const name = ingredientName.toLowerCase();
    if (name.includes('onion') || name.includes('garlic')) return 5;
    if (name.includes('carrot') || name.includes('celery')) return 3;
    if (name.includes('potato') || name.includes('squash')) return 8;
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 10;
    return 2;
  }

  private calculateTotalTime(tasks: PrepTask[]): Duration {
    let totalMinutes = 0;
    for (const task of tasks) totalMinutes += task.duration.minutes;
    return { minutes: totalMinutes };
  }

  private normalizeIngredientKey(ingredient: { name: string; unit: string }): string {
    return ingredient.name.toLowerCase().trim() + '|' + ingredient.unit;
  }

  private getTasks(planId: string): PrepTask[] {
    const rows = this.db.exec('SELECT id, description, duration_minutes, task_order, completed, task_type, ingredient_name FROM prep_tasks WHERE plan_id = ? ORDER BY task_order', [planId]);
    return rows.map((row) => {
      const taskId = row[0] as string;
      const recipeIds = this.getTaskRecipeIds(taskId);
      return { id: taskId, description: row[1] as string, duration: { minutes: row[2] as number }, order: row[3] as number, completed: (row[4] as number) === 1, taskType: row[5] as PrepTaskType, ingredientName: row[6] as string | undefined, recipeIds };
    });
  }

  private getTask(taskId: string): PrepTask | undefined {
    const row = this.db.get<[string, string, number, number, number, string, string | null]>('SELECT id, description, duration_minutes, task_order, completed, task_type, ingredient_name FROM prep_tasks WHERE id = ?', [taskId]);
    if (!row) return undefined;
    const recipeIds = this.getTaskRecipeIds(taskId);
    return { id: row[0], description: row[1], duration: { minutes: row[2] }, order: row[3], completed: row[4] === 1, taskType: row[5] as PrepTaskType, ingredientName: row[6] ?? undefined, recipeIds };
  }

  private getTaskRecipeIds(taskId: string): string[] {
    const rows = this.db.exec('SELECT recipe_id FROM prep_task_recipes WHERE task_id = ?', [taskId]);
    return rows.map((row) => row[0] as string);
  }

  private getTaskPlanId(taskId: string): string | undefined {
    const row = this.db.get<[string]>('SELECT plan_id FROM prep_tasks WHERE id = ?', [taskId]);
    return row?.[0];
  }
}
