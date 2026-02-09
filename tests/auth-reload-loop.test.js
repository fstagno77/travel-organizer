/**
 * Tests for auth.js onAuthStateChange behavior
 * Verifies that SIGNED_IN event doesn't cause infinite reload
 * when a session already exists at init time.
 */

// Track onAuthStateChange callback
let authStateCallback = null;

// Mock Supabase client
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn((cb) => {
  authStateCallback = cb;
  return { data: { subscription: { unsubscribe: jest.fn() } } };
});

const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    onAuthStateChange: mockOnAuthStateChange,
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({
          data: { id: 'user-1', username: 'testuser', email: 'test@test.com' },
          error: null,
        })),
      })),
    })),
  })),
};

// Mock globals
global.supabase = { createClient: jest.fn(() => mockSupabaseClient) };
global.window = {
  location: { search: '', pathname: '/', origin: 'http://localhost', href: '' },
  history: { replaceState: jest.fn() },
  addEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};
global.document = {
  querySelector: jest.fn(),
  getElementById: jest.fn(),
  addEventListener: jest.fn(),
  body: { insertAdjacentHTML: jest.fn(), classList: { add: jest.fn(), remove: jest.fn() } },
};
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
global.i18n = { getLang: jest.fn(() => 'it') };

// Load auth module by reading the source and evaluating it
const fs = require('fs');
const path = require('path');

function loadAuth() {
  const authSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'auth.js'),
    'utf-8'
  );
  // Reset auth state
  const authObj = {};
  eval(authSource);
  return global.auth || window.auth;
}

describe('auth onAuthStateChange - reload loop prevention', () => {
  let authModule;

  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;

    // Reset window.location
    global.window.location = {
      search: '',
      pathname: '/',
      origin: 'http://localhost',
      href: '',
      reload: jest.fn(),
    };
  });

  test('should NOT call handlePostLogin when session already exists at init', async () => {
    // Session exists - user is already logged in
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
          access_token: 'token-123',
        },
      },
      error: null,
    });

    authModule = loadAuth();
    const handlePostLoginSpy = jest.spyOn(authModule, 'handlePostLogin');

    await authModule.init();

    // Verify onAuthStateChange was registered
    expect(authStateCallback).toBeDefined();

    // Simulate Supabase firing SIGNED_IN (as it does on every page load with existing session)
    await authStateCallback('SIGNED_IN', {
      user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
      access_token: 'token-123',
    });

    // handlePostLogin should NOT be called - the session existed at init time
    expect(handlePostLoginSpy).not.toHaveBeenCalled();
    // window.location.reload should NOT be called
    expect(global.window.location.reload).not.toHaveBeenCalled();
  });

  test('should call handlePostLogin when no session existed at init (fresh login)', async () => {
    // No session - user is not logged in
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    authModule = loadAuth();
    const handlePostLoginSpy = jest.spyOn(authModule, 'handlePostLogin');

    await authModule.init();

    expect(authStateCallback).toBeDefined();

    // Simulate Supabase firing SIGNED_IN after a fresh login
    await authStateCallback('SIGNED_IN', {
      user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
      access_token: 'token-123',
    });

    // handlePostLogin SHOULD be called for fresh sign-ins
    expect(handlePostLoginSpy).toHaveBeenCalled();
  });

  test('should handle SIGNED_OUT regardless of initial session state', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@test.com', user_metadata: {} },
          access_token: 'token-123',
        },
      },
      error: null,
    });

    authModule = loadAuth();
    await authModule.init();

    expect(authStateCallback).toBeDefined();

    // Simulate SIGNED_OUT
    await authStateCallback('SIGNED_OUT', null);

    // Profile should be cleared
    expect(authModule.profile).toBeNull();
    expect(authModule.needsUsername).toBe(false);
    // Should redirect to /
    expect(global.window.location.href).toBe('/');
  });
});
