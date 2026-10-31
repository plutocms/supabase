import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCurrency } from '../shared/utils/currency'

// shared/utils/product-price.ts calls the auto-imported `formatCurrency`.
// Plain `vitest run` has no Nuxt build step, so stub it with the real one
// from shared/utils/currency.ts.
beforeEach(() => {
  vi.stubGlobal('formatCurrency', formatCurrency)
  vi.resetModules()
})

async function load() {
  return await import('../shared/utils/product-price')
}

describe('amountToCents', () => {
  it('converts 49.90 to 4990', async () => {
    const { amountToCents } = await load()
    expect(amountToCents(49.9)).toBe(4990)
  })

  it('converts 0 to 0', async () => {
    const { amountToCents } = await load()
    expect(amountToCents(0)).toBe(0)
  })

  it('has no float drift', async () => {
    const { amountToCents } = await load()
    expect(amountToCents(0.1 + 0.2)).toBe(30)
    expect(amountToCents(0.1)).toBe(10)
    expect(amountToCents(1.005)).toBe(101)
    expect(amountToCents(19.99)).toBe(1999)
    expect(amountToCents(4.35)).toBe(435)
  })

  it('rounds extra decimals to the nearest cent', async () => {
    const { amountToCents } = await load()
    expect(amountToCents(10.004)).toBe(1000)
    expect(amountToCents(10.006)).toBe(1001)
  })

  it('gives null for a missing or invalid value', async () => {
    const { amountToCents } = await load()
    expect(amountToCents(null)).toBeNull()
    expect(amountToCents(undefined)).toBeNull()
    expect(amountToCents(Number.NaN)).toBeNull()
  })
})

describe('centsToAmount', () => {
  it('converts cents to an amount', async () => {
    const { centsToAmount } = await load()
    expect(centsToAmount(4990)).toBe(49.9)
    expect(centsToAmount(0)).toBe(0)
    expect(centsToAmount(5)).toBe(0.05)
  })

  it('gives 0 for a missing or invalid value', async () => {
    const { centsToAmount } = await load()
    expect(centsToAmount(null)).toBe(0)
    expect(centsToAmount(undefined)).toBe(0)
    expect(centsToAmount(Number.NaN)).toBe(0)
  })

  it('round-trips with amountToCents', async () => {
    const { centsToAmount, amountToCents } = await load()
    for (const cents of [0, 1, 10, 30, 999, 4990, 123456]) {
      expect(amountToCents(centsToAmount(cents))).toBe(cents)
    }
  })
})

describe('formatProductPrice', () => {
  it('formats cents as BRL', async () => {
    const { formatProductPrice } = await load()
    expect(formatProductPrice(4990)).toMatch(/R\$\s*49,90/)
    expect(formatProductPrice(0)).toMatch(/R\$\s*0,00/)
  })

  it('passes options to formatCurrency', async () => {
    const { formatProductPrice } = await load()
    expect(formatProductPrice(4900, { trailingZero: false })).toMatch(
      /R\$\s*49$/
    )
  })
})

describe('digitsToCents', () => {
  it('reads a masked price as cents', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('R$ 50,90')).toBe(5090)
    expect(digitsToCents('R$ 1.234,56')).toBe(123456)
  })

  it('shifts a digit typed at the end in from the right', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('R$ 50,901')).toBe(50901)
    expect(digitsToCents('R$ 0,005')).toBe(5)
  })

  it('drops the last digit on Backspace', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('R$ 50,9')).toBe(509)
  })

  it('reads pasted text', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('50,90')).toBe(5090)
  })

  it('gives 0 for zeros and null for no digit', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('R$ 0,00')).toBe(0)
    expect(digitsToCents('')).toBeNull()
    expect(digitsToCents('R$ ')).toBeNull()
  })

  it('ignores digits after the 13th', async () => {
    const { digitsToCents } = await load()
    expect(digitsToCents('12345678901234')).toBe(1234567890123)
  })
})
