import Stripe from 'stripe';

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectorName = 'stripe';
  const targetEnvironment = 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings.secret) {
    throw new Error('Stripe connection not found');
  }

  return connectionSettings.settings.secret;
}

async function main() {
  console.log('Getting Stripe credentials...');
  const secretKey = await getCredentials();
  const stripe = new Stripe(secretKey);

  console.log('Looking for existing CRStats PRO product...');
  
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(p => p.name === 'CRStats PRO');

  if (!product) {
    console.log('Creating CRStats PRO product...');
    product = await stripe.products.create({
      name: 'CRStats PRO',
      description: 'Premium coaching and analytics for Clash Royale',
    });
    console.log('Product created:', product.id);
  } else {
    console.log('Product found:', product.id);
  }

  const pricesToCreate = [
    { currency: 'usd', amount: 1000, interval: 'month', name: 'USD Monthly' },
    { currency: 'usd', amount: 8000, interval: 'year', name: 'USD Yearly' },
    { currency: 'eur', amount: 900, interval: 'month', name: 'EUR Monthly' },
    { currency: 'eur', amount: 7200, interval: 'year', name: 'EUR Yearly' },
  ];

  const createdPrices: Record<string, string> = {};

  for (const priceData of pricesToCreate) {
    console.log(`Creating ${priceData.name} price...`);
    
    const price = await stripe.prices.create({
      product: product.id,
      currency: priceData.currency,
      unit_amount: priceData.amount,
      recurring: {
        interval: priceData.interval as 'month' | 'year',
      },
      nickname: priceData.name,
    });

    const key = `${priceData.currency.toUpperCase()}_${priceData.interval === 'month' ? 'monthly' : 'yearly'}`;
    createdPrices[key] = price.id;
    console.log(`  ${priceData.name}: ${price.id}`);
  }

  console.log('\n=== CREATED PRICE IDS ===');
  console.log('USD Monthly:', createdPrices.USD_monthly);
  console.log('USD Yearly:', createdPrices.USD_yearly);
  console.log('EUR Monthly:', createdPrices.EUR_monthly);
  console.log('EUR Yearly:', createdPrices.EUR_yearly);
  console.log('\nUpdate these in shared/pricing.ts!');
}

main().catch(console.error);
