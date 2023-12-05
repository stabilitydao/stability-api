import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    HttpModule,
    CacheModule.register(),
    ConfigModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}
