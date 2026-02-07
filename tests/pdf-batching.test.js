/**
 * Tests for PDF batching logic in pdfProcessor.js
 * Tests the shared utility functions without making actual API calls.
 */

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }));
});

const {
  processPdfsWithClaude,
  detectDocumentType,
  getPromptForDocType,
  extractPassengerFromFilename
} = require('../netlify/functions/utils/pdfProcessor');

beforeEach(() => {
  mockCreate.mockReset();
});

describe('detectDocumentType', () => {
  test('detects flight documents from filename keywords', () => {
    expect(detectDocumentType('boarding_pass.pdf')).toBe('flight');
    expect(detectDocumentType('flight_itinerary.pdf')).toBe('flight');
    expect(detectDocumentType('Le ricevute di viaggio.pdf')).toBe('flight');
    expect(detectDocumentType('eticket_123.pdf')).toBe('flight');
    expect(detectDocumentType('biglietto_aereo.pdf')).toBe('flight');
    expect(detectDocumentType('airways_confirmation.pdf')).toBe('flight');
  });

  test('detects hotel documents from filename keywords', () => {
    expect(detectDocumentType('hotel_booking.pdf')).toBe('hotel');
    expect(detectDocumentType('reservation_details.pdf')).toBe('hotel');
    expect(detectDocumentType('conferma_prenotazione.pdf')).toBe('hotel');
    expect(detectDocumentType('accommodation_receipt.pdf')).toBe('hotel');
    expect(detectDocumentType('soggiorno_tokyo.pdf')).toBe('hotel');
  });

  test('returns unknown for unrecognized filenames', () => {
    expect(detectDocumentType('document.pdf')).toBe('unknown');
    expect(detectDocumentType('receipt.pdf')).toBe('unknown');
    expect(detectDocumentType('')).toBe('unknown');
  });

  test('handles null/undefined filename', () => {
    expect(detectDocumentType(null)).toBe('unknown');
    expect(detectDocumentType(undefined)).toBe('unknown');
  });

  test('is case insensitive', () => {
    expect(detectDocumentType('BOARDING_PASS.PDF')).toBe('flight');
    expect(detectDocumentType('Hotel_Booking.pdf')).toBe('hotel');
  });
});

describe('getPromptForDocType', () => {
  test('returns flight prompt with mandatory passenger field', () => {
    const prompt = getPromptForDocType('flight');
    expect(prompt).toContain('passenger');
    expect(prompt).toContain('MANDATORY');
    expect(prompt).toContain('flightNumber');
    expect(prompt).toContain('ticketNumber');
  });

  test('returns hotel prompt with all required fields', () => {
    const prompt = getPromptForDocType('hotel');
    expect(prompt).toContain('confirmationNumber');
    expect(prompt).toContain('checkIn');
    expect(prompt).toContain('checkOut');
    expect(prompt).toContain('pinCode');
    expect(prompt).toContain('breakfast');
  });

  test('returns generic prompt for unknown type', () => {
    const prompt = getPromptForDocType('unknown');
    expect(prompt).toContain('flights');
    expect(prompt).toContain('hotels');
  });
});

describe('extractPassengerFromFilename', () => {
  test('extracts name from "per NAME del" pattern', () => {
    expect(extractPassengerFromFilename('Le ricevute elettroniche di viaggio per AGATA BRIGNONE del 15JUN.pdf'))
      .toBe('Agata Brignone');
  });

  test('extracts name from "for NAME" pattern', () => {
    // The regex matches uppercase sequences after "for", so lowercase words stop the match
    expect(extractPassengerFromFilename('receipt for JOHN DOE travel.pdf'))
      .toBe('John Doe');
  });

  test('returns null for filenames without passenger name', () => {
    expect(extractPassengerFromFilename('hotel_booking.pdf')).toBeNull();
    expect(extractPassengerFromFilename('document.pdf')).toBeNull();
  });

  test('handles null/undefined', () => {
    expect(extractPassengerFromFilename(null)).toBeNull();
    expect(extractPassengerFromFilename(undefined)).toBeNull();
  });
});

describe('processPdfsWithClaude', () => {
  test('single PDF uses individual call', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ text: JSON.stringify({ flights: [{ flightNumber: 'AB123' }], passenger: { name: 'Test' } }) }],
      stop_reason: 'end_turn'
    });

    const pdfs = [{ content: 'base64data', filename: 'boarding_pass.pdf' }];
    const results = await processPdfsWithClaude(pdfs);

    expect(results).toHaveLength(1);
    expect(results[0].result.flights[0].flightNumber).toBe('AB123');
    expect(results[0].pdfIndex).toBe(0);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('two PDFs use a single batched call', async () => {
    const batchResponse = {
      documents: [
        { index: 0, flights: [{ flightNumber: 'AB123' }], passenger: { name: 'Alice' } },
        { index: 1, hotels: [{ name: 'Tokyo Hotel' }] }
      ]
    };

    mockCreate.mockResolvedValueOnce({
      content: [{ text: JSON.stringify(batchResponse) }],
      stop_reason: 'end_turn'
    });

    const pdfs = [
      { content: 'base64data1', filename: 'boarding_pass.pdf' },
      { content: 'base64data2', filename: 'hotel_booking.pdf' }
    ];
    const results = await processPdfsWithClaude(pdfs);

    expect(results).toHaveLength(2);
    expect(results[0].pdfIndex).toBe(0);
    expect(results[0].result.flights[0].flightNumber).toBe('AB123');
    expect(results[1].pdfIndex).toBe(1);
    expect(results[1].result.hotels[0].name).toBe('Tokyo Hotel');
    // Should be 1 batched call, not 2 individual calls
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('three PDFs split into two batches (2 + 1)', async () => {
    const batch1Response = {
      documents: [
        { index: 0, hotels: [{ name: 'Hotel A' }] },
        { index: 1, hotels: [{ name: 'Hotel B' }] }
      ]
    };
    const singleResponse = { hotels: [{ name: 'Hotel C' }] };

    mockCreate
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify(batch1Response) }],
        stop_reason: 'end_turn'
      })
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify(singleResponse) }],
        stop_reason: 'end_turn'
      });

    const pdfs = [
      { content: 'data1', filename: 'hotel_1.pdf' },
      { content: 'data2', filename: 'hotel_2.pdf' },
      { content: 'data3', filename: 'hotel_3.pdf' }
    ];
    const results = await processPdfsWithClaude(pdfs);

    expect(results).toHaveLength(3);
    expect(results[0].pdfIndex).toBe(0);
    expect(results[1].pdfIndex).toBe(1);
    expect(results[2].pdfIndex).toBe(2);
    // 2 API calls: 1 batch of 2 + 1 individual
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  test('falls back to individual calls when batch fails', async () => {
    // First call (batch) fails
    mockCreate.mockRejectedValueOnce(new Error('Some API error'));
    // Fallback individual calls succeed
    mockCreate
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify({ flights: [{ flightNumber: 'AB1' }] }) }],
        stop_reason: 'end_turn'
      })
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify({ hotels: [{ name: 'Hotel' }] }) }],
        stop_reason: 'end_turn'
      });

    const pdfs = [
      { content: 'data1', filename: 'boarding_pass.pdf' },
      { content: 'data2', filename: 'hotel_booking.pdf' }
    ];
    const results = await processPdfsWithClaude(pdfs, 1);

    expect(results).toHaveLength(2);
    expect(results[0].result.flights[0].flightNumber).toBe('AB1');
    expect(results[1].result.hotels[0].name).toBe('Hotel');
  });

  test('falls back when batch response is truncated', async () => {
    // First call returns truncated response
    mockCreate.mockResolvedValueOnce({
      content: [{ text: '{"documents": [' }],
      stop_reason: 'max_tokens'
    });
    // Fallback individual calls succeed
    mockCreate
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify({ flights: [{ flightNumber: 'AB1' }] }) }],
        stop_reason: 'end_turn'
      })
      .mockResolvedValueOnce({
        content: [{ text: JSON.stringify({ hotels: [{ name: 'Hotel' }] }) }],
        stop_reason: 'end_turn'
      });

    const pdfs = [
      { content: 'data1', filename: 'boarding_pass.pdf' },
      { content: 'data2', filename: 'hotel_booking.pdf' }
    ];
    const results = await processPdfsWithClaude(pdfs, 1);

    expect(results).toHaveLength(2);
    expect(results[0].result.flights).toBeDefined();
    expect(results[1].result.hotels).toBeDefined();
  });

  test('rate limit error is properly flagged', async () => {
    const rateLimitError = new Error('rate_limit');
    rateLimitError.status = 429;
    rateLimitError.isRateLimit = true;
    mockCreate.mockRejectedValue(rateLimitError);

    const pdfs = [{ content: 'data', filename: 'doc.pdf' }];
    const results = await processPdfsWithClaude(pdfs, 1);

    expect(results).toHaveLength(1);
    expect(results[0].result).toBeNull();
    expect(results[0].error.isRateLimit).toBe(true);
  });

  test('batched call sends multiple document blocks in content', async () => {
    const batchResponse = {
      documents: [
        { index: 0, flights: [] },
        { index: 1, hotels: [] }
      ]
    };

    mockCreate.mockResolvedValueOnce({
      content: [{ text: JSON.stringify(batchResponse) }],
      stop_reason: 'end_turn'
    });

    const pdfs = [
      { content: 'pdf1data', filename: 'flight.pdf' },
      { content: 'pdf2data', filename: 'hotel_booking.pdf' }
    ];
    await processPdfsWithClaude(pdfs);

    const callArgs = mockCreate.mock.calls[0][0];
    const contentBlocks = callArgs.messages[0].content;

    // Should have 2 document blocks + 1 text block
    expect(contentBlocks).toHaveLength(3);
    expect(contentBlocks[0].type).toBe('document');
    expect(contentBlocks[0].source.data).toBe('pdf1data');
    expect(contentBlocks[1].type).toBe('document');
    expect(contentBlocks[1].source.data).toBe('pdf2data');
    expect(contentBlocks[2].type).toBe('text');
    // Prompt should reference both documents
    expect(contentBlocks[2].text).toContain('Document 1');
    expect(contentBlocks[2].text).toContain('Document 2');
    // Max tokens should be higher for batch
    expect(callArgs.max_tokens).toBe(8192);
  });
});
