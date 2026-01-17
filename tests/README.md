# Testing Infrastructure

This directory contains the testing infrastructure for Android Studio Lite extension.

## Test Structure

```
tests/
├── setup/              # Test setup and configuration
│   └── jest.setup.ts   # Jest global setup
├── helpers/            # Test helpers and utilities
│   └── mocks.ts        # Mock objects and factories
├── unit/               # Unit tests
│   ├── service/        # Service unit tests
│   └── utils/          # Utility unit tests
└── extension/          # VS Code extension tests
    └── extension.test.ts
```

## Running Tests

### Unit Tests (Jest)

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Run tests with coverage
npm run test:unit:coverage
```

### Extension Tests (VS Code Test)

```bash
# Run extension tests
npm run test:extension

# Run extension tests in watch mode
npm run test:extension:watch
```

### All Tests

```bash
# Run both unit and extension tests
npm test
```

## Writing Tests

### Unit Tests

Unit tests use Jest and should be placed in `tests/unit/` directory, mirroring the `src/` structure.

Example:
```typescript
import { MyService } from '../../../src/service/MyService';
import { createMockConfigService } from '../../helpers/mocks';

describe('MyService', () => {
    it('should do something', () => {
        const mockConfig = createMockConfigService();
        const service = new MyService(mockConfig);
        // Test implementation
    });
});
```

### Extension Tests

Extension tests run in the VS Code extension host environment and use the VS Code Test API.

Example:
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Tests', () => {
    test('Command should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('android-studio-lite.myCommand'));
    });
});
```

## Test Coverage

- **Unit Tests**: Test individual services, utilities, and components in isolation
- **Extension Tests**: Test VS Code integration, command registration, and extension activation

## Mocking

Use the mock helpers in `tests/helpers/mocks.ts` to create mock objects for:
- VS Code ExtensionContext
- ConfigService
- Output channels
- Cache

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (VS Code API, file system, network)
3. **Coverage**: Aim for high test coverage, especially for critical services
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Structure**: Follow AAA pattern (Arrange, Act, Assert)
