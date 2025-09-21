/**
 * Knight Fitness Service
 * Comprehensive fitness and health tracking system
 */

const Logger = require('../utils/logger');
const database = require('../database');

class FitnessService {
  constructor() {
    this.exerciseDatabase = this.loadExerciseDatabase();
    this.nutritionDatabase = this.loadNutritionDatabase();
  }

  async initialize() {
    try {
      Logger.success('Fitness service initialized');
    } catch (error) {
      Logger.error(`Fitness service initialization failed: ${error.message}`);
    }
  }

  loadExerciseDatabase() {
    return {
      // Cardio exercises
      'running': { name: 'Running', caloriesPerHour: 600, type: 'cardio', muscleGroups: ['legs', 'core'] },
      'cycling': { name: 'Cycling', caloriesPerHour: 500, type: 'cardio', muscleGroups: ['legs', 'core'] },
      'swimming': { name: 'Swimming', caloriesPerHour: 700, type: 'cardio', muscleGroups: ['full-body'] },
      'walking': { name: 'Walking', caloriesPerHour: 300, type: 'cardio', muscleGroups: ['legs'] },
      'jumping_jacks': { name: 'Jumping Jacks', caloriesPerHour: 400, type: 'cardio', muscleGroups: ['full-body'] },
      
      // Strength training
      'push-ups': { name: 'Push-ups', caloriesPerHour: 200, type: 'strength', muscleGroups: ['chest', 'arms', 'shoulders'] },
      'sit-ups': { name: 'Sit-ups', caloriesPerHour: 150, type: 'strength', muscleGroups: ['core'] },
      'squats': { name: 'Squats', caloriesPerHour: 180, type: 'strength', muscleGroups: ['legs', 'glutes'] },
      'lunges': { name: 'Lunges', caloriesPerHour: 160, type: 'strength', muscleGroups: ['legs', 'glutes'] },
      'planks': { name: 'Planks', caloriesPerHour: 100, type: 'strength', muscleGroups: ['core'] },
      
      // Yoga and flexibility
      'yoga': { name: 'Yoga', caloriesPerHour: 180, type: 'flexibility', muscleGroups: ['full-body'] },
      'stretching': { name: 'Stretching', caloriesPerHour: 120, type: 'flexibility', muscleGroups: ['full-body'] },
      
      // Sports
      'basketball': { name: 'Basketball', caloriesPerHour: 600, type: 'sport', muscleGroups: ['full-body'] },
      'soccer': { name: 'Soccer', caloriesPerHour: 500, type: 'sport', muscleGroups: ['legs', 'core'] },
      'tennis': { name: 'Tennis', caloriesPerHour: 450, type: 'sport', muscleGroups: ['arms', 'legs', 'core'] }
    };
  }

  loadNutritionDatabase() {
    return {
      // Fruits
      'apple': { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.5 },
      'banana': { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
      'orange': { name: 'Orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1 },
      
      // Vegetables
      'broccoli': { name: 'Broccoli', calories: 55, protein: 4.2, carbs: 11, fat: 0.6, fiber: 3.3 },
      'spinach': { name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
      'carrot': { name: 'Carrot', calories: 25, protein: 0.6, carbs: 6, fat: 0.2, fiber: 1.7 },
      
      // Proteins
      'chicken_breast': { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
      'salmon': { name: 'Salmon', calories: 206, protein: 22, carbs: 0, fat: 13, fiber: 0 },
      'eggs': { name: 'Eggs', calories: 70, protein: 6, carbs: 0.6, fat: 5, fiber: 0 },
      
      // Carbohydrates
      'rice': { name: 'Rice', calories: 205, protein: 4.3, carbs: 45, fat: 0.4, fiber: 0.6 },
      'bread': { name: 'Bread', calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.8 },
      'pasta': { name: 'Pasta', calories: 221, protein: 8, carbs: 43, fat: 1.3, fiber: 2.5 },
      
      // Dairy
      'milk': { name: 'Milk', calories: 103, protein: 8, carbs: 12, fat: 2.4, fiber: 0 },
      'cheese': { name: 'Cheese', calories: 113, protein: 7, carbs: 1.3, fat: 9.3, fiber: 0 }
    };
  }

  async logWorkout(userId, exercise, duration, intensity = 'medium') {
    try {
      // Validate exercise
      if (!this.exerciseDatabase[exercise.toLowerCase()]) {
        throw new Error(`Exercise "${exercise}" not found in database. Use !fitness exercises for available exercises.`);
      }
      
      const exerciseData = this.exerciseDatabase[exercise.toLowerCase()];
      
      // Calculate calories burned
      const caloriesPerMinute = exerciseData.caloriesPerHour / 60;
      const caloriesBurned = Math.round(caloriesPerMinute * duration);
      
      // Adjust for intensity
      const intensityMultiplier = {
        'low': 0.7,
        'medium': 1.0,
        'high': 1.3
      }[intensity.toLowerCase()] || 1.0;
      
      const adjustedCalories = Math.round(caloriesBurned * intensityMultiplier);
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO fitness_workouts 
        (user_jid, exercise, duration, intensity, calories_burned, logged_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, exercise.toLowerCase(), duration, intensity.toLowerCase(), adjustedCalories]);
      
      const workoutId = result.lastID;
      
      Logger.info(`Logged workout ${workoutId} for user ${userId}: ${exercise} for ${duration} minutes`);
      
      return {
        id: workoutId,
        exercise: exerciseData.name,
        duration: duration,
        intensity: intensity,
        caloriesBurned: adjustedCalories,
        muscleGroups: exerciseData.muscleGroups,
        type: exerciseData.type
      };
    } catch (error) {
      Logger.error(`Failed to log workout: ${error.message}`);
      throw new Error(`Failed to log workout: ${error.message}`);
    }
  }

  async logNutrition(userId, food, quantity = 1, unit = 'serving') {
    try {
      // Validate food
      if (!this.nutritionDatabase[food.toLowerCase()]) {
        throw new Error(`Food "${food}" not found in database. Use !fitness foods for available foods.`);
      }
      
      const foodData = this.nutritionDatabase[food.toLowerCase()];
      
      // Calculate nutritional values based on quantity
      const nutrition = {
        calories: Math.round(foodData.calories * quantity),
        protein: Math.round(foodData.protein * quantity * 10) / 10,
        carbs: Math.round(foodData.carbs * quantity * 10) / 10,
        fat: Math.round(foodData.fat * quantity * 10) / 10,
        fiber: Math.round(foodData.fiber * quantity * 10) / 10
      };
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO fitness_nutrition 
        (user_jid, food, quantity, unit, calories, protein, carbs, fat, fiber, logged_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        userId, 
        food.toLowerCase(), 
        quantity, 
        unit,
        nutrition.calories,
        nutrition.protein,
        nutrition.carbs,
        nutrition.fat,
        nutrition.fiber
      ]);
      
      const nutritionId = result.lastID;
      
      Logger.info(`Logged nutrition ${nutritionId} for user ${userId}: ${quantity} ${unit}(s) of ${food}`);
      
      return {
        id: nutritionId,
        food: foodData.name,
        quantity: quantity,
        unit: unit,
        nutrition: nutrition
      };
    } catch (error) {
      Logger.error(`Failed to log nutrition: ${error.message}`);
      throw new Error(`Failed to log nutrition: ${error.message}`);
    }
  }

  async setFitnessGoal(userId, goalType, targetValue, deadline = null) {
    try {
      const validGoals = ['workouts_per_week', 'calories_burned', 'weight_loss', 'muscle_gain'];
      
      if (!validGoals.includes(goalType)) {
        throw new Error(`Invalid goal type. Valid types: ${validGoals.join(', ')}`);
      }
      
      // Insert into database
      const result = await database.db.run(`
        INSERT INTO fitness_goals 
        (user_jid, goal_type, target_value, deadline, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, goalType, targetValue, deadline]);
      
      const goalId = result.lastID;
      
      Logger.info(`Set fitness goal ${goalId} for user ${userId}: ${goalType} - ${targetValue}`);
      
      return goalId;
    } catch (error) {
      Logger.error(`Failed to set fitness goal: ${error.message}`);
      throw new Error(`Failed to set fitness goal: ${error.message}`);
    }
  }

  async getWeeklySummary(userId, weekOffset = 0) {
    try {
      // Calculate date range
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() - (weekOffset * 7));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Get workouts for the week
      const workouts = await database.db.all(`
        SELECT * FROM fitness_workouts 
        WHERE user_jid = ? 
        AND logged_at >= ? 
        AND logged_at <= ?
        ORDER BY logged_at DESC
      `, [userId, startOfWeek.toISOString(), endOfWeek.toISOString()]);
      
      // Get nutrition for the week
      const nutrition = await database.db.all(`
        SELECT * FROM fitness_nutrition 
        WHERE user_jid = ? 
        AND logged_at >= ? 
        AND logged_at <= ?
        ORDER BY logged_at DESC
      `, [userId, startOfWeek.toISOString(), endOfWeek.toISOString()]);
      
      // Calculate totals
      const totalWorkouts = workouts.length;
      const totalCaloriesBurned = workouts.reduce((sum, workout) => sum + workout.calories_burned, 0);
      const totalCaloriesConsumed = nutrition.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = nutrition.reduce((sum, item) => sum + item.protein, 0);
      const totalCarbs = nutrition.reduce((sum, item) => sum + item.carbs, 0);
      const totalFat = nutrition.reduce((sum, item) => sum + item.fat, 0);
      
      // Get goals for the week
      const goals = await database.db.all(`
        SELECT * FROM fitness_goals 
        WHERE user_jid = ? 
        AND (deadline IS NULL OR deadline >= ?)
        ORDER BY created_at DESC
      `, [userId, startOfWeek.toISOString()]);
      
      return {
        period: {
          start: startOfWeek,
          end: endOfWeek,
          weekNumber: Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))
        },
        workouts: {
          count: totalWorkouts,
          caloriesBurned: totalCaloriesBurned,
          list: workouts.slice(0, 5) // Top 5 workouts
        },
        nutrition: {
          count: nutrition.length,
          caloriesConsumed: totalCaloriesConsumed,
          protein: Math.round(totalProtein * 10) / 10,
          carbs: Math.round(totalCarbs * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          list: nutrition.slice(0, 5) // Top 5 nutrition items
        },
        goals: goals,
        netCalories: totalCaloriesBurned - totalCaloriesConsumed
      };
    } catch (error) {
      Logger.error(`Failed to get weekly summary: ${error.message}`);
      throw new Error(`Failed to get weekly summary: ${error.message}`);
    }
  }

  async getAvailableExercises() {
    return Object.values(this.exerciseDatabase).map(exercise => ({
      name: exercise.name,
      type: exercise.type,
      caloriesPerHour: exercise.caloriesPerHour,
      muscleGroups: exercise.muscleGroups
    }));
  }

  async getAvailableFoods() {
    return Object.values(this.nutritionDatabase).map(food => ({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber
    }));
  }

  async getUserGoals(userId) {
    try {
      const goals = await database.db.all(`
        SELECT * FROM fitness_goals 
        WHERE user_jid = ?
        ORDER BY created_at DESC
      `, [userId]);
      
      return goals;
    } catch (error) {
      Logger.error(`Failed to get user goals: ${error.message}`);
      return [];
    }
  }

  async completeGoal(goalId, userId) {
    try {
      await database.db.run(`
        UPDATE fitness_goals 
        SET completed = 1, completed_at = CURRENT_TIMESTAMP 
        WHERE id = ? AND user_jid = ?
      `, [goalId, userId]);
      
      Logger.info(`Completed goal ${goalId} for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to complete goal ${goalId}: ${error.message}`);
      return false;
    }
  }

  async getWorkoutHistory(userId, limit = 10) {
    try {
      const workouts = await database.db.all(`
        SELECT * FROM fitness_workouts 
        WHERE user_jid = ?
        ORDER BY logged_at DESC
        LIMIT ?
      `, [userId, limit]);
      
      return workouts.map(workout => {
        const exerciseData = this.exerciseDatabase[workout.exercise] || { name: workout.exercise };
        return {
          ...workout,
          exerciseName: exerciseData.name,
          loggedAt: new Date(workout.logged_at)
        };
      });
    } catch (error) {
      Logger.error(`Failed to get workout history: ${error.message}`);
      return [];
    }
  }

  async getNutritionHistory(userId, limit = 10) {
    try {
      const nutrition = await database.db.all(`
        SELECT * FROM fitness_nutrition 
        WHERE user_jid = ?
        ORDER BY logged_at DESC
        LIMIT ?
      `, [userId, limit]);
      
      return nutrition.map(item => {
        const foodData = this.nutritionDatabase[item.food] || { name: item.food };
        return {
          ...item,
          foodName: foodData.name,
          loggedAt: new Date(item.logged_at)
        };
      });
    } catch (error) {
      Logger.error(`Failed to get nutrition history: ${error.message}`);
      return [];
    }
  }

  async getFitnessStats(userId) {
    try {
      // Get total workouts
      const totalWorkouts = await database.db.get(`
        SELECT COUNT(*) as count, SUM(calories_burned) as totalCalories 
        FROM fitness_workouts 
        WHERE user_jid = ?
      `, [userId]);
      
      // Get total nutrition
      const totalNutrition = await database.db.get(`
        SELECT COUNT(*) as count, SUM(calories) as totalCalories 
        FROM fitness_nutrition 
        WHERE user_jid = ?
      `, [userId]);
      
      // Get favorite exercise
      const favoriteExercise = await database.db.get(`
        SELECT exercise, COUNT(*) as count 
        FROM fitness_workouts 
        WHERE user_jid = ?
        GROUP BY exercise
        ORDER BY count DESC
        LIMIT 1
      `, [userId]);
      
      // Get favorite food
      const favoriteFood = await database.db.get(`
        SELECT food, COUNT(*) as count 
        FROM fitness_nutrition 
        WHERE user_jid = ?
        GROUP BY food
        ORDER BY count DESC
        LIMIT 1
      `, [userId]);
      
      return {
        workouts: {
          total: totalWorkouts.count,
          caloriesBurned: totalWorkouts.totalCalories || 0
        },
        nutrition: {
          total: totalNutrition.count,
          caloriesConsumed: totalNutrition.totalCalories || 0
        },
        favorites: {
          exercise: favoriteExercise ? this.exerciseDatabase[favoriteExercise.exercise]?.name || favoriteExercise.exercise : 'None',
          food: favoriteFood ? this.nutritionDatabase[favoriteFood.food]?.name || favoriteFood.food : 'None'
        }
      };
    } catch (error) {
      Logger.error(`Failed to get fitness stats: ${error.message}`);
      return {
        workouts: { total: 0, caloriesBurned: 0 },
        nutrition: { total: 0, caloriesConsumed: 0 },
        favorites: { exercise: 'None', food: 'None' }
      };
    }
  }

  async getHealthTips() {
    const tips = [
      "💧 Stay hydrated! Aim for 8 glasses of water per day.",
      "😴 Get 7-9 hours of quality sleep for optimal recovery.",
      "🥗 Eat a balanced diet with plenty of fruits and vegetables.",
      "🏋️‍♂️ Include strength training 2-3 times per week.",
      "🏃‍♀️ Mix cardio with strength training for best results.",
      "🧘 Practice stretching or yoga to improve flexibility.",
      "⏱️ Start slowly and gradually increase workout intensity.",
      "🎯 Set realistic, measurable fitness goals.",
      "👥 Find a workout buddy for motivation and accountability.",
      "📅 Consistency is key - make fitness a habit!",
      "🍎 Focus on whole foods rather than processed options.",
      "💤 Rest days are important for muscle recovery and growth.",
      "📏 Track your progress to stay motivated.",
      "🌞 Get some sunlight daily for vitamin D production.",
      "🧘 Manage stress through meditation or relaxation techniques."
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  formatWorkout(workout) {
    const exerciseData = this.exerciseDatabase[workout.exercise] || { name: workout.exercise };
    
    return `🏋️ *${exerciseData.name}*
⏱️ Duration: ${workout.duration} minutes
💪 Intensity: ${workout.intensity}
🔥 Calories Burned: ${workout.calories_burned}
📅 ${new Date(workout.logged_at).toLocaleString()}`;
  }

  formatNutrition(nutrition) {
    const foodData = this.nutritionDatabase[nutrition.food] || { name: nutrition.food };
    
    return `🍽️ *${foodData.name}*
📏 Quantity: ${nutrition.quantity} ${nutrition.unit}${nutrition.unit !== 'serving' ? '(s)' : ''}
🔥 Calories: ${nutrition.calories}
🥩 Protein: ${nutrition.protein}g
🍞 Carbs: ${nutrition.carbs}g
🥑 Fat: ${nutrition.fat}g
🌿 Fiber: ${nutrition.fiber}g
📅 ${new Date(nutrition.logged_at).toLocaleString()}`;
  }

  formatWeeklySummary(summary) {
    const weekRange = `${summary.period.start.toLocaleDateString()} - ${summary.period.end.toLocaleDateString()}`;
    
    return `📊 *Weekly Fitness Summary* (${weekRange})
    
🏋️ Workouts: ${summary.workouts.count}
🔥 Calories Burned: ${summary.workouts.caloriesBurned}
🍽️ Meals Logged: ${summary.nutrition.count}
🍔 Calories Consumed: ${summary.nutrition.caloriesConsumed}
⚖️ Net Calories: ${summary.netCalories >= 0 ? '+' : ''}${summary.netCalories}

💪 Favorite Exercise: ${summary.favorites.exercise}
🥗 Favorite Food: ${summary.favorites.food}`;
  }

  formatStats(stats) {
    return `📈 *Your Fitness Stats*
    
🏋️ Total Workouts: ${stats.workouts.total}
🔥 Total Calories Burned: ${stats.workouts.caloriesBurned}
🍽️ Total Meals Logged: ${stats.nutrition.total}
🍔 Total Calories Consumed: ${stats.nutrition.caloriesConsumed}
💪 Favorite Exercise: ${stats.favorites.exercise}
🥗 Favorite Food: ${stats.favorites.food}`;
  }
}

module.exports = new FitnessService();