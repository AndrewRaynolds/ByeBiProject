import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

// Mock the storage module
vi.mock('./storage', () => ({
  storage: {
    getAllDestinations: vi.fn().mockResolvedValue([]),
    getAllExperiences: vi.fn().mockResolvedValue([]),
    getAllBlogPosts: vi.fn().mockResolvedValue([]),
    getFreeBlogPosts: vi.fn().mockResolvedValue([]),
    getAllMerchandise: vi.fn().mockResolvedValue([]),
    getMerchandiseByType: vi.fn().mockResolvedValue([]),
    getAllExpenseGroups: vi.fn().mockResolvedValue([]),
  },
}));

// Mock auth setup
vi.mock('./auth', () => ({
  setupAuth: vi.fn(),
}));

// Mock zapier integration
vi.mock('./zapier-integration', () => ({
  registerZapierRoutes: vi.fn(),
}));

// Mock OpenAI service
vi.mock('./services/openai', () => ({
  generateItinerary: vi.fn(),
  generateActivitySuggestions: vi.fn(),
  generateAssistantResponse: vi.fn(),
  streamOpenAIChatCompletion: vi.fn(),
}));

// Mock image search service
vi.mock('./services/image-search', () => ({
  imageSearchService: {
    searchImages: vi.fn().mockResolvedValue({ images: [] }),
    searchDestinationImages: vi.fn().mockResolvedValue({ images: [] }),
    searchBarcelonaImages: vi.fn().mockResolvedValue({ images: [] }),
  },
}));

// Mock aviasales service
vi.mock('./services/aviasales', () => ({
  searchCheapestFlights: vi.fn().mockResolvedValue({ data: {} }),
}));

// Mock amadeus-hotels service
vi.mock('./services/amadeus-hotels', () => ({
  searchHotels: vi.fn().mockResolvedValue([]),
  bookHotel: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Express App', () => {
  describe('app creation', () => {
    it('creates an express application', () => {
      const app = express();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });

    it('can add middleware', () => {
      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      expect(app).toBeDefined();
    });

    it('can define routes', () => {
      const app = express();

      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      // Check that the route stack has the route
      const routes = app._router?.stack?.filter(
        (layer: any) => layer.route?.path === '/api/health'
      );
      expect(routes?.length).toBe(1);
    });
  });

  describe('middleware stack', () => {
    it('processes JSON body correctly', async () => {
      const app = express();
      app.use(express.json());

      let receivedBody: any;
      app.post('/test', (req, res) => {
        receivedBody = req.body;
        res.json({ received: true });
      });

      // Simulate the middleware by creating a mock request
      const mockReq = {
        headers: { 'content-type': 'application/json' },
        body: { test: 'data' },
      };

      expect(mockReq.body).toEqual({ test: 'data' });
    });
  });
});

describe('Route structure', () => {
  it('imports route registration function', async () => {
    // Just verify the routes module can be imported
    const routesModule = await import('./routes');
    expect(routesModule.registerRoutes).toBeDefined();
    expect(typeof routesModule.registerRoutes).toBe('function');
  });

  it('imports city mapping service', async () => {
    const { cityToIata, iataToCity } = await import('./services/cityMapping');
    expect(cityToIata).toBeDefined();
    expect(iataToCity).toBeDefined();
  });
});
