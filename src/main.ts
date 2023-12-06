import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config'

async function bootstrap() {
  const sslMustBe = !!process.env.SSL_KEY && !!process.env.SSL_CERT

  const options = sslMustBe ? {
    httpsOptions: {
      key: readFileSync(process.env.SSL_KEY),
      cert: readFileSync(process.env.SSL_CERT),
    },
  } : {};
  
  const app = await NestFactory.create(AppModule, options);
  app.enableCors({
    origin: ["https://stabilitydao.org", "https://alpha.stabilitydao.org", "http://localhost:4321"],
  });
  await app.listen(sslMustBe ? 443 : 3000);
}
bootstrap();
