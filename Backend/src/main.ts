import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo común para toda la API.
  app.setGlobalPrefix('api');

  // Validación automática de los DTOs en todas las rutas.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Permitir que las apps web (chat y social) llamen a la API.
  app.enableCors({ origin: true, credentials: true });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
