export const STRIPE_TIERS = {
  starter: {
    product_id: "prod_UfQmHxJmkY7am6",
    price_id: "price_1Tg5woQYqblmeN598KDF8lzl",
    name: "Singola Pensione",
    priceYearly: 300,
    priceMonthly: 25,
  },
  multi: {
    product_id: "prod_UfQmT7dIRughKY",
    price_id: "price_1Tg5wkQYqblmeN59xiY1BYQt",
    name: "Multi Pensione",
    priceYearly: 720,
    priceMonthly: 60,
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
