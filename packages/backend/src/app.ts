import express from 'express';
import { ingredientsRouter } from './routes/ingredients';
import { recipesRouter } from './routes/recipes';
import { recipeStepsRouter } from './routes/recipeSteps';
import { stepRefsRouter } from './routes/stepRefs';
import { recipeProducesRouter } from './routes/recipeProduces';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/ingredients', ingredientsRouter);
app.use('/recipes', recipesRouter);
app.use('/recipe-steps', recipeStepsRouter);
app.use('/step-refs', stepRefsRouter);
app.use('/recipe-produces', recipeProducesRouter);
