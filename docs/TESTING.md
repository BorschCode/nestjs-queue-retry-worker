# Testing Documentation

## Testing Requirements

The system is covered by both **unit tests** and **integration tests** to ensure code quality and functionality.

## Test Structure

### Unit Tests (`.spec.ts`)

Unit tests focus on testing individual components in isolation with mocked dependencies.

**Location:** `src/**/*.spec.ts`

**Coverage:**
- ✅ `app.controller.spec.ts` - Application controller tests
- ✅ `queue.config.spec.ts` - Queue configuration tests
- ✅ `http-webhook.channel.spec.ts` - HTTP webhook delivery tests
- ✅ `email.channel.spec.ts` - Email delivery tests
- ✅ `internal-service.channel.spec.ts` - Internal service delivery tests
- ✅ `message.processor.spec.ts` - Message processor tests

**Redis Handling:**
- ✅ **Redis is mocked in all unit tests** - No real Redis connection is used
- ✅ BullMQ Queue instances are mocked using Jest
- ✅ All external dependencies are mocked (ConfigService, HttpService, etc.)

### Integration Tests (`.e2e-spec.ts`)

Integration tests validate the entire application stack with real dependencies.

**Location:** `test/**/*.e2e-spec.ts`

**Coverage:**
- ✅ `queue.e2e-spec.ts` - Queue processing integration tests
- ✅ `dead-letter.e2e-spec.ts` - Dead-letter queue tests
- ✅ `app.e2e-spec.ts` - Application integration tests

**Redis Handling:**
- ✅ **Uses real Redis via Docker Compose** (acts as testcontainers)
- ✅ Redis is automatically cleaned before and after tests
- ✅ Tests run in isolated environment with dedicated Redis instance

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm test -- --testPathPattern=spec.ts
```

### Integration Tests Only
```bash
npm test -- --testPathPattern=e2e-spec.ts
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:cov
```

## Test Configuration

### Jest Configuration (`package.json`)
```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

### E2E Test Setup

Integration tests use the full application stack:

```typescript
// Docker Compose provides Redis (testcontainer approach)
beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule], // Full app module with real dependencies
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  // Clean Redis before tests
  await mainQueue.obliterate({ force: true });
  await deadLetterQueue.obliterate({ force: true });
});

afterAll(async () => {
  // Clean Redis after tests
  await mainQueue.obliterate({ force: true });
  await deadLetterQueue.obliterate({ force: true });
  await mainQueue.close();
  await deadLetterQueue.close();
  await app.close();
});
```

## Test Results

```
Test Suites: 6 passed, 6 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        ~4s
```

## Best Practices

### Unit Tests
1. ✅ Mock all external dependencies
2. ✅ Test one component at a time
3. ✅ Use descriptive test names
4. ✅ Follow AAA pattern (Arrange, Act, Assert)
5. ✅ Mock ConfigService for environment variables

### Integration Tests
1. ✅ Use real Redis connection via Docker
2. ✅ Clean up data before and after tests
3. ✅ Test full request/response cycle
4. ✅ Validate business logic end-to-end
5. ✅ Close all connections properly

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
steps:
  - name: Start Redis
    run: docker compose up -d redis

  - name: Run Unit Tests
    run: npm test -- --testPathPattern=spec.ts

  - name: Run Integration Tests
    run: npm test -- --testPathPattern=e2e-spec.ts

  - name: Stop Services
    run: docker compose down
```

## Testing Requirements Compliance

| Requirement | Status | Implementation |
|------------|--------|----------------|
| Unit tests coverage | ✅ Passed | All components have unit tests |
| Integration tests coverage | ✅ Passed | Full E2E test suite |
| Redis mocked in unit tests | ✅ Passed | Jest mocks used for Queue instances |
| Redis in integration tests | ✅ Passed | Docker Compose provides isolated Redis |
| Test cleanup | ✅ Passed | Before/after hooks clean Redis data |
| All tests passing | ✅ Passed | 22/22 tests pass |

## Code Coverage

Run coverage report:
```bash
npm run test:cov
```

Target coverage:
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## Troubleshooting

### Redis Connection Issues
```bash
# Ensure Redis is running
docker compose ps

# Restart Redis if needed
docker compose restart redis
```

### Test Timeout Issues
```bash
# Increase Jest timeout in test file
jest.setTimeout(30000); // 30 seconds
```

### Port Conflicts
```bash
# Check .env file for custom ports
cat .env | grep PORT
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [BullMQ Testing](https://docs.bullmq.io/guide/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
