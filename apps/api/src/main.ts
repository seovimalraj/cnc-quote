import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Enable CORS with Render.com domains
  app.enableCors({
    origin: [
      'https://cnc-quote-web.onrender.com',
      'https://cnc-quote-api.onrender.com',
      'https://cnc-quote-cad.onrender.com',
      ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600,
  });

  // Global validation pipe with strict settings
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('CNC Quote API')
    .setDescription('API for CNC, Sheet Metal, and Injection Molding quoting platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
