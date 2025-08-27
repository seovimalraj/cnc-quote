import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext({} as any);
  await app.close();
}

bootstrap();
