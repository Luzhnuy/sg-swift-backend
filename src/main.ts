import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(bodyParser.json({limit: '50mb'}));
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use('//uploads', express.static(join(__dirname, '..', 'uploads')));
  app.use('///uploads', express.static(join(__dirname, '..', 'uploads')));
  await app.listen(3000);
}
bootstrap();
