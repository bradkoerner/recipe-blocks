import express from 'express';
import { ingredientsRouter } from './routes/ingredients';
import { recipesRouter } from './routes/recipes';
import { recipeIngredientsRouter } from './routes/recipeIngredients';
import { recipeProducesRouter } from './routes/recipeProduces';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/ingredients', ingredientsRouter);
app.use('/recipes', recipesRouter);
app.use('/recipe-ingredients', recipeIngredientsRouter);
app.use('/recipe-produces', recipeProducesRouter);
