import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(bodyParser.json({limit: '50mb'}));
  // app.useStaticAssets({
  //   root: path.resolve(__dirname + "../dist/public")
  // });
  await app.listen(3000);
}
bootstrap();
