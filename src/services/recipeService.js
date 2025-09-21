/**
 * Knight Recipe Service
 * Comprehensive recipe search and meal planning system
 */

const Logger = require('../utils/logger');
const database = require('../database');
const https = require('https');

class RecipeService {
  constructor() {
    this.cache = new Map(); // Cache for recipe data
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes cache
    this.apiKey = process.env.SPOONACULAR_API_KEY || process.env.RECIPE_API_KEY;
    this.recipeDatabase = this.loadRecipeDatabase();
  }

  async initialize() {
    try {
      Logger.success('Recipe service initialized');
    } catch (error) {
      Logger.error(`Recipe service initialization failed: ${error.message}`);
    }
  }

  loadRecipeDatabase() {
    return {
      // Breakfast recipes
      'scrambled_eggs': {
        id: 'scrambled_eggs',
        name: 'Scrambled Eggs',
        category: 'breakfast',
        cuisine: 'international',
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        servings: 2,
        difficulty: 'easy',
        ingredients: [
          { name: 'eggs', amount: 4, unit: 'large' },
          { name: 'milk', amount: 2, unit: 'tablespoons' },
          { name: 'salt', amount: 0.25, unit: 'teaspoon' },
          { name: 'black pepper', amount: 0.125, unit: 'teaspoon' },
          { name: 'butter', amount: 1, unit: 'tablespoon' }
        ],
        instructions: [
          'Crack eggs into a bowl and whisk until well combined.',
          'Add milk, salt, and pepper. Whisk again.',
          'Heat butter in a non-stick skillet over medium-low heat.',
          'Pour in egg mixture and gently stir continuously.',
          'Cook until eggs are creamy and set, about 3-5 minutes.',
          'Serve immediately.'
        ],
        nutrition: {
          calories: 140,
          protein: 12,
          carbs: 1,
          fat: 10,
          fiber: 0
        },
        tags: ['vegetarian', 'quick', 'protein-rich']
      },
      
      'oatmeal': {
        id: 'oatmeal',
        name: 'Overnight Oats',
        category: 'breakfast',
        cuisine: 'international',
        prepTime: 5,
        cookTime: 0,
        totalTime: 5,
        servings: 1,
        difficulty: 'easy',
        ingredients: [
          { name: 'rolled oats', amount: 0.5, unit: 'cup' },
          { name: 'milk', amount: 0.5, unit: 'cup' },
          { name: 'chia seeds', amount: 1, unit: 'tablespoon' },
          { name: 'honey', amount: 1, unit: 'tablespoon' },
          { name: 'berries', amount: 0.25, unit: 'cup' }
        ],
        instructions: [
          'Combine oats, milk, and chia seeds in a jar.',
          'Add honey and mix well.',
          'Cover and refrigerate overnight (or at least 4 hours).',
          'In the morning, top with berries before serving.'
        ],
        nutrition: {
          calories: 300,
          protein: 10,
          carbs: 50,
          fat: 8,
          fiber: 8
        },
        tags: ['vegetarian', 'healthy', 'make-ahead']
      },
      
      // Lunch recipes
      'chicken_salad': {
        id: 'chicken_salad',
        name: 'Grilled Chicken Salad',
        category: 'lunch',
        cuisine: 'american',
        prepTime: 15,
        cookTime: 10,
        totalTime: 25,
        servings: 2,
        difficulty: 'medium',
        ingredients: [
          { name: 'chicken breast', amount: 1, unit: 'piece' },
          { name: 'mixed greens', amount: 2, unit: 'cups' },
          { name: 'cherry tomatoes', amount: 0.5, unit: 'cup' },
          { name: 'cucumber', amount: 0.5, unit: 'cup' },
          { name: 'olive oil', amount: 2, unit: 'tablespoons' },
          { name: 'lemon juice', amount: 1, unit: 'tablespoon' },
          { name: 'salt', amount: 0.25, unit: 'teaspoon' },
          { name: 'black pepper', amount: 0.125, unit: 'teaspoon' }
        ],
        instructions: [
          'Season chicken breast with salt and pepper.',
          'Grill chicken for 5-6 minutes per side until cooked through.',
          'Let rest for 5 minutes, then slice.',
          'In a large bowl, combine mixed greens, tomatoes, and cucumber.',
          'Whisk together olive oil, lemon juice, salt, and pepper for dressing.',
          'Toss salad with dressing and top with sliced chicken.'
        ],
        nutrition: {
          calories: 350,
          protein: 35,
          carbs: 15,
          fat: 18,
          fiber: 4
        },
        tags: ['high-protein', 'gluten-free', 'keto-friendly']
      },
      
      // Dinner recipes
      'pasta_primavera': {
        id: 'pasta_primavera',
        name: 'Pasta Primavera',
        category: 'dinner',
        cuisine: 'italian',
        prepTime: 15,
        cookTime: 20,
        totalTime: 35,
        servings: 4,
        difficulty: 'medium',
        ingredients: [
          { name: 'penne pasta', amount: 12, unit: 'oz' },
          { name: 'broccoli', amount: 2, unit: 'cups' },
          { name: 'bell peppers', amount: 2, unit: 'pieces' },
          { name: 'zucchini', amount: 1, unit: 'medium' },
          { name: 'cherry tomatoes', amount: 1, unit: 'cup' },
          { name: 'garlic', amount: 3, unit: 'cloves' },
          { name: 'olive oil', amount: 3, unit: 'tablespoons' },
          { name: 'parmesan cheese', amount: 0.5, unit: 'cup' },
          { name: 'salt', amount: 1, unit: 'teaspoon' },
          { name: 'black pepper', amount: 0.5, unit: 'teaspoon' },
          { name: 'basil', amount: 0.25, unit: 'cup' }
        ],
        instructions: [
          'Cook pasta according to package directions. Drain and set aside.',
          'While pasta cooks, chop vegetables and garlic.',
          'Heat olive oil in a large skillet over medium heat.',
          'Add garlic and sauté for 1 minute until fragrant.',
          'Add broccoli, bell peppers, and zucchini. Cook 5-7 minutes until tender.',
          'Add cherry tomatoes and cook 2 more minutes.',
          'Season with salt and pepper.',
          'Add cooked pasta to vegetables and toss to combine.',
          'Stir in parmesan cheese and fresh basil.',
          'Serve hot.'
        ],
        nutrition: {
          calories: 420,
          protein: 18,
          carbs: 55,
          fat: 15,
          fiber: 6
        },
        tags: ['vegetarian', 'family-friendly', 'mediterranean']
      },
      
      // Dessert recipes
      'chocolate_chip_cookies': {
        id: 'chocolate_chip_cookies',
        name: 'Classic Chocolate Chip Cookies',
        category: 'dessert',
        cuisine: 'american',
        prepTime: 15,
        cookTime: 12,
        totalTime: 27,
        servings: 24,
        difficulty: 'easy',
        ingredients: [
          { name: 'all-purpose flour', amount: 2.25, unit: 'cups' },
          { name: 'baking soda', amount: 1, unit: 'teaspoon' },
          { name: 'salt', amount: 1, unit: 'teaspoon' },
          { name: 'butter', amount: 1, unit: 'cup' },
          { name: 'granulated sugar', amount: 0.75, unit: 'cup' },
          { name: 'brown sugar', amount: 0.75, unit: 'cup' },
          { name: 'vanilla extract', amount: 1, unit: 'teaspoon' },
          { name: 'eggs', amount: 2, unit: 'large' },
          { name: 'chocolate chips', amount: 2, unit: 'cups' }
        ],
        instructions: [
          'Preheat oven to 375°F (190°C).',
          'Mix flour, baking soda, and salt in a bowl.',
          'Cream butter, granulated sugar, brown sugar, and vanilla in a separate bowl.',
          'Beat in eggs one at a time.',
          'Gradually blend in flour mixture.',
          'Stir in chocolate chips.',
          'Drop rounded tablespoons of dough onto ungreased cookie sheets.',
          'Bake 9-11 minutes until golden brown.',
          'Cool on baking sheet for 2 minutes; remove to wire rack.'
        ],
        nutrition: {
          calories: 120,
          protein: 2,
          carbs: 18,
          fat: 6,
          fiber: 1
        },
        tags: ['dessert', 'baking', 'classic']
      }
    };
  }

  async searchRecipes(query, options = {}) {
    try {
      const {
        cuisine = null,
        category = null,
        dietary = null,
        maxCalories = null,
        maxTime = null,
        limit = 10
      } = options;

      // Check cache first
      const cacheKey = `search_${query}_${cuisine}_${category}_${dietary}_${maxCalories}_${maxTime}_${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached recipe search for ${query}`);
        return cached.data;
      }

      let results;
      
      // If API key is available, use Spoonacular API
      if (this.apiKey) {
        results = await this.searchRecipesAPI(query, options);
      } else {
        // Use local database for search
        results = this.searchRecipesLocal(query, options);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         results,
        timestamp: Date.now()
      });

      return results.slice(0, limit);
    } catch (error) {
      Logger.error(`Recipe search error: ${error.message}`);
      
      // Fallback to local search
      const results = this.searchRecipesLocal(query, options);
      return results.slice(0, options.limit || 10);
    }
  }

  searchRecipesLocal(query, options = {}) {
    const {
      cuisine = null,
      category = null,
      dietary = null,
      maxCalories = null,
      maxTime = null
    } = options;

    const queryLower = query.toLowerCase();
    
    return Object.values(this.recipeDatabase).filter(recipe => {
      // Match query in name or ingredients
      const nameMatch = recipe.name.toLowerCase().includes(queryLower);
      const ingredientMatch = recipe.ingredients.some(ing => 
        ing.name.toLowerCase().includes(queryLower)
      );
      
      if (!nameMatch && !ingredientMatch && query !== 'all') {
        return false;
      }
      
      // Apply filters
      if (cuisine && recipe.cuisine !== cuisine) return false;
      if (category && recipe.category !== category) return false;
      
      if (dietary) {
        if (dietary === 'vegetarian' && !recipe.tags.includes('vegetarian')) return false;
        if (dietary === 'vegan' && !recipe.tags.includes('vegan')) return false;
        if (dietary === 'gluten-free' && !recipe.tags.includes('gluten-free')) return false;
      }
      
      if (maxCalories && recipe.nutrition.calories > maxCalories) return false;
      if (maxTime && recipe.totalTime > maxTime) return false;
      
      return true;
    }).sort((a, b) => {
      // Sort by relevance and rating
      const aScore = this.calculateRecipeScore(a, queryLower);
      const bScore = this.calculateRecipeScore(b, queryLower);
      return bScore - aScore;
    });
  }

  async searchRecipesAPI(query, options = {}) {
    try {
      const {
        cuisine = null,
        category = null,
        dietary = null,
        maxCalories = null,
        maxTime = null,
        limit = 10
      } = options;

      let apiUrl = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${this.apiKey}&query=${encodeURIComponent(query)}&number=${limit}`;
      
      if (cuisine) apiUrl += `&cuisine=${cuisine}`;
      if (category) apiUrl += `&type=${category}`;
      if (dietary) apiUrl += `&diet=${dietary}`;
      if (maxCalories) apiUrl += `&maxCalories=${maxCalories}`;
      if (maxTime) apiUrl += `&maxReadyTime=${maxTime}`;
      
      const data = await this.fetchFromAPI(apiUrl);
      
      const recipes = data.results.map(recipe => ({
        id: recipe.id,
        name: recipe.title,
        image: recipe.image,
        category: recipe.dishTypes ? recipe.dishTypes[0] : 'misc',
        cuisine: recipe.cuisines ? recipe.cuisines[0] : 'international',
        prepTime: recipe.readyInMinutes || 30,
        servings: recipe.servings || 4,
        calories: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Calories')?.amount || 0 : 0,
        protein: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Protein')?.amount || 0 : 0,
        carbs: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0 : 0,
        fat: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Fat')?.amount || 0 : 0
      }));
      
      return recipes;
    } catch (error) {
      Logger.error(`Spoonacular API error: ${error.message}`);
      throw new Error(`Failed to search recipes via API: ${error.message}`);
    }
  }

  calculateRecipeScore(recipe, query) {
    let score = 0;
    
    // Higher score for exact name matches
    if (recipe.name.toLowerCase().includes(query)) {
      score += 10;
    }
    
    // Score for ingredient matches
    const ingredientMatches = recipe.ingredients.filter(ing => 
      ing.name.toLowerCase().includes(query)
    ).length;
    score += ingredientMatches * 5;
    
    // Bonus for popular tags
    if (recipe.tags.includes('popular')) score += 3;
    if (recipe.tags.includes('quick')) score += 2;
    if (recipe.tags.includes('healthy')) score += 2;
    
    return score;
  }

  async getRecipeDetails(recipeId) {
    try {
      // Check cache first
      const cacheKey = `recipe_${recipeId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        Logger.info(`Returning cached recipe details for ${recipeId}`);
        return cached.data;
      }

      let recipe;
      
      // Check if it's a local recipe
      if (this.recipeDatabase[recipeId]) {
        recipe = this.recipeDatabase[recipeId];
      } else if (this.apiKey) {
        // Fetch from API if available
        recipe = await this.getRecipeDetailsAPI(recipeId);
      } else {
        throw new Error(`Recipe ${recipeId} not found`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
         recipe,
        timestamp: Date.now()
      });

      return recipe;
    } catch (error) {
      Logger.error(`Recipe details error: ${error.message}`);
      throw new Error(`Failed to get recipe details: ${error.message}`);
    }
  }

  async getRecipeDetailsAPI(recipeId) {
    try {
      const apiUrl = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${this.apiKey}&includeNutrition=true`;
      const data = await this.fetchFromAPI(apiUrl);
      
      return {
        id: data.id,
        name: data.title,
        image: data.image,
        description: data.summary ? data.summary.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '',
        category: data.dishTypes ? data.dishTypes[0] : 'misc',
        cuisine: data.cuisines ? data.cuisines[0] : 'international',
        prepTime: data.preparationMinutes || 15,
        cookTime: data.cookingMinutes || 30,
        totalTime: data.readyInMinutes || 45,
        servings: data.servings || 4,
        difficulty: data.difficulty || 'medium',
        ingredients: data.extendedIngredients ? data.extendedIngredients.map(ing => ({
          name: ing.name,
          amount: ing.amount || 1,
          unit: ing.unit || 'piece',
          aisle: ing.aisle
        })) : [],
        instructions: data.analyzedInstructions && data.analyzedInstructions[0] ? 
          data.analyzedInstructions[0].steps.map(step => step.step) : 
          ['Instructions not available'],
        nutrition: data.nutrition ? {
          calories: data.nutrition.nutrients.find(n => n.name === 'Calories')?.amount || 0,
          protein: data.nutrition.nutrients.find(n => n.name === 'Protein')?.amount || 0,
          carbs: data.nutrition.nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0,
          fat: data.nutrition.nutrients.find(n => n.name === 'Fat')?.amount || 0,
          fiber: data.nutrition.nutrients.find(n => n.name === 'Fiber')?.amount || 0
        } : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        tags: data.diets || [],
        equipment: data.equipment ? data.equipment.map(eq => eq.name) : []
      };
    } catch (error) {
      Logger.error(`Spoonacular recipe details error: ${error.message}`);
      throw new Error(`Failed to get recipe details via API: ${error.message}`);
    }
  }

  async getRandomRecipes(options = {}) {
    try {
      const {
        tags = [],
        limit = 5
      } = options;

      if (this.apiKey) {
        // Use API for random recipes
        const tagParam = tags.length > 0 ? `&tags=${tags.join(',')}` : '';
        const apiUrl = `https://api.spoonacular.com/recipes/random?apiKey=${this.apiKey}&number=${limit}${tagParam}`;
        const data = await this.fetchFromAPI(apiUrl);
        
        return data.recipes.map(recipe => ({
          id: recipe.id,
          name: recipe.title,
          image: recipe.image,
          category: recipe.dishTypes ? recipe.dishTypes[0] : 'misc',
          cuisine: recipe.cuisines ? recipe.cuisines[0] : 'international',
          prepTime: recipe.readyInMinutes || 30,
          servings: recipe.servings || 4,
          calories: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Calories')?.amount || 0 : 0
        }));
      } else {
        // Use local database for random recipes
        const allRecipes = Object.values(this.recipeDatabase);
        const filteredRecipes = tags.length > 0 ? 
          allRecipes.filter(recipe => tags.some(tag => recipe.tags.includes(tag))) : 
          allRecipes;
        
        // Shuffle and return random recipes
        const shuffled = filteredRecipes.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
      }
    } catch (error) {
      Logger.error(`Random recipes error: ${error.message}`);
      
      // Fallback to local random recipes
      const allRecipes = Object.values(this.recipeDatabase);
      const shuffled = allRecipes.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, options.limit || 5);
    }
  }

  async getMealPlan(userId, days = 7) {
    try {
      // Check if user has existing meal plan
      const existingPlan = await database.db.get(`
        SELECT * FROM recipe_meal_plans 
        WHERE user_jid = ? AND start_date >= DATE('now')
        ORDER BY start_date ASC
        LIMIT 1
      `, [userId]);
      
      if (existingPlan) {
        // Return existing plan
        const planItems = await database.db.all(`
          SELECT * FROM recipe_meal_plan_items 
          WHERE plan_id = ?
          ORDER BY meal_date ASC, meal_type ASC
        `, [existingPlan.id]);
        
        return {
          id: existingPlan.id,
          startDate: existingPlan.start_date,
          endDate: existingPlan.end_date,
          items: planItems
        };
      }
      
      // Generate new meal plan
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + days);
      
      // Insert meal plan
      const result = await database.db.run(`
        INSERT INTO recipe_meal_plans 
        (user_jid, start_date, end_date, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
      
      const planId = result.lastID;
      
      // Generate meal plan items
      const mealPlanItems = [];
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date();
        currentDate.setDate(startDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        for (const mealType of mealTypes) {
          // Get random recipe for this meal type
          const recipes = Object.values(this.recipeDatabase).filter(r => r.category === mealType);
          if (recipes.length > 0) {
            const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
            
            await database.db.run(`
              INSERT INTO recipe_meal_plan_items 
              (plan_id, meal_date, meal_type, recipe_id, recipe_name, created_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [planId, dateString, mealType, randomRecipe.id, randomRecipe.name]);
            
            mealPlanItems.push({
              date: dateString,
              type: mealType,
              recipeId: randomRecipe.id,
              recipeName: randomRecipe.name
            });
          }
        }
      }
      
      Logger.info(`Generated meal plan ${planId} for user ${userId} (${days} days)`);
      
      return {
        id: planId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        items: mealPlanItems
      };
    } catch (error) {
      Logger.error(`Meal plan error: ${error.message}`);
      throw new Error(`Failed to generate meal plan: ${error.message}`);
    }
  }

  async saveRecipeToFavorites(userId, recipeId) {
    try {
      // Check if recipe exists
      const recipe = this.recipeDatabase[recipeId] || await this.getRecipeDetails(recipeId);
      
      if (!recipe) {
        throw new Error(`Recipe ${recipeId} not found`);
      }
      
      // Insert into favorites
      await database.db.run(`
        INSERT OR IGNORE INTO recipe_favorites 
        (user_jid, recipe_id, recipe_name, added_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, recipeId, recipe.name]);
      
      Logger.info(`Saved recipe ${recipeId} to favorites for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Save favorite error: ${error.message}`);
      return false;
    }
  }

  async getFavoriteRecipes(userId) {
    try {
      const favorites = await database.db.all(`
        SELECT * FROM recipe_favorites 
        WHERE user_jid = ?
        ORDER BY added_at DESC
        LIMIT 20
      `, [userId]);
      
      return favorites;
    } catch (error) {
      Logger.error(`Get favorites error: ${error.message}`);
      return [];
    }
  }

  async removeRecipeFromFavorites(userId, recipeId) {
    try {
      await database.db.run(`
        DELETE FROM recipe_favorites 
        WHERE user_jid = ? AND recipe_id = ?
      `, [userId, recipeId]);
      
      Logger.info(`Removed recipe ${recipeId} from favorites for user ${userId}`);
      return true;
    } catch (error) {
      Logger.error(`Remove favorite error: ${error.message}`);
      return false;
    }
  }

  async generateShoppingList(userId, recipeIds) {
    try {
      const ingredients = {};
      
      // Get ingredients for each recipe
      for (const recipeId of recipeIds) {
        try {
          const recipe = await this.getRecipeDetails(recipeId);
          
          recipe.ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            if (!ingredients[key]) {
              ingredients[key] = {
                name: ingredient.name,
                amount: 0,
                unit: ingredient.unit,
                recipes: []
              };
            }
            
            ingredients[key].amount += ingredient.amount || 1;
            ingredients[key].recipes.push(recipe.name);
          });
        } catch (error) {
          Logger.error(`Failed to get ingredients for recipe ${recipeId}: ${error.message}`);
        }
      }
      
      // Convert to array and sort
      const shoppingList = Object.values(ingredients).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // Save to database
      const result = await database.db.run(`
        INSERT INTO recipe_shopping_lists 
        (user_jid, recipe_ids, created_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [userId, JSON.stringify(recipeIds)]);
      
      const listId = result.lastID;
      
      // Save list items
      for (const item of shoppingList) {
        await database.db.run(`
          INSERT INTO recipe_shopping_list_items 
          (list_id, ingredient_name, amount, unit, recipes, added_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [listId, item.name, item.amount, item.unit, JSON.stringify(item.recipes)]);
      }
      
      Logger.info(`Generated shopping list ${listId} for user ${userId} with ${shoppingList.length} items`);
      
      return {
        id: listId,
        items: shoppingList,
        recipeCount: recipeIds.length
      };
    } catch (error) {
      Logger.error(`Shopping list error: ${error.message}`);
      throw new Error(`Failed to generate shopping list: ${error.message}`);
    }
  }

  async getShoppingLists(userId) {
    try {
      const lists = await database.db.all(`
        SELECT * FROM recipe_shopping_lists 
        WHERE user_jid = ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);
      
      return lists;
    } catch (error) {
      Logger.error(`Get shopping lists error: ${error.message}`);
      return [];
    }
  }

  async getShoppingListDetails(listId, userId) {
    try {
      // Verify ownership
      const list = await database.db.get(`
        SELECT * FROM recipe_shopping_lists 
        WHERE id = ? AND user_jid = ?
      `, [listId, userId]);
      
      if (!list) {
        throw new Error('Shopping list not found or access denied');
      }
      
      // Get list items
      const items = await database.db.all(`
        SELECT * FROM recipe_shopping_list_items 
        WHERE list_id = ?
        ORDER BY ingredient_name ASC
      `, [listId]);
      
      return {
        ...list,
        items: items
      };
    } catch (error) {
      Logger.error(`Get shopping list details error: ${error.message}`);
      throw new Error(`Failed to get shopping list details: ${error.message}`);
    }
  }

  async getRecipeSuggestions(userId, preferences = {}) {
    try {
      const {
        dietary = null,
        cuisine = null,
        category = null,
        maxCalories = null
      } = preferences;
      
      // Get user's favorite recipes for analysis
      const favorites = await this.getFavoriteRecipes(userId);
      
      if (this.apiKey && favorites.length > 0) {
        // Use Spoonacular's recipe recommendation API
        const favoriteIds = favorites.map(fav => fav.recipe_id).join(',');
        const apiUrl = `https://api.spoonacular.com/recipes/${favoriteIds}/similar?apiKey=${this.apiKey}&number=5`;
        const data = await this.fetchFromAPI(apiUrl);
        
        const suggestions = data.map(recipe => ({
          id: recipe.id,
          name: recipe.title,
          image: recipe.image,
          category: recipe.dishTypes ? recipe.dishTypes[0] : 'misc',
          cuisine: recipe.cuisines ? recipe.cuisines[0] : 'international',
          prepTime: recipe.readyInMinutes || 30,
          servings: recipe.servings || 4,
          calories: recipe.nutrition ? recipe.nutrition.nutrients.find(n => n.name === 'Calories')?.amount || 0 : 0
        }));
        
        return suggestions;
      } else {
        // Use local database for suggestions
        const allRecipes = Object.values(this.recipeDatabase);
        const suggestedRecipes = [];
        
        // Filter based on preferences
        const filteredRecipes = allRecipes.filter(recipe => {
          if (dietary && !recipe.tags.includes(dietary)) return false;
          if (cuisine && recipe.cuisine !== cuisine) return false;
          if (category && recipe.category !== category) return false;
          if (maxCalories && recipe.nutrition.calories > maxCalories) return false;
          return true;
        });
        
        // Get random suggestions
        const shuffled = filteredRecipes.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 5);
      }
    } catch (error) {
      Logger.error(`Recipe suggestions error: ${error.message}`);
      
      // Fallback to random recipes
      const allRecipes = Object.values(this.recipeDatabase);
      const shuffled = allRecipes.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 5);
    }
  }

  async getDietaryTips(dietaryPreference) {
    const tips = {
      'vegetarian': [
        '🌱 Include variety in plant proteins like beans, lentils, tofu, and quinoa.',
        '🧀 Don\'t forget dairy and eggs for complete amino acid profiles.',
        '🌰 Nuts and seeds are excellent sources of healthy fats and protein.',
        '🌈 Eat colorful vegetables to ensure diverse nutrient intake.',
        '🥛 Consider B12 supplements as it\'s primarily found in animal products.'
      ],
      'vegan': [
        '🌾 Combine grains and legumes for complete proteins (like rice and beans).',
        '💊 Supplement with B12, Vitamin D, and Omega-3 from algae.',
        '🥛 Fortified plant milks can provide calcium and vitamin D.',
        '🌱 Fermented foods like tempeh and kimchi boost gut health.',
        '🥜 Nuts, seeds, and avocados provide essential fatty acids.'
      ],
      'gluten-free': [
        '🌾 Choose naturally gluten-free grains: quinoa, rice, buckwheat, millet.',
        '⚠️ Read labels carefully - gluten hides in unexpected places.',
        '🍯 Xanthan gum can replace gluten in baking for texture.',
        '🥔 Potato starch and tapioca flour work well in gluten-free baking.',
        '🥦 Focus on whole foods rather than processed gluten-free products.'
      ],
      'keto': [
        '🥑 Prioritize healthy fats: avocado, olive oil, nuts, and seeds.',
        '🥩 Choose fatty cuts of meat and fish for satiety.',
        '🥦 Non-starchy vegetables keep you in ketosis while providing nutrients.',
        '⚠️ Track net carbs (total carbs minus fiber).',
        '💧 Stay hydrated and consider electrolyte supplementation.'
      ],
      'paleo': [
        '🍖 Focus on grass-fed meats, wild-caught fish, and organic produce.',
        '🍯 Natural sweeteners like honey in moderation.',
        '🌾 Avoid grains, legumes, dairy, and processed foods.',
        '🌱 Emphasize nutrient density with organ meats and bone broth.',
        '🥥 Healthy fats from coconut, avocado, and olive oil.'
      ]
    };
    
    const dietTips = tips[dietaryPreference.toLowerCase()] || [
      '🥗 Eat a balanced diet with plenty of fruits and vegetables.',
      '💧 Stay hydrated throughout the day.',
      '🍽️ Practice portion control for optimal nutrition.',
      '🏃‍♀️ Combine proper nutrition with regular exercise.',
      '😴 Get adequate sleep for proper metabolism.'
    ];
    
    return dietTips[Math.floor(Math.random() * dietTips.length)];
  }

  async fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });
    });
  }

  formatRecipe(recipe) {
    let response = `🍳 *${recipe.name}*
    
📝 Category: ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'}
🌍 Cuisine: ${recipe.cuisine?.charAt(0).toUpperCase() + recipe.cuisine?.slice(1) || 'N/A'}
⏱️ Prep Time: ${recipe.prepTime || 'N/A'} mins
🍳 Cook Time: ${recipe.cookTime || 'N/A'} mins
⏱️ Total Time: ${recipe.totalTime || 'N/A'} mins
👥 Servings: ${recipe.servings || 'N/A'}
⭐ Difficulty: ${recipe.difficulty?.charAt(0).toUpperCase() + recipe.difficulty?.slice(1) || 'N/A'}

`;
    
    if (recipe.description) {
      response += `📝 Description:
${recipe.description}

`;
    }
    
    response += `🛒 *Ingredients:*
`;
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach((ingredient, index) => {
        response += `${index + 1}. ${ingredient.amount || ''} ${ingredient.unit || ''} ${ingredient.name || ingredient}\n`;
      });
    } else {
      response += 'Ingredients not available\n';
    }
    
    response += `\n👨‍🍳 *Instructions:*
`;
    
    if (recipe.instructions && recipe.instructions.length > 0) {
      recipe.instructions.forEach((step, index) => {
        response += `${index + 1}. ${step}\n`;
      });
    } else {
      response += 'Instructions not available\n';
    }
    
    if (recipe.nutrition) {
      response += `\n📊 *Nutrition (per serving):*
🔥 Calories: ${recipe.nutrition.calories || 0}
🥩 Protein: ${recipe.nutrition.protein || 0}g
🍞 Carbs: ${recipe.nutrition.carbs || 0}g
🥑 Fat: ${recipe.nutrition.fat || 0}g
🌿 Fiber: ${recipe.nutrition.fiber || 0}g
`;
    }
    
    if (recipe.tags && recipe.tags.length > 0) {
      response += `\n🏷️ Tags: ${recipe.tags.join(', ')}`;
    }
    
    return response;
  }

  formatRecipeList(recipes) {
    if (recipes.length === 0) {
      return '🍳 No recipes found.';
    }
    
    let response = `🍳 *Recipe Search Results* (${recipes.length})\n\n`;
    
    recipes.slice(0, 10).forEach((recipe, index) => {
      response += `${index + 1}. ${recipe.name}
⏱️ ${recipe.totalTime || 'N/A'} mins | 👥 ${recipe.servings || 'N/A'} servings
🔥 ${recipe.calories ? `${recipe.calories} cal` : 'Calories N/A'}
📝 ${recipe.category?.charAt(0).toUpperCase() + recipe.category?.slice(1) || 'N/A'} | 🌍 ${recipe.cuisine?.charAt(0).toUpperCase() + recipe.cuisine?.slice(1) || 'N/A'}\n\n`;
    });
    
    if (recipes.length > 10) {
      response += `... and ${recipes.length - 10} more recipes`;
    }
    
    return response;
  }

  formatMealPlan(plan) {
    let response = `📅 *Your Meal Plan* (${plan.startDate} to ${plan.endDate})\n\n`;
    
    // Group items by date
    const groupedItems = {};
    plan.items.forEach(item => {
      if (!groupedItems[item.date]) {
        groupedItems[item.date] = [];
      }
      groupedItems[item.date].push(item);
    });
    
    Object.keys(groupedItems).forEach(date => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      response += `🗓️ *${dayName}, ${dateStr}*\n`;
      
      groupedItems[date].forEach(item => {
        const mealIcons = {
          'breakfast': '🌅',
          'lunch': '☀️',
          'dinner': '🌙',
          'snack': '🍪'
        };
        
        response += `${mealIcons[item.type] || '🍽️'} ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}: ${item.recipeName}\n`;
      });
      
      response += '\n';
    });
    
    return response;
  }

  formatShoppingList(shoppingList) {
    let response = `🛒 *Shopping List* (${shoppingList.items.length} items)\n\n`;
    
    shoppingList.items.forEach((item, index) => {
      response += `${index + 1}. ${item.amount || ''} ${item.unit || ''} ${item.name}\n`;
      
      if (item.recipes && item.recipes.length > 0) {
        response += `   📋 For: ${item.recipes.join(', ')}\n`;
      }
      
      response += '\n';
    });
    
    return response;
  }

  cleanupCache() {
    try {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if ((now - value.timestamp) > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
      Logger.info(`Cleaned up recipe cache, ${this.cache.size} items remaining`);
    } catch (error) {
      Logger.error(`Failed to cleanup recipe cache: ${error.message}`);
    }
  }
}

module.exports = new RecipeService();