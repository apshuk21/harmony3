/**
 * Mock Trade Data
 *
 * Sample data for testing and development.
 * This data is used by MSW handlers to return realistic responses.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */

export interface Trade {
  id: string
  symbol: string
  quantity: number
  price: number
  side: 'BUY' | 'SELL'
  timestamp: string
}

export interface TradesSummary {
  totalTrades: number
  totalVolume: number
  averagePrice: number
}

export const mockTrades: Trade[] = [
  {
    id: '1',
    symbol: 'AAPL',
    quantity: 100,
    price: 150.25,
    side: 'BUY',
    timestamp: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    symbol: 'GOOGL',
    quantity: 50,
    price: 2750.5,
    side: 'SELL',
    timestamp: '2024-01-15T11:45:00Z',
  },
  {
    id: '3',
    symbol: 'MSFT',
    quantity: 75,
    price: 380.0,
    side: 'BUY',
    timestamp: '2024-01-15T12:00:00Z',
  },
  {
    id: '4',
    symbol: 'AMZN',
    quantity: 25,
    price: 178.5,
    side: 'SELL',
    timestamp: '2024-01-15T13:15:00Z',
  },
  {
    id: '5',
    symbol: 'NVDA',
    quantity: 200,
    price: 875.25,
    side: 'BUY',
    timestamp: '2024-01-15T14:30:00Z',
  },
]

export const mockTradesSummary: TradesSummary = {
  totalTrades: 150,
  totalVolume: 1250000,
  averagePrice: 425.75,
}
