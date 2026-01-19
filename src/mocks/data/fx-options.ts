/**
 * Mock FX Options Trade Data
 *
 * Sample data for FX Options trades used in testing and development.
 * Used by MSW handlers to return realistic responses for AG Grid Server-Side Row Model.
 *
 * Reference: docs/harmony/07-test-setup-guide.md
 */

export interface FxOptionTrade {
  id: string
  tradeId: string
  currencyPair: string
  optionType: 'Call' | 'Put'
  strikePrice: number
  spotPrice: number
  premium: number
  notionalAmount: number
  expiryDate: string
  tradeDate: string
  counterparty: string
  status: 'Active' | 'Exercised' | 'Expired' | 'Cancelled'
  trader: string
  desk: string
  delta: number
  gamma: number
  vega: number
  theta: number
}

// Generate 100 mock FX Options trades for realistic pagination testing
function generateFxOptionsTrades(): FxOptionTrade[] {
  const currencyPairs = [
    'USD/EUR',
    'GBP/USD',
    'USD/JPY',
    'EUR/GBP',
    'AUD/USD',
    'USD/CHF',
    'NZD/USD',
    'USD/CAD',
  ]

  const optionTypes: FxOptionTrade['optionType'][] = ['Call', 'Put']
  const statuses: FxOptionTrade['status'][] = [
    'Active',
    'Exercised',
    'Expired',
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
    'Alex Chen',
    'Emma Wilson',
    'Ryan Garcia',
    'Lisa Thompson',
    'Chris Martin',
  ]
  const desks = ['Options NYC', 'Derivatives London', 'Exotics Tokyo', 'Vol Desk']

  const trades: FxOptionTrade[] = []

  for (let i = 1; i <= 100; i++) {
    const currencyPair = currencyPairs[Math.floor(Math.random() * currencyPairs.length)]
    const spotPrice = parseFloat((Math.random() * 0.5 + 0.8).toFixed(4))
    const strikePrice = parseFloat(
      (spotPrice * (1 + (Math.random() * 0.1 - 0.05))).toFixed(4)
    )
    const notionalAmount = Math.floor(Math.random() * 50000000) + 1000000
    const premium = Math.floor(notionalAmount * (Math.random() * 0.05 + 0.01))

    const tradeDate = new Date(2024, 0, 1 + Math.floor(Math.random() * 180))
    const expiryDate = new Date(tradeDate)
    expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 365) + 30)

    trades.push({
      id: `fx-opt-${i}`,
      tradeId: `FXO-${String(i).padStart(6, '0')}`,
      currencyPair,
      optionType: optionTypes[Math.floor(Math.random() * optionTypes.length)],
      strikePrice,
      spotPrice,
      premium,
      notionalAmount,
      tradeDate: tradeDate.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      counterparty: counterparties[Math.floor(Math.random() * counterparties.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      trader: traders[Math.floor(Math.random() * traders.length)],
      desk: desks[Math.floor(Math.random() * desks.length)],
      delta: parseFloat((Math.random() * 2 - 1).toFixed(4)),
      gamma: parseFloat((Math.random() * 0.1).toFixed(4)),
      vega: parseFloat((Math.random() * 1000).toFixed(2)),
      theta: parseFloat((Math.random() * -100).toFixed(2)),
    })
  }

  return trades
}

export const mockFxOptionsTrades: FxOptionTrade[] = generateFxOptionsTrades()
