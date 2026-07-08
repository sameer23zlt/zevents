// jest.setup.ts
// Global test setup for Zevents

// Extend Jest matchers with @testing-library/jest-dom
import "@testing-library/jest-dom";

// Suppress console.error / console.warn noise during tests unless explicitly needed.
// Individual tests can restore these if they need to assert on logs.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Allow React Testing Library / act() warnings through only in CI
    const msg = args[0]?.toString() ?? "";
    if (msg.includes("Warning:") || msg.includes("Error: Not implemented")) {
      return;
    }
    originalConsoleError(...args);
  };
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});
