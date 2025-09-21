/**
 * Recipe Command
 * Comprehensive recipe search and meal planning system
 */

const recipeService = require('../services/recipeService');
const Logger = require('../utils/logger');

module.exports = {
  name: 'recipe',
  aliases: ['cook', 'meal', 'recipes'],
  category: 'lifestyle',
  description: 'Comprehensive recipe search and meal planning system',
  usage: '!recipe <subcommand> [options]',
  
  async execute(client, message, args) {
    const subcommand = args[0]?.toLowerCase() || 'help';
    const userId = message.key.remoteJid;
    
    switch (subcommand) {
      case 'help':
        return `🍳 *Knight Recipe Finder*
        
Available subcommands:
▫️ help - Show this help
▫️ search <query> [filters] - Search for recipes
▫️ random [tags] - Get random recipe suggestions
▫️ details <recipe_id> - Get detailed recipe information
▫️ favorites - List your favorite recipes
▫️ favorite <recipe_id> - Add recipe to favorites
▫️ unfavorite <recipe_id> - Remove recipe from favorites
▫️ plan [days] - Generate meal plan
▫️ plan-details - Show current meal plan
▫️ shopping <recipe_ids> - Generate shopping list
▫️ shopping-lists - List your shopping lists
▫️ list <list_id> - Show shopping list details
▫️ suggestions [preferences] - Get recipe suggestions
▫️ tips <dietary_preference> - Get dietary tips
▫️ categories - Show recipe categories
▫️ cuisines - Show available cuisines
▫️ diets - Show dietary options

Examples:
!recipe search chicken
!recipe search pasta --cuisine italian --max-calories 500
!recipe random vegetarian
!recipe details scrambled_eggs
!recipe favorites
!recipe favorite pasta_primavera
!recipe plan 7
!recipe plan-details
!recipe shopping scrambled_eggs,chicken_salad
!recipe shopping-lists
!recipe list 123
!recipe suggestions --dietary vegetarian --cuisine mediterranean
!recipe tips vegan
!recipe categories
!recipe cuisines
!recipe diets`;

      case 'search':
        if (args.length < 2) {
          return `❌ Usage: !recipe search <query> [filters]
          
Filters:
--cuisine <cuisine>     Filter by cuisine
--category <category>   Filter by category (breakfast, lunch, dinner, dessert)
--dietary <diet>        Filter by dietary preference (vegetarian, vegan, gluten-free)
--max-calories <num>    Maximum calories per serving
--max-time <minutes>    Maximum preparation time
--limit <num>           Number of results (default: 10)

Examples:
!recipe search chicken
!recipe search pasta --cuisine italian --max-calories 500
!recipe search salad --category lunch --dietary vegetarian
!recipe search quick --max-time 30 --limit 5`;
        }
        
        try {
          const query = args[1];
          const options = {};
          
          // Parse filters
          for (let i = 2; i < args.length; i++) {
            if (args[i] === '--cuisine' && args[i + 1]) {
              options.cuisine = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--category' && args[i + 1]) {
              options.category = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--dietary' && args[i + 1]) {
              options.dietary = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--max-calories' && args[i + 1]) {
              options.maxCalories = parseInt(args[i + 1]);
              i++;
            } else if (args[i] === '--max-time' && args[i + 1]) {
              options.maxTime = parseInt(args[i + 1]);
              i++;
            } else if (args[i] === '--limit' && args[i + 1]) {
              options.limit = parseInt(args[i + 1]);
              i++;
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Searching for recipes: ${query}...` 
          });
          
          const recipes = await recipeService.searchRecipes(query, options);
          
          if (recipes.length === 0) {
            return `🍳 No recipes found for "${query}".
            
Try different search terms or fewer filters.`;
          }
          
          return recipeService.formatRecipeList(recipes);
        } catch (error) {
          Logger.error(`Recipe search error: ${error.message}`);
          return `❌ Failed to search recipes: ${error.message}`;
        }

      case 'random':
        try {
          const tags = args.length > 1 ? args.slice(1) : [];
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting random recipe suggestions...` 
          });
          
          const recipes = await recipeService.getRandomRecipes({ tags, limit: 5 });
          
          let response = `🎲 *Random Recipe Suggestions* (${recipes.length})\n\n`;
          
          recipes.forEach((recipe, index) => {
            response += `${index + 1}. ${recipe.name}
⏱️ ${recipe.prepTime || 'N/A'} mins | 👥 ${recipe.servings || 'N/A'} servings
🔥 ${recipe.calories ? `${recipe.calories} cal` : 'Calories N/A'}
📝 ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'} | 🌍 ${recipe.cuisine?.charAt(0).toUpperCase() + recipe.cuisine?.slice(1) || 'N/A'}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Random recipes error: ${error.message}`);
          return `❌ Failed to get random recipes: ${error.message}`;
        }

      case 'details':
        if (args.length < 2) {
          return '❌ Usage: !recipe details <recipe_id>';
        }
        
        try {
          const recipeId = args[1];
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting details for recipe: ${recipeId}...` 
          });
          
          const recipe = await recipeService.getRecipeDetails(recipeId);
          
          return recipeService.formatRecipe(recipe);
        } catch (error) {
          Logger.error(`Recipe details error: ${error.message}`);
          return `❌ Failed to get recipe details: ${error.message}`;
        }

      case 'favorites':
        try {
          const favorites = await recipeService.getFavoriteRecipes(userId);
          
          if (favorites.length === 0) {
            return `❤️ *Your Favorite Recipes*
            
You don't have any favorite recipes yet.
            
Save recipes with: !recipe favorite <recipe_id>

Examples:
!recipe favorite scrambled_eggs
!recipe favorite pasta_primavera`;
          }
          
          let response = `❤️ *Your Favorite Recipes* (${favorites.length})\n\n`;
          
          favorites.forEach((fav, index) => {
            response += `${index + 1}. ${fav.recipe_name}
🆔 ${fav.recipe_id}
📅 Added: ${new Date(fav.added_at).toLocaleDateString()}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Recipe favorites error: ${error.message}`);
          return `❌ Failed to get your favorite recipes: ${error.message}`;
        }

      case 'favorite':
        if (args.length < 2) {
          return '❌ Usage: !recipe favorite <recipe_id>';
        }
        
        try {
          const recipeId = args[1];
          
          const success = await recipeService.saveRecipeToFavorites(userId, recipeId);
          
          return success ? 
            `✅ Added to favorites successfully!` : 
            `❌ Failed to add to favorites. Recipe not found.`;
        } catch (error) {
          Logger.error(`Recipe favorite error: ${error.message}`);
          return `❌ Failed to add to favorites: ${error.message}`;
        }

      case 'unfavorite':
        if (args.length < 2) {
          return '❌ Usage: !recipe unfavorite <recipe_id>';
        }
        
        try {
          const recipeId = args[1];
          
          const success = await recipeService.removeRecipeFromFavorites(userId, recipeId);
          
          return success ? 
            `✅ Removed from favorites successfully!` : 
            `❌ Failed to remove from favorites. Recipe not found in favorites.`;
        } catch (error) {
          Logger.error(`Recipe unfavorite error: ${error.message}`);
          return `❌ Failed to remove from favorites: ${error.message}`;
        }

      case 'plan':
        try {
          const days = args[1] ? parseInt(args[1]) : 7;
          
          if (isNaN(days) || days < 1 || days > 30) {
            return '❌ Days must be between 1 and 30';
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Generating ${days}-day meal plan...` 
          });
          
          const plan = await recipeService.getMealPlan(userId, days);
          
          return recipeService.formatMealPlan(plan);
        } catch (error) {
          Logger.error(`Meal plan error: ${error.message}`);
          return `❌ Failed to generate meal plan: ${error.message}`;
        }

      case 'plan-details':
        try {
          const plan = await recipeService.getMealPlan(userId, 7);
          
          return recipeService.formatMealPlan(plan);
        } catch (error) {
          Logger.error(`Meal plan details error: ${error.message}`);
          return `❌ Failed to get meal plan: ${error.message}`;
        }

      case 'shopping':
        if (args.length < 2) {
          return `❌ Usage: !recipe shopping <recipe_ids>
          
Recipe IDs should be comma-separated.
          
Examples:
!recipe shopping scrambled_eggs,chicken_salad
!recipe shopping pasta_primavera,oatmeal,chocolate_chip_cookies`;
        }
        
        try {
          const recipeIds = args[1].split(',').map(id => id.trim());
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Generating shopping list for ${recipeIds.length} recipes...` 
          });
          
          const shoppingList = await recipeService.generateShoppingList(userId, recipeIds);
          
          return recipeService.formatShoppingList(shoppingList);
        } catch (error) {
          Logger.error(`Shopping list error: ${error.message}`);
          return `❌ Failed to generate shopping list: ${error.message}`;
        }

      case 'shopping-lists':
        try {
          const lists = await recipeService.getShoppingLists(userId);
          
          if (lists.length === 0) {
            return `🛒 *Your Shopping Lists*
            
You don't have any shopping lists yet.
            
Generate lists with: !recipe shopping <recipe_ids>

Examples:
!recipe shopping scrambled_eggs,chicken_salad
!recipe shopping pasta_primavera,oatmeal`;
          }
          
          let response = `🛒 *Your Shopping Lists* (${lists.length})\n\n`;
          
          lists.forEach((list, index) => {
            const recipeIds = JSON.parse(list.recipe_ids || '[]');
            response += `${index + 1}. ${recipeIds.length} recipes
📅 Created: ${new Date(list.created_at).toLocaleDateString()}
🆔 ${list.id}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Shopping lists error: ${error.message}`);
          return `❌ Failed to get your shopping lists: ${error.message}`;
        }

      case 'list':
        if (args.length < 2) {
          return '❌ Usage: !recipe list <list_id>';
        }
        
        try {
          const listId = parseInt(args[1]);
          if (isNaN(listId)) {
            return '❌ Please provide a valid list ID.';
          }
          
          const listDetails = await recipeService.getShoppingListDetails(listId, userId);
          
          let response = `🛒 *Shopping List #${listDetails.id}*\n\n`;
          
          listDetails.items.forEach((item, index) => {
            response += `${index + 1}. ${item.amount || ''} ${item.unit || ''} ${item.ingredient_name}\n`;
            
            if (item.recipes) {
              const recipes = JSON.parse(item.recipes);
              response += `   📋 For: ${recipes.join(', ')}\n`;
            }
            
            response += '\n';
          });
          
          response += `📅 Created: ${new Date(listDetails.created_at).toLocaleDateString()}\n`;
          response += `📊 Items: ${listDetails.items.length}`;
          
          return response;
        } catch (error) {
          Logger.error(`Shopping list details error: ${error.message}`);
          return `❌ Failed to get shopping list details: ${error.message}`;
        }

      case 'suggestions':
        try {
          const preferences = {};
          
          // Parse preferences
          for (let i = 1; i < args.length; i++) {
            if (args[i] === '--dietary' && args[i + 1]) {
              preferences.dietary = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--cuisine' && args[i + 1]) {
              preferences.cuisine = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--category' && args[i + 1]) {
              preferences.category = args[i + 1].toLowerCase();
              i++;
            } else if (args[i] === '--max-calories' && args[i + 1]) {
              preferences.maxCalories = parseInt(args[i + 1]);
              i++;
            }
          }
          
          await client.sendMessage(message.key.remoteJid, { 
            text: `🔄 Getting recipe suggestions...` 
          });
          
          const suggestions = await recipeService.getRecipeSuggestions(userId, preferences);
          
          let response = `💡 *Recipe Suggestions* (${suggestions.length})\n\n`;
          
          suggestions.forEach((recipe, index) => {
            response += `${index + 1}. ${recipe.name}
⏱️ ${recipe.prepTime || 'N/A'} mins | 👥 ${recipe.servings || 'N/A'} servings
🔥 ${recipe.calories ? `${recipe.calories} cal` : 'Calories N/A'}
📝 ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'} | 🌍 ${recipe.cuisine?.charAt(0).toUpperCase() + recipe.cuisine?.slice(1) || 'N/A'}\n\n`;
          });
          
          return response;
        } catch (error) {
          Logger.error(`Recipe suggestions error: ${error.message}`);
          return `❌ Failed to get recipe suggestions: ${error.message}`;
        }

      case 'tips':
        try {
          const dietaryPreference = args[1] || 'general';
          
          const tip = await recipeService.getDietaryTips(dietaryPreference);
          
          return `💡 *Dietary Tip*
          
${tip}`;
        } catch (error) {
          Logger.error(`Dietary tips error: ${error.message}`);
          return `❌ Failed to get dietary tips: ${error.message}`;
        }

      case 'categories':
        try {
          const categories = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'appetizer', 'soup', 'salad'];
          
          let response = `📚 *Recipe Categories* (${categories.length})\n\n`;
          
          categories.forEach((category, index) => {
            response += `${index + 1}. ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
          });
          
          response += `\n📝 Usage: !recipe search <query> --category <category>
Example: !recipe search pasta --category dinner`;
          
          return response;
        } catch (error) {
          Logger.error(`Recipe categories error: ${error.message}`);
          return `❌ Failed to get recipe categories: ${error.message}`;
        }

      case 'cuisines':
        try {
          const cuisines = ['american', 'italian', 'mexican', 'chinese', 'indian', 'french', 'thai', 'japanese', 'mediterranean', 'middle-eastern'];
          
          let response = `🌍 *Available Cuisines* (${cuisines.length})\n\n`;
          
          cuisines.forEach((cuisine, index) => {
            response += `${index + 1}. ${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}\n`;
          });
          
          response += `\n📝 Usage: !recipe search <query> --cuisine <cuisine>
Example: !recipe search pasta --cuisine italian`;
          
          return response;
        } catch (error) {
          Logger.error(`Recipe cuisines error: ${error.message}`);
          return `❌ Failed to get cuisines: ${error.message}`;
        }

      case 'diets':
        try {
          const diets = ['vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo', 'low-carb', 'high-protein', 'dairy-free'];
          
          let response = `🥗 *Dietary Options* (${diets.length})\n\n`;
          
          diets.forEach((diet, index) => {
            response += `${index + 1}. ${diet.charAt(0).toUpperCase() + diet.slice(1)}\n`;
          });
          
          response += `\n📝 Usage: !recipe search <query> --dietary <diet>
Example: !recipe search salad --dietary vegetarian`;
          
          return response;
        } catch (error) {
          Logger.error(`Recipe diets error: ${error.message}`);
          return `❌ Failed to get dietary options: ${error.message}`;
        }

      default:
        return `❌ Unknown subcommand: ${subcommand}
        
Type !recipe help for available commands`;
    }
  }
};