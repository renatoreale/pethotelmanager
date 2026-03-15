export const STRIPE_TIERS = {
  starter: {
    product_id: "prod_U8OrMLjP8wVigh",
    price_id: "price_1TA844QVJRFR5c8XwnqD9Gkz",
    name: "Starter",
    priceYearly: 468,
    priceMonthly: 39,
  },
  pro: {
    product_id: "prod_U8Ot5c9TR7Qo5Y",
    price_id: "price_1TA85HQVJRFR5c8XW1qND3N3",
    name: "Pro",
    priceYearly: 996,
    priceMonthly: 83,
  },
  business: {
    product_id: "prod_U8UHgawtj9PJ7j",
    price_id: "price_1TADIvQVJRFR5c8XHxHbBxjN",
    name: "Business",
    priceYearly: 1548,
    priceMonthly: 129,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_TIERS;

export function getTierByProductId(productId: string): StripeTier | null {
  for (const [key, tier] of Object.entries(STRIPE_TIERS)) {
    if (tier.product_id === productId) return key as StripeTier;
  }
  return null;
}
