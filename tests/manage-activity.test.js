/**
 * Tests for manage-activity.js Netlify Function
 * CRUD operations for custom activities within a trip
 */

// Mock external dependencies before requiring the handler
const mockUploadActivityFile = jest.fn();
const mockDeleteActivityFile = jest.fn();
const mockGetActivityFileSignedUrl = jest.fn();

const mockSupabaseFrom = jest.fn();
const mockAuthenticateRequest = jest.fn();

jest.mock('../netlify/functions/utils/auth', () => ({
  authenticateRequest: (...args) => mockAuthenticateRequest(...args),
  unauthorizedResponse: () => ({
    statusCode: 401,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: false, error: 'Unauthorized' })
  }),
  getCorsHeaders: () => ({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }),
  handleOptions: () => ({ statusCode: 200, headers: {}, body: '' })
}));

jest.mock('../netlify/functions/utils/storage', () => ({
  uploadActivityFile: (...args) => mockUploadActivityFile(...args),
  deleteActivityFile: (...args) => mockDeleteActivityFile(...args),
  getActivityFileSignedUrl: (...args) => mockGetActivityFileSignedUrl(...args)
}));

const { handler } = require('../netlify/functions/manage-activity');

// Helper to create a mock event
function makeEvent(body, method = 'POST', authorized = true) {
  if (authorized) {
    mockAuthenticateRequest.mockResolvedValue({
      user: { id: 'user-1' },
      supabase: { from: mockSupabaseFrom }
    });
  } else {
    mockAuthenticateRequest.mockResolvedValue(null);
  }

  return {
    httpMethod: method,
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body)
  };
}

// Helper for Supabase chain: from().select().eq().single()
function mockSupabaseSelect(tripData, error = null) {
  mockSupabaseFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: tripData ? { id: 'trip-1', data: tripData } : null,
          error
        })
      })
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null })
    })
  });
}

// Helper that supports both select and update on the same mock
function mockSupabaseSelectAndUpdate(tripData, updateError = null) {
  const selectChain = {
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'trip-1', data: tripData },
        error: null
      })
    })
  };
  const updateChain = {
    eq: jest.fn().mockResolvedValue({ error: updateError })
  };

  mockSupabaseFrom.mockImplementation(() => ({
    select: jest.fn().mockReturnValue(selectChain),
    update: jest.fn().mockReturnValue(updateChain)
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadActivityFile.mockResolvedValue('trip-1/activity-123-0.pdf');
  mockDeleteActivityFile.mockResolvedValue();
  mockGetActivityFileSignedUrl.mockResolvedValue('https://example.com/signed-url');
});

// ============ TESTS ============

describe('manage-activity handler', () => {

  describe('HTTP method handling', () => {
    test('returns 200 for OPTIONS (CORS preflight)', async () => {
      const event = { httpMethod: 'OPTIONS', headers: {}, body: '{}' };
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
    });

    test('returns 405 for GET', async () => {
      const event = makeEvent({}, 'GET');
      const res = await handler(event, {});
      expect(res.statusCode).toBe(405);
    });

    test('returns 401 for unauthenticated request', async () => {
      const event = makeEvent({ action: 'create' }, 'POST', false);
      const res = await handler(event, {});
      expect(res.statusCode).toBe(401);
    });
  });

  describe('action validation', () => {
    test('returns 400 when action is missing', async () => {
      mockSupabaseSelect({ activities: [] });
      const event = makeEvent({ tripId: 'trip-1' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('action is required');
    });

    test('returns 400 for invalid action', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });
      const event = makeEvent({ action: 'invalid', tripId: 'trip-1' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Invalid action');
    });
  });

  describe('create action', () => {
    test('creates activity with valid name and date', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Visit museum', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.tripData.activities).toHaveLength(1);
      expect(body.tripData.activities[0].name).toBe('Visit museum');
      expect(body.tripData.activities[0].date).toBe('2026-06-15');
      expect(body.tripData.activities[0].id).toMatch(/^activity-/);
    });

    test('trims whitespace from name and description', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: '  Visit museum  ', description: '  Art gallery  ', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      const body = JSON.parse(res.body);
      expect(body.tripData.activities[0].name).toBe('Visit museum');
      expect(body.tripData.activities[0].description).toBe('Art gallery');
    });

    test('rejects when name is missing', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('name and date are required');
    });

    test('rejects when date is missing', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Visit museum' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('name and date are required');
    });

    test('rejects name longer than 100 characters', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'A'.repeat(101), date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Name must be 100 characters or less');
    });

    test('accepts name exactly 100 characters', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'A'.repeat(100), date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
    });

    test('generates unique activity ID', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      const body = JSON.parse(res.body);
      expect(body.tripData.activities[0].id).toMatch(/^activity-\d+$/);
    });

    test('sets optional fields with defaults', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      const activity = JSON.parse(res.body).tripData.activities[0];
      expect(activity.description).toBe('');
      expect(activity.startTime).toBeNull();
      expect(activity.endTime).toBeNull();
      expect(activity.urls).toEqual([]);
      expect(activity.attachments).toEqual([]);
    });

    test('filters empty URLs', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15', urls: ['https://example.com', '', '  ', 'https://other.com'] }
      });

      const res = await handler(event, {});
      const activity = JSON.parse(res.body).tripData.activities[0];
      expect(activity.urls).toEqual(['https://example.com', 'https://other.com']);
    });

    test('creates activity with attachments', async () => {
      const tripData = { activities: [] };
      mockSupabaseSelectAndUpdate(tripData);
      mockUploadActivityFile.mockResolvedValue('trip-1/activity-123-0.pdf');

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' },
        attachments: [{ name: 'doc.pdf', type: 'application/pdf', data: 'base64data' }]
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      const activity = JSON.parse(res.body).tripData.activities[0];
      expect(activity.attachments).toHaveLength(1);
      expect(activity.attachments[0].name).toBe('doc.pdf');
      expect(mockUploadActivityFile).toHaveBeenCalledTimes(1);
    });

    test('rejects more than 5 attachments', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const attachments = Array.from({ length: 6 }, (_, i) => ({
        name: `file-${i}.pdf`, type: 'application/pdf', data: 'data'
      }));

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' },
        attachments
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('Maximum 5 files');
    });

    test('rejects unsupported file type', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' },
        attachments: [{ name: 'file.zip', type: 'application/zip', data: 'data' }]
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('Unsupported file type');
    });

    test('rejects file exceeding 10MB', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      // Create data that would decode to >10MB (base64 is ~33% larger)
      const largeData = 'A'.repeat(14 * 1024 * 1024); // ~10.5MB when decoded

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' },
        attachments: [{ name: 'big.pdf', type: 'application/pdf', data: largeData }]
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('exceeds 10MB');
    });
  });

  describe('update action', () => {
    test('updates activity name', async () => {
      const tripData = {
        activities: [{
          id: 'activity-1', name: 'Old name', description: 'desc',
          date: '2026-06-15', startTime: null, endTime: null, urls: [], attachments: []
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'activity-1',
        activity: { name: 'New name' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).tripData.activities[0].name).toBe('New name');
    });

    test('rejects empty name on update', async () => {
      const tripData = {
        activities: [{ id: 'activity-1', name: 'Old', date: '2026-06-15', attachments: [] }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'activity-1',
        activity: { name: '' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('Name cannot be empty');
    });

    test('rejects name over 100 chars on update', async () => {
      const tripData = {
        activities: [{ id: 'activity-1', name: 'Old', date: '2026-06-15', attachments: [] }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'activity-1',
        activity: { name: 'A'.repeat(101) }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
    });

    test('returns 404 when activity not found', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'nonexistent',
        activity: { name: 'New' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
    });

    test('requires activityId for update', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activity: { name: 'New' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('activityId is required');
    });

    test('removes attachments during update', async () => {
      const tripData = {
        activities: [{
          id: 'activity-1', name: 'Test', date: '2026-06-15',
          attachments: [
            { name: 'file1.pdf', path: 'trip-1/activity-1-0.pdf', type: 'application/pdf' },
            { name: 'file2.pdf', path: 'trip-1/activity-1-1.pdf', type: 'application/pdf' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'activity-1',
        removedAttachments: ['trip-1/activity-1-0.pdf']
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(mockDeleteActivityFile).toHaveBeenCalledWith('trip-1/activity-1-0.pdf');
      expect(JSON.parse(res.body).tripData.activities[0].attachments).toHaveLength(1);
    });

    test('rejects when total attachments would exceed max', async () => {
      const tripData = {
        activities: [{
          id: 'activity-1', name: 'Test', date: '2026-06-15',
          attachments: [
            { name: 'f1.pdf', path: 'p1', type: 'application/pdf' },
            { name: 'f2.pdf', path: 'p2', type: 'application/pdf' },
            { name: 'f3.pdf', path: 'p3', type: 'application/pdf' },
            { name: 'f4.pdf', path: 'p4', type: 'application/pdf' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'update',
        tripId: 'trip-1',
        activityId: 'activity-1',
        attachments: [
          { name: 'new1.pdf', type: 'application/pdf', data: 'data' },
          { name: 'new2.pdf', type: 'application/pdf', data: 'data' }
        ]
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('Maximum 5 files');
    });
  });

  describe('delete action', () => {
    test('deletes activity and its attachments', async () => {
      const tripData = {
        activities: [{
          id: 'activity-1', name: 'Test', date: '2026-06-15',
          attachments: [
            { name: 'f1.pdf', path: 'trip-1/activity-1-0.pdf' },
            { name: 'f2.jpg', path: 'trip-1/activity-1-1.jpg' }
          ]
        }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'delete',
        tripId: 'trip-1',
        activityId: 'activity-1'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).tripData.activities).toHaveLength(0);
      expect(mockDeleteActivityFile).toHaveBeenCalledTimes(2);
      expect(mockDeleteActivityFile).toHaveBeenCalledWith('trip-1/activity-1-0.pdf');
      expect(mockDeleteActivityFile).toHaveBeenCalledWith('trip-1/activity-1-1.jpg');
    });

    test('deletes activity without attachments', async () => {
      const tripData = {
        activities: [{ id: 'activity-1', name: 'Test', date: '2026-06-15' }]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'delete',
        tripId: 'trip-1',
        activityId: 'activity-1'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).tripData.activities).toHaveLength(0);
      expect(mockDeleteActivityFile).not.toHaveBeenCalled();
    });

    test('returns 404 when activity not found for deletion', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'delete',
        tripId: 'trip-1',
        activityId: 'nonexistent'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
    });

    test('requires activityId for delete', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });

      const event = makeEvent({
        action: 'delete',
        tripId: 'trip-1'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('activityId is required');
    });

    test('only removes the targeted activity, leaving others intact', async () => {
      const tripData = {
        activities: [
          { id: 'activity-1', name: 'Keep me', date: '2026-06-15' },
          { id: 'activity-2', name: 'Delete me', date: '2026-06-16' },
          { id: 'activity-3', name: 'Keep me too', date: '2026-06-17' }
        ]
      };
      mockSupabaseSelectAndUpdate(tripData);

      const event = makeEvent({
        action: 'delete',
        tripId: 'trip-1',
        activityId: 'activity-2'
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      const remaining = JSON.parse(res.body).tripData.activities;
      expect(remaining).toHaveLength(2);
      expect(remaining[0].id).toBe('activity-1');
      expect(remaining[1].id).toBe('activity-3');
    });
  });

  describe('get-url action', () => {
    test('returns signed URL for file path', async () => {
      const event = makeEvent({ action: 'get-url', filePath: 'trip-1/activity-1-0.pdf' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).url).toBe('https://example.com/signed-url');
      expect(mockGetActivityFileSignedUrl).toHaveBeenCalledWith('trip-1/activity-1-0.pdf');
    });

    test('returns 400 when filePath is missing', async () => {
      const event = makeEvent({ action: 'get-url' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('filePath is required');
    });

    test('returns 500 when signed URL generation fails', async () => {
      mockGetActivityFileSignedUrl.mockRejectedValue(new Error('Storage error'));
      const event = makeEvent({ action: 'get-url', filePath: 'bad/path' });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(500);
    });
  });

  describe('trip validation', () => {
    test('returns 400 when tripId is missing (non get-url actions)', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] });
      const event = makeEvent({ action: 'create', activity: { name: 'Test', date: '2026-06-15' } });
      const res = await handler(event, {});
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe('tripId is required');
    });

    test('returns 404 when trip not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } })
          })
        })
      });

      const event = makeEvent({
        action: 'create',
        tripId: 'nonexistent',
        activity: { name: 'Test', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(404);
    });

    test('returns 500 when Supabase update fails', async () => {
      mockSupabaseSelectAndUpdate({ activities: [] }, { message: 'DB error' });

      const event = makeEvent({
        action: 'create',
        tripId: 'trip-1',
        activity: { name: 'Test', date: '2026-06-15' }
      });

      const res = await handler(event, {});
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error).toBe('Failed to save trip');
    });
  });
});
