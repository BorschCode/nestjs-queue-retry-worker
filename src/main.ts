import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Queue Retry Worker API')
    .setDescription('API for managing message queues with retry logic and dead letter handling')
    .setVersion('1.0')
    .addTag('queue', 'Queue operations')
    .addTag('admin', 'Admin and monitoring operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
