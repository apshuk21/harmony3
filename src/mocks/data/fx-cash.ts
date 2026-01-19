/**
 * Mock FX Cash Trade Data
 *
 * Sample data for FX Cash trades used in testing and development.
 * Used by MSW handlers to return realistic responses for AG Grid Server-Side Row Model.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */

export interface FxCashTrade {
  id: string
  tradeId: string
  currencyPair: string
  buyCurrency: string
  sellCurrency: string
  buyAmount: number
  sellAmount: number
  rate: number
  valueDate: string
  tradeDate: string
  counterparty: string
  status: 'Completed' | 'Pending' | 'Settled' | 'Cancelled'
  trader: string
  desk: string
}

// Generate 100 mock FX Cash trades for realistic pagination testing
function generateFxCashTrades(): FxCashTrade[] {
  const currencyPairs = [
    { pair: 'USD/EUR', buy: 'USD', sell: 'EUR' },
    { pair: 'GBP/USD', buy: 'GBP', sell: 'USD' },
    { pair: 'USD/JPY', buy: 'USD', sell: 'JPY' },
    { pair: 'EUR/GBP', buy: 'EUR', sell: 'GBP' },
    { pair: 'AUD/USD', buy: 'AUD', sell: 'USD' },
    { pair: 'USD/CHF', buy: 'USD', sell: 'CHF' },
    { pair: 'NZD/USD', buy: 'NZD', sell: 'USD' },
    { pair: 'USD/CAD', buy: 'USD', sell: 'CAD' },
  ]

  const statuses: FxCashTrade['status'][] = [
    'Completed',
    'Pending',
    'Settled',
    'Cancelled',
  ]
  const counterparties = [
    'Goldman Sachs',
    'JP Morgan',
    'Citibank',
    'Deutsche Bank',
    'Barclays',
    'HSBC',
    'UBS',
    'Morgan Stanley',
  ]
  const traders = [
    'John Smith',
    'Jane Doe',
    'Mike Johnson',
    'Sarah Williams',
    'David Brown',
  ]
  const desks = ['NYC Spot', 'London FX', 'Tokyo Desk', 'Singapore FX']

  const trades: FxCashTrade[] = []

  for (let i = 1; i <= 100; i++) {
    const currencyData = currencyPairs[Math.floor(Math.random() * currencyPairs.length)]
    const buyAmount = Math.floor(Math.random() * 10000000) + 100000
    const rate = parseFloat((Math.random() * 0.5 + 0.8).toFixed(4))
    const sellAmount = Math.floor(buyAmount * rate)

    const tradeDate = new Date(2024, 0, 1 + Math.floor(Math.random() * 180))
    const valueDate = new Date(tradeDate)
    valueDate.setDate(valueDate.getDate() + 2)

    trades.push({
      id: `fx-cash-${i}`,
      tradeId: `FXC-${String(i).padStart(6, '0')}`,
      currencyPair: currencyData.pair,
      buyCurrency: currencyData.buy,
      sellCurrency: currencyData.sell,
      buyAmount,
      sellAmount,
      rate,
      tradeDate: tradeDate.toISOString().split('T')[0],
      valueDate: valueDate.toISOString().split('T')[0],
      counterparty: counterparties[Math.floor(Math.random() * counterparties.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      trader: traders[Math.floor(Math.random() * traders.length)],
      desk: desks[Math.floor(Math.random() * desks.length)],
    })
  }

  return trades
}

export const mockFxCashTrades: FxCashTrade[] = generateFxCashTrades()
