/**
 * Comprehensive Unit Tests for AI Parser (aiParser.ts)
 */

import { parseLocalHeuristics, parseWhatsAppMessage } from '../utils/aiParser';

describe('aiParser Utility', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Regex Fallback Parser (parseLocalHeuristics)', () => {
    it('parses message with packages, add-ons, dates, and all section bullet points', () => {
      const message = `
HARISHCHANDRAGAD TREK
Experience the best cliff views and ancient caves.

Dates: 15-16 Oct 2026
Cost: ₹1500 per person
Tent Extra: ₹300
Rappelling Add-on: ₹500

Inclusions:
• Food and snacks
- Tent stay
* Guide fees

Exclusions:
- Personal expenses
• Bottled water

Things to Carry:
• Backpack
- Warm jacket

Cancellation Policy:
• Non-refundable within 24 hours

Itinerary:
Day 1: Reach base village
Day 2: Trek to Konkan Kada
`;

      const results = parseLocalHeuristics(message);
      expect(results.length).toBe(1);
      const trip = results[0];

      expect(trip.title).toBe('HARISHCHANDRAGAD TREK');
      expect(trip.packages?.length).toBeGreaterThan(0);
      expect(trip.packages?.some(p => p.price === 1500)).toBe(true);

      // Add-ons check
      expect(trip.addOns?.length).toBe(2);
      expect(trip.addOns?.some(a => a.price === 300)).toBe(true);
      expect(trip.addOns?.some(a => a.price === 500)).toBe(true);

      // Batches / Dates check
      expect(trip.batches?.length).toBeGreaterThan(0);
      expect(trip.batches?.[0].dateDuration).toContain('15-16 Oct');
      expect(trip.batches?.[0].totalSeats).toBe(30);

      // Inclusions, exclusions, thingsToCarry, cancellationPolicy
      expect(trip.inclusions).toContain('Food and snacks');
      expect(trip.inclusions).toContain('Tent stay');
      expect(trip.exclusions).toContain('Personal expenses');
      expect(trip.thingsToCarry).toContain('Backpack');
      expect(trip.thingsToCarry).toContain('Warm jacket');
      expect(trip.cancellationPolicy).toContain('Non-refundable within 24 hours');

      // Itinerary check
      expect(trip.itinerary).toContain('Day 1: Reach base village');
      expect(trip.itinerary).toContain('Day 2: Trek to Konkan Kada');
    });

    it('generates fallback description if none found', () => {
      const message = 'Trip without header\nCost: ₹1200';
      const results = parseLocalHeuristics(message);
      expect(results[0].description).toBeDefined();
      expect(results[0].packages?.[0].price).toBe(1200);
    });
  });

  describe('Gemini Parser', () => {
    it('parses successful JSON candidates response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify([{ title: 'Gemini Trip 1', packages: [{ name: 'Solo', price: 2000 }] }]) }],
              },
            },
          ],
        }),
      });

      const results = await parseWhatsAppMessage('Trip info', 'gemini', 'test_key');
      expect(results[0].title).toBe('Gemini Trip 1');
    });

    it('strips markdown code blocks from Gemini response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n[{"title": "Markdown Stripped Trip"}]\n```' }],
              },
            },
          ],
        }),
      });

      const results = await parseWhatsAppMessage('Trip info', 'gemini', 'test_key');
      expect(results[0].title).toBe('Markdown Stripped Trip');
    });

    it('throws error on empty response from Gemini', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [],
        }),
      });

      await expect(parseWhatsAppMessage('Trip info', 'gemini', 'test_key')).rejects.toThrow('Empty response from Gemini');
    });

    it('retries next model on 404, 503, or 429 and succeeds', async () => {
      // First model returns 404
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => 'Model not found',
        })
        // Second model succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify([{ title: 'Fallback Model Trip' }]) }],
                },
              },
            ],
          }),
        });

      const results = await parseWhatsAppMessage('Trip info', 'gemini', 'test_key');
      expect(results[0].title).toBe('Fallback Model Trip');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-recoverable error (e.g. 403 Forbidden)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'API key blocked',
      });

      await expect(parseWhatsAppMessage('Trip info', 'gemini', 'test_key')).rejects.toThrow(
        'Gemini API Error: 403 - API key blocked'
      );
    });

    it('throws high demand message when all models fail with recoverable errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'High demand overload',
      });

      await expect(parseWhatsAppMessage('Trip info', 'gemini', 'test_key')).rejects.toThrow(
        'AI services are currently experiencing exceptionally high demand'
      );
    });
  });

  describe('OpenAI Parser', () => {
    it('parses valid json_object response with trips array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ trips: [{ title: 'OpenAI Trip 1' }] }),
              },
            },
          ],
        }),
      });

      const results = await parseWhatsAppMessage('Trip text', 'openai', 'openai_key');
      expect(results[0].title).toBe('OpenAI Trip 1');
    });

    it('strips markdown code blocks from OpenAI response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```json\n{"trips": [{"title": "OpenAI Markdown Trip"}]}\n```',
              },
            },
          ],
        }),
      });

      const results = await parseWhatsAppMessage('Trip text', 'openai', 'openai_key');
      expect(results[0].title).toBe('OpenAI Markdown Trip');
    });

    it('throws error when OpenAI returns empty message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: {} }],
        }),
      });

      await expect(parseWhatsAppMessage('Trip text', 'openai', 'openai_key')).rejects.toThrow(
        'Empty response from OpenAI'
      );
    });

    it('throws error when OpenAI response is not valid JSON', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'NOT_A_VALID_JSON_STRING',
              },
            },
          ],
        }),
      });

      await expect(parseWhatsAppMessage('Trip text', 'openai', 'openai_key')).rejects.toThrow(
        'Failed to parse AI response as JSON'
      );
    });

    it('throws error on non-ok OpenAI status code', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request payload',
      });

      await expect(parseWhatsAppMessage('Trip text', 'openai', 'openai_key')).rejects.toThrow(
        'OpenAI API Error: 400 - Bad Request payload'
      );
    });
  });
});
