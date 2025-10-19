/**
 * OpenAPI Spec Generation Script
 *
 * Generates OpenAPI specification JSON file from the NestJS application
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../app.module';
import { SWAGGER_CONFIG } from '../config/swagger.config';

async function generateOpenApiSpec() {
  console.log('🔨 Generating OpenAPI specification...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
  });

  const config = new DocumentBuilder()
    .setTitle(SWAGGER_CONFIG.title)
    .setDescription(SWAGGER_CONFIG.description)
    .setVersion(SWAGGER_CONFIG.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'bearerAuth',
    )
    .addCookieAuth(
      'ssell_session',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'ssell_session',
        description: 'Session cookie for authenticated requests',
      },
      'cookieAuth',
    );

  // Add servers
  SWAGGER_CONFIG.servers.forEach((server) => {
    config.addServer(server.url, server.description);
  });

  // Add tags
  SWAGGER_CONFIG.tags.forEach((tag) => {
    config.addTag(tag.name, tag.description, tag.externalDocs);
  });

  const document = SwaggerModule.createDocument(app, config.build());

  // Export as JSON
  const outputPath = path.join(process.cwd(), 'openapi-spec.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI spec generated: ${outputPath}`);

  // Export as YAML (optional)
  try {
    const yaml = require('js-yaml');
    const yamlOutputPath = path.join(process.cwd(), 'openapi-spec.yaml');
    fs.writeFileSync(yamlOutputPath, yaml.dump(document));
    console.log(`✅ OpenAPI spec (YAML) generated: ${yamlOutputPath}`);
  } catch (error) {
    console.log('⚠️  YAML export skipped (install js-yaml for YAML output)');
  }

  await app.close();
  process.exit(0);
}

generateOpenApiSpec().catch((error) => {
  console.error('❌ Failed to generate OpenAPI spec:', error);
  process.exit(1);
});
