import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register(),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getAll', () => {
    it('should return "Stability Platform API"', () => {
      const appController = app.get(AppController);
      expect(appController.getMainRepply()).toBeDefined();
    });
  });
});
