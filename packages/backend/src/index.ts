import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { app } from './app';

const PORT = process.env.PORT ?? 3000;

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch(console.error);
