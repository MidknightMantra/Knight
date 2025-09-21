/**
 * Fitness Command
 * Comprehensive fitness and health tracking system
 */

const fitnessService = require('../services/fitnessService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'fitness',
  aliases: ['fit', 'workout', 'health'],
  category: 'lifestyle',
  description: 'Comprehensive fitness and health tracking system',
  usage: '!fitness <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `💪 *Knight Fitness Tracker*
        
Available subcommands:
▫️ help - Show this help
▫️ workout <exercise> <duration> [intensity] - Log a workout
▫️ nutrition <food> [quantity] [unit] - Log nutrition
▫️ goal <type> <target> [deadline] - Set a fitness goal
▫️ goals - List your fitness goals
▫️ complete <goal_id> - Mark goal as complete
▫️ summary [week_offset] - Get weekly fitness summary
▫️ stats - Show your fitness statistics
▫️ history - Show workout/nutrition history
▫️ exercises - List available exercises
▫️ foods - List available foods
▫️ tips - Get health and fitness tips
▫️ reminder <type> <time> [days] - Set fitness reminder
▫️ reminders - List your fitness reminders
▫️ progress <metric> <value> - Log body metrics
▫️ progress-report - Show progress report

Examples:
!fitness workout running 30 high
!fitness nutrition banana 2
!fitness goal workouts_per_week 5
!fitness goals
!fitness summary
!fitness stats
!fitness exercises
!fitness foods
!fitness tips
!fitness reminder workout "07:00" "1,2,3,4,5"
!fitness reminders`;

      case 'workout':
        if (args.length < 3) {
          return `❌ Usage: !fitness workout <exercise> <duration_minutes> [intensity]
          
Intensity options: low, medium, high (default: medium)

Examples:
!fitness workout running 30
!fitness workout push-ups 15 high
!fitness workout yoga 45 low
!fitness workout swimming 60 medium`;
        }
        
        try {
          const exercise = args[1];
          const duration = parseInt(args[2]);
          const intensity = args[3] || 'medium';
          
          if (isNaN(duration)) {
            return '❌ Please provide a valid duration in minutes.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Logging workout: ${exercise} for ${duration} minutes...` 
          });
          
          const workout = await fitnessService.logWorkout(userId, exercise, duration, intensity);
          
          return `✅ *Workout Logged Successfully!*
          
🏋️ Exercise: ${workout.exercise}
⏱️ Duration: ${workout.duration} minutes
💪 Intensity: ${workout.intensity}
🔥 Calories Burned: ${workout.caloriesBurned}
🎯 Muscle Groups: ${workout.muscleGroups.join(', ')}
📅 Logged: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Fitness workout error: ${error.message}`);
          return `❌ Failed to log workout: ${error.message}`;
        }

      case 'nutrition':
        if (args.length < 2) {
          return `❌ Usage: !fitness nutrition <food> [quantity] [unit]
          
Examples:
!fitness nutrition apple
!fitness nutrition banana 2
!fitness nutrition rice 1.5 cups
!fitness nutrition chicken_breast 200 grams`;
        }
        
        try {
          const food = args[1];
          const quantity = args[2] ? parseFloat(args[2]) : 1;
          const unit = args[3] || 'serving';
          
          if (isNaN(quantity)) {
            return '❌ Please provide a valid quantity.';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Logging nutrition: ${quantity} ${unit}(s) of ${food}...` 
          });
          
          const nutrition = await fitnessService.logNutrition(userId, food, quantity, unit);
          
          return `✅ *Nutrition Logged Successfully!*
          
🍽️ Food: ${nutrition.food}
📏 Quantity: ${nutrition.quantity} ${nutrition.unit}${nutrition.unit !== 'serving' ? '(s)' : ''}
🔥 Calories: ${nutrition.nutrition.calories}
🥩 Protein: ${nutrition.nutrition.protein}g
🍞 Carbs: ${nutrition.nutrition.carbs}g
🥑 Fat: ${nutrition.nutrition.fat}g
🌿 Fiber: ${nutrition.nutrition.fiber}g
📅 Logged: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Fitness nutrition error: ${error.message}`);
          return `❌ Failed to log nutrition: ${error.message}`;
        }

      case 'goal':
        if (args.length < 3) {
          return `❌ Usage: !fitness goal <type> <target_value> [deadline]
          
Goal types: workouts_per_week, calories_burned, weight_loss, muscle_gain

Examples:
!fitness goal workouts_per_week 5
!fitness goal calories_burned 3000
!fitness goal weight_loss 5 2025-12-31
!fitness goal muscle_gain 2`;
        }
        
        try {
          const goalType = args[1];
          const targetValue = parseFloat(args[2]);
          const deadline = args[3] || null;
          
          if (isNaN(targetValue)) {
            return '❌ Please provide a valid target value.';
          }
          
          const goalId = await fitnessService.setFitnessGoal(userId, goalType, targetValue, deadline);
          
          return `✅ *Fitness Goal Set Successfully!*
          
🆔 ID: ${goalId}
🎯 Goal: ${goalType.replace('_', ' ')}
🏁 Target: ${targetValue}${goalType === 'workouts_per_week' ? ' workouts/week' : ''}
${deadline ? `📅 Deadline: ${new Date(deadline).toLocaleDateString()}` : ''}
📊 Track your progress with !fitness goals`;
        } catch (error) {
          Logger.error(`Fitness goal error: ${error.message}`);
          return `❌ Failed to set fitness goal: ${error.message}`;
        }

      case 'goals':
        try {
          const goals = await fitnessService.getUserGoals(userId);
          
          if (goals.length === 0) {
            return `🎯 *Your Fitness Goals*
            
You don't have any active fitness goals yet.
            
Set goals with: !fitness goal <type> <target>

Examples:
!fitness goal workouts_per_week 5
!fitness goal calories_burned 3000
!fitness goal weight_loss 5`;
          }
          
          let response = `🎯 *Your Active Fitness Goals* (${goals.length})\n\n`;
          
          goals.forEach((goal, index) => {
            const status = goal.completed ? '✅ Completed' : '⏳ Active';
            const targetUnit = goal.goal_type === 'workouts_per_week' ? ' workouts/week' : '';
            
            response += `${index + 1}. ${goal.goal_type.replace('_', ' ')}
🎯 Target: ${goal.target_value}${targetUnit}
${status}
🆔 ${goal.id}
📅 Created: ${new Date(goal.created_at).toLocaleDateString()}
${goal.deadline ? `📅 Deadline: ${new Date(goal.deadline).toLocaleDateString()}` : ''}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Fitness goals error: ${error.message}`);
          return `❌ Failed to get your fitness goals: ${error.message}`;
        }

      case 'complete':
        if (args.length < 2) {
          return '❌ Usage: !fitness complete <goal_id>';
        }
        
        try {
          const goalId = parseInt(args[1]);
          if (isNaN(goalId)) {
            return '❌ Please provide a valid goal ID.';
          }
          
          const success = await fitnessService.completeGoal(goalId, userId);
          
          return success ? 
            `✅ Goal ${goalId} marked as complete!` : 
            `❌ Failed to complete goal ${goalId}. Goal not found or access denied.`;
        } catch (error) {
          Logger.error(`Fitness complete error: ${error.message}`);
          return `❌ Failed to complete goal: ${error.message}`;
        }

      case 'summary':
        try {
          const weekOffset = args[1] ? parseInt(args[1]) : 0;
          
          if (isNaN(weekOffset)) {
            return '❌ Please provide a valid week offset (0 = current week, 1 = last week, etc.).';
          }
          
          const summary = await fitnessService.getWeeklySummary(userId, weekOffset);
          
          return fitnessService.formatWeeklySummary(summary);
        } catch (error) {
          Logger.error(`Fitness summary error: ${error.message}`);
          return `❌ Failed to get weekly summary: ${error.message}`;
        }

      case 'stats':
        try {
          const stats = await fitnessService.getFitnessStats(userId);
          
          return fitnessService.formatStats(stats);
        } catch (error) {
          Logger.error(`Fitness stats error: ${error.message}`);
          return `❌ Failed to get your fitness stats: ${error.message}`;
        }

      case 'history':
        try {
          const workouts = await fitnessService.getWorkoutHistory(userId, 5);
          const nutrition = await fitnessService.getNutritionHistory(userId, 5);
          
          if (workouts.length === 0 && nutrition.length === 0) {
            return `📝 *Your Fitness History*
            
No workouts or nutrition logged yet.
            
Start tracking with:
!fitness workout <exercise> <duration>
!fitness nutrition <food> [quantity]`;
          }
          
          let response = `📝 *Your Recent Fitness History*\n\n`;
          
          if (workouts.length > 0) {
            response += `🏋️ *Recent Workouts* (${workouts.length})\n\n`;
            workouts.forEach((workout, index) => {
              response += `${index + 1}. ${workout.exerciseName}
⏱️ ${workout.duration} min | 🔥 ${workout.calories_burned} cal
📅 ${new Date(workout.logged_at).toLocaleDateString()}\n\n`;
            });
          }
          
          if (nutrition.length > 0) {
            response += `🍽️ *Recent Nutrition* (${nutrition.length})\n\n`;
            nutrition.forEach((item, index) => {
              response += `${index + 1}. ${item.foodName}
🔥 ${item.calories} cal | 🥩 ${item.protein}g protein
📅 ${new Date(item.logged_at).toLocaleDateString()}\n\n`;
            });
          }
          
          return response;
        } catch (error) {
          Logger.error(`Fitness history error: ${error.message}`);
          return `❌ Failed to get your fitness history: ${error.message}`;
        }

      case 'exercises':
        try {
          const exercises = await fitnessService.getAvailableExercises();
          
          let response = `🏋️ *Available Exercises* (${exercises.length})\n\n`;
          
          exercises.forEach((exercise, index) => {
            response += `${index + 1}. ${exercise.name}
🔥 ${exercise.caloriesPerHour} cal/hour
💪 ${exercise.type} | 🎯 ${exercise.muscleGroups.join(', ')}\n\n`;
          });
          
          response += `📝 Usage: !fitness workout <exercise_name> <duration_minutes> [intensity]`;
          
          return response;
        } catch (error) {
          Logger.error(`Fitness exercises error: ${error.message}`);
          return `❌ Failed to get available exercises: ${error.message}`;
        }

      case 'foods':
        try {
          const foods = await fitnessService.getAvailableFoods();
          
          let response = `🍽️ *Available Foods* (${foods.length})\n\n`;
          
          foods.forEach((food, index) => {
            response += `${index + 1}. ${food.name}
🔥 ${food.calories} cal | 🥩 ${food.protein}g protein
🍞 ${food.carbs}g carbs | 🥑 ${food.fat}g fat\n\n`;
          });
          
          response += `📝 Usage: !fitness nutrition <food_name> [quantity] [unit]`;
          
          return response;
        } catch (error) {
          Logger.error(`Fitness foods error: ${error.message}`);
          return `❌ Failed to get available foods: ${error.message}`;
        }

      case 'tips':
        try {
          const tip = await fitnessService.getHealthTips();
          return `💡 *Health & Fitness Tip*
          
${tip}`;
        } catch (error) {
          Logger.error(`Fitness tips error: ${error.message}`);
          return `❌ Failed to get health tips: ${error.message}`;
        }

      case 'reminder':
        if (args.length < 3) {
          return `❌ Usage: !fitness reminder <type> <time> [days_of_week]
          
Types: workout, meal, water, sleep
Days: 0-6 (Sunday-Saturday), comma-separated

Examples:
!fitness reminder workout "07:00" "1,2,3,4,5"
!fitness reminder water "10:00" "0,1,2,3,4,5,6"
!fitness reminder meal "12:00" "1,3,5"`;
        }
        
        try {
          const reminderType = args[1];
          const time = args[2];
          const daysOfWeek = args[3] || '0,1,2,3,4,5,6'; // All days by default
          
          // Validate time format (HH:MM)
          if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            return '❌ Please provide time in HH:MM format (24-hour).';
          }
          
          // Insert into database
          const result = await database.db.run(`
            INSERT INTO fitness_reminders 
            (user_jid, reminder_type, time, days_of_week, active, created_at)
            VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          `, [userId, reminderType, time, daysOfWeek]);
          
          const reminderId = result.lastID;
          
          return `✅ *Fitness Reminder Set Successfully!*
          
🆔 ID: ${reminderId}
🔔 Type: ${reminderType}
⏰ Time: ${time}
📅 Days: ${daysOfWeek}
📊 Reminder will be sent at the specified time on selected days.`;
        } catch (error) {
          Logger.error(`Fitness reminder error: ${error.message}`);
          return `❌ Failed to set fitness reminder: ${error.message}`;
        }

      case 'reminders':
        try {
          const reminders = await database.db.all(`
            SELECT * FROM fitness_reminders 
            WHERE user_jid = ? AND active = 1
            ORDER BY time ASC
          `, [userId]);
          
          if (reminders.length === 0) {
            return `⏰ *Your Fitness Reminders*
            
You don't have any active fitness reminders yet.
            
Set reminders with: !fitness reminder <type> <time> [days]

Examples:
!fitness reminder workout "07:00" "1,2,3,4,5"
!fitness reminder water "10:00" "0,1,2,3,4,5,6"`;
          }
          
          let response = `⏰ *Your Active Fitness Reminders* (${reminders.length})\n\n`;
          
          reminders.forEach((reminder, index) => {
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const days = reminder.days_of_week.split(',').map(day => dayNames[parseInt(day)]).join(', ');
            
            response += `${index + 1}. ${reminder.reminder_type}
⏰ ${reminder.time}
📅 ${days}
🆔 ${reminder.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Fitness reminders error: ${error.message}`);
          return `❌ Failed to get your fitness reminders: ${error.message}`;
        }

      case 'progress':
        if (args.length < 3) {
          return `❌ Usage: !fitness progress <metric> <value>
          
Metrics: weight, body_fat, muscle_mass, resting_heart_rate

Examples:
!fitness progress weight 75.5
!fitness progress body_fat 15.2
!fitness progress muscle_mass 30.1
!fitness progress resting_heart_rate 65`;
        }
        
        try {
          const metric = args[1];
          const value = parseFloat(args[2]);
          
          if (isNaN(value)) {
            return '❌ Please provide a valid numeric value.';
          }
          
          // Insert into database
          await database.db.run(`
            INSERT INTO fitness_progress 
            (user_jid, metric, value, recorded_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `, [userId, metric, value]);
          
          return `✅ *Progress Recorded Successfully!*
          
📊 Metric: ${metric.replace('_', ' ')}
📈 Value: ${value}
📅 Recorded: ${new Date().toLocaleString()}`;
        } catch (error) {
          Logger.error(`Fitness progress error: ${error.message}`);
          return `❌ Failed to record progress: ${error.message}`;
        }

      case 'progress-report':
        try {
          const progress = await database.db.all(`
            SELECT * FROM fitness_progress 
            WHERE user_jid = ?
            ORDER BY recorded_at DESC
            LIMIT 20
          `, [userId]);
          
          if (progress.length === 0) {
            return `📊 *Progress Report*
            
No progress data recorded yet.
            
Start tracking with: !fitness progress <metric> <value>

Examples:
!fitness progress weight 75.5
!fitness progress body_fat 15.2`;
          }
          
          let response = `📊 *Your Progress Report* (${progress.length} entries)\n\n`;
          
          // Group by metric
          const groupedProgress = {};
          progress.forEach(entry => {
            if (!groupedProgress[entry.metric]) {
              groupedProgress[entry.metric] = [];
            }
            groupedProgress[entry.metric].push(entry);
          });
          
          // Show latest entries for each metric
          Object.keys(groupedProgress).forEach(metric => {
            const entries = groupedProgress[metric];
            const latest = entries[0];
            const oldest = entries[entries.length - 1];
            
            response += `📈 *${metric.replace('_', ' ')}*
📊 Latest: ${latest.value}
📅 ${new Date(latest.recorded_at).toLocaleDateString()}
${entries.length > 1 ? `📊 First: ${oldest.value}\n📊 Change: ${latest.value - oldest.value}\n` : ''}
\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Fitness progress-report error: ${error.message}`);
          return `❌ Failed to get progress report: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !fitness help for available commands`;
    }
  }
};