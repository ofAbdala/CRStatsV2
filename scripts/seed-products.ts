// Script to create Stripe products and prices for CRStats
// Run this script manually when you need to create products:
// npx tsx scripts/seed-products.ts

import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating CRStats PRO subscription product...');

  // Check if product already exists
  const existingProducts = await stripe.products.search({ 
    query: "name:'CRStats PRO'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('CRStats PRO product already exists:', existingProducts.data[0].id);
    return;
  }

  // Create the PRO subscription product
  const product = await stripe.products.create({
    name: 'CRStats PRO',
    description: 'Acesso completo ao Coach IA, análises avançadas e estatísticas detalhadas de Clash Royale',
    metadata: {
      tier: 'pro',
      features: 'ai_coach,advanced_stats,battle_analysis,unlimited_favorites',
    },
  });

  console.log('Created product:', product.id);

  // Create monthly price
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1990, // R$19.90 in cents
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'monthly',
    },
  });

  console.log('Created monthly price:', monthlyPrice.id, '- R$19.90/month');

  // Create yearly price (discount)
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 15900, // R$159.00 in cents (save 2 months)
    currency: 'brl',
    recurring: { interval: 'year' },
    metadata: {
      plan: 'yearly',
    },
  });

  console.log('Created yearly price:', yearlyPrice.id, '- R$159.00/year');

  console.log('\nProducts created successfully!');
  console.log('Monthly Price ID:', monthlyPrice.id);
  console.log('Yearly Price ID:', yearlyPrice.id);
}

createProducts().catch(console.error);
