/**
 * Trade API Handlers
 *
 * MSW handlers for trade-related API endpoints.
 * These handlers are used in both tests and development.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */
import { http, HttpResponse, delay } from 'msw'
import { mockTrades, mockTradesSummary } from '../data/trades'
import type { Trade } from '../data/trades'

export const tradeHandlers = [
  // GET /api/trades - List trades with pagination
  http.get('/api/trades', async ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')

    // Simulate network delay (useful for testing loading states)
    await delay(100)

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedTrades = mockTrades.slice(start, end)

    return HttpResponse.json({
      data: paginatedTrades,
      total: mockTrades.length,
      page,
      pageSize,
    })
  }),

  // GET /api/trades/:id - Get single trade
  http.get('/api/trades/:id', async ({ params }) => {
    const { id } = params
    const trade = mockTrades.find((t) => t.id === id)

    if (!trade) {
      return HttpResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return HttpResponse.json(trade)
  }),

  // GET /api/trades/summary - Get trades summary
  http.get('/api/trades/summary', () => {
    return HttpResponse.json(mockTradesSummary)
  }),

  // POST /api/trades - Create trade
  http.post('/api/trades', async ({ request }) => {
    const newTrade = (await request.json()) as Omit<Trade, 'id'>

    const createdTrade: Trade = {
      id: crypto.randomUUID(),
      ...newTrade,
    }

    return HttpResponse.json(createdTrade, { status: 201 })
  }),

  // PUT /api/trades/:id - Update trade
  http.put('/api/trades/:id', async ({ params, request }) => {
    const { id } = params
    const trade = mockTrades.find((t) => t.id === id)

    if (!trade) {
      return HttpResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    const updates = (await request.json()) as Partial<Trade>
    const updatedTrade = { ...trade, ...updates }

    return HttpResponse.json(updatedTrade)
  }),

  // DELETE /api/trades/:id - Delete trade
  http.delete('/api/trades/:id', ({ params }) => {
    const { id } = params
    const tradeIndex = mockTrades.findIndex((t) => t.id === id)

    if (tradeIndex === -1) {
      return HttpResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    return HttpResponse.json({ success: true }, { status: 200 })
  }),
]
