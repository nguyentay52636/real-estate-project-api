// server/swagger/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

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
    path.join(__dirname, '../routes/*.js'),      
    path.join(__dirname, './*.js'),           
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Load custom styles and scripts for search and dark mode toggle
const customCss = fs.readFileSync(path.join(__dirname, 'swagger-custom.css'), 'utf8');
const customJs = fs.readFileSync(path.join(__dirname, 'swagger-custom.js'), 'utf8');

const swaggerUiOptions = {
  swaggerOptions: {
    filter: true, // Enable API Search/Filter bar
  },
  customCss: customCss,
  customJsStr: customJs,
};

module.exports = { swaggerSpec, swaggerUi, swaggerUiOptions };

