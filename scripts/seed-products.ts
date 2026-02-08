// Script to create Stripe products and prices for CRStats
// Run this script manually when you need to create products:
// npx tsx scripts/seed-products.ts

import { getUncachableStripeClient } from '../server/stripeClient';
import { PRICING } from '../shared/pricing';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating CRStats PRO subscription product...');

  // Check if product already exists
  const existingProducts = await stripe.products.search({ 
    query: "name:'CRStats PRO'" 
  });
  
  const monthlyAmount = Math.round(PRICING.BRL.monthlyPrice * 100);
  const yearlyAmount = typeof PRICING.BRL.yearlyPrice === "number" ? Math.round(PRICING.BRL.yearlyPrice * 100) : null;

  const product = existingProducts.data.length > 0
    ? existingProducts.data[0]
    : await stripe.products.create({
        name: 'CRStats PRO',
        description: 'Acesso completo ao Coach IA, análises avançadas e estatísticas detalhadas de Clash Royale',
        metadata: {
          tier: 'pro',
          features: 'ai_coach,advanced_stats,battle_analysis,unlimited_favorites',
        },
      });

  console.log('Created product:', product.id);

  const existingPrices = await stripe.prices.list({ product: product.id, limit: 100 });
  const brlRecurring = existingPrices.data.filter((price) => price.currency === 'brl' && price.recurring);

  const monthlyExisting = brlRecurring.find(
    (price) => price.recurring?.interval === 'month' && price.unit_amount === monthlyAmount,
  );

  const monthlyPrice = monthlyExisting || await stripe.prices.create({
    product: product.id,
    unit_amount: monthlyAmount,
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });

  console.log('Monthly price:', monthlyPrice.id, `- BRL ${monthlyAmount / 100}/month`);

  let yearlyPriceId: string | null = null;
  if (yearlyAmount !== null) {
    const yearlyExisting = brlRecurring.find(
      (price) => price.recurring?.interval === 'year' && price.unit_amount === yearlyAmount,
    );

    const yearlyPrice = yearlyExisting || await stripe.prices.create({
      product: product.id,
      unit_amount: yearlyAmount,
      currency: 'brl',
      recurring: { interval: 'year' },
      metadata: { plan: 'yearly' },
    });

    yearlyPriceId = yearlyPrice.id;
    console.log('Yearly price:', yearlyPrice.id, `- BRL ${yearlyAmount / 100}/year`);
  }

  console.log('\nProducts created successfully!');
  console.log('Monthly Price ID:', monthlyPrice.id);
  if (yearlyPriceId) {
    console.log('Yearly Price ID:', yearlyPriceId);
  }
}

createProducts().catch(console.error);
