export const STRIPE_TIERS = {
  starter: {
    product_id: "prod_UDOX9vTUBJU9wK",
    price_id: "price_1TExkTQYqblmeN59HOG5R20c",
    name: "Starter",
    priceYearly: 468,
    priceMonthly: 39,
  },
  pro: {
    product_id: "prod_UDOYV6m28r6T8n",
    price_id: "price_1TExkwQYqblmeN59UISEkr6r",
    name: "Pro",
    priceYearly: 1080,
    priceMonthly: 90,
  },
  business: {
    product_id: "prod_UDOYdZZWVYKGcd",
    price_id: "price_1TExlOQYqblmeN59WL0zHUwk",
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
