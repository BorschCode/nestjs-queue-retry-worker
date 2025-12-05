import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return home page data', () => {
      const result = appController.getHomePage();
      expect(result).toBeDefined();
      expect(result.title).toBe('Message Queue Processing Service');
      expect(result.links).toBeDefined();
      expect(result.links.length).toBeGreaterThan(0);
      expect(result.features).toBeDefined();
      expect(result.features.length).toBe(6);
      expect(result.endpoints).toBeDefined();
      expect(result.endpoints.length).toBeGreaterThan(0);
    });

    it('should include API documentation link', () => {
      const result = appController.getHomePage();
      const apiDocsLink = result.links.find(
        (link) => link.title === 'API Documentation',
      );
      expect(apiDocsLink).toBeDefined();
      expect(apiDocsLink.url).toBe('/api/docs');
    });
  });
});
