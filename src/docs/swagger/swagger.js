// server/swagger/swagger.js
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

import { getDirname } from '#shared/utils/esm.js';
const dirname = getDirname(import.meta.url);

const options = {
  definition: {
    openapi: '3.0.4',
    info: {
      title: 'Real Estate API Docs',
      version: '1.0.12',
      description: 'Documentation for Bất Động Sản Project',
    },
    servers: [
      { url: 'http://localhost:8000' },
    ],
  },
  apis: [
    path.join(dirname, '../../modules/**/*.routes.js'),
    path.join(dirname, './*.js'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Load custom styles and scripts for search and dark mode toggle
const customCss = fs.readFileSync(path.join(dirname, 'swagger-custom.css'), 'utf8');
const customJs = fs.readFileSync(path.join(dirname, 'swagger-custom.js'), 'utf8');

const swaggerUiOptions = {
  swaggerOptions: {
    filter: true, // Enable API Search/Filter bar
  },
  customCss: customCss,
  customJsStr: customJs,
};

export { swaggerSpec, swaggerUi, swaggerUiOptions };
export default { swaggerSpec, swaggerUi, swaggerUiOptions };