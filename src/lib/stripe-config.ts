export const STRIPE_TIERS = {
  starter: {
    product_id: "prod_UBLateo9XPpVDE",
    price_id: "price_1TCytAQVJRFR5c8X7EqksFGb",
    name: "Starter",
    priceYearly: 468,
    priceMonthly: 39,
  },
  pro: {
    product_id: "prod_UBLbvG5df7Zh1U",
    price_id: "price_1TCyu3QVJRFR5c8XiT17WOSN",
    name: "Pro",
    priceYearly: 1080,
    priceMonthly: 90,
  },
  business: {
    product_id: "prod_UBLczkGGDOkLYG",
    price_id: "price_1TCyvKQVJRFR5c8XQlgp0oXI",
    name: "Business",
    priceYearly: 2400,
    priceMonthly: 200,
  },
} as const;

export type StripeTier = keyof typeof STRIPE_TIERS;

export function getTierByProductId(productId: string): StripeTier | null {
  for (const [key, tier] of Object.entries(STRIPE_TIERS)) {
    if (tier.product_id === productId) return key as StripeTier;
  }
  return null;
}
