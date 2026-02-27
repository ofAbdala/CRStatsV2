# CRStats — Stripe Production Setup Guide

This guide documents how to configure Stripe for production payments.

## 1. Switch to Live Mode

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Toggle the **Test mode** switch OFF (top-right of dashboard)
3. Complete account activation if not done already (business info, bank account, etc.)

## 2. Get Production API Keys

1. Go to **Developers → API keys**
2. Copy the **Publishable key** (`pk_live_...`) → set as `STRIPE_PUBLISHABLE_KEY` in Vercel
3. Copy the **Secret key** (`sk_live_...`) → set as `STRIPE_SECRET_KEY` in Vercel

> **IMPORTANT:** Never commit live keys to git. Set them only in Vercel Environment Variables.

## 3. Create Products & Prices

### CRStats PRO Monthly
1. Go to **Products → Add product**
2. Name: `CRStats PRO`
3. Description: `Plano PRO com acesso completo a todas as funcionalidades do CRStats`
4. Click **Add price**:
   - Price: R$19,90
   - Currency: BRL
   - Billing period: Monthly
   - Click **Add price**
5. Copy the Price ID (`price_...`) → set as `STRIPE_PRO_PRICE_ID` in Vercel

### CRStats PRO Annual
1. On the same product, click **Add another price**
2. Price: R$159,00
3. Currency: BRL
4. Billing period: Yearly
5. Copy the Price ID (`price_...`) → set as `STRIPE_PRO_ANNUAL_PRICE_ID` in Vercel

## 4. Register Webhook Endpoint

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (`whsec_...`) → set as `STRIPE_WEBHOOK_SECRET` in Vercel

## 5. Test Webhook Delivery

### Using Stripe CLI (recommended for initial testing)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local server
stripe listen --forward-to localhost:5000/api/stripe/webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

### Verify in Dashboard
1. Go to **Developers → Webhooks → your endpoint**
2. Check the **Recent deliveries** tab
3. All events should show `200` response

## 6. Customer Portal Configuration

1. Go to **Settings → Billing → Customer portal**
2. Enable the portal
3. Configure allowed actions:
   - Cancel subscription: enabled
   - Switch plans: enabled (if you have multiple price tiers)
   - Update payment method: enabled
4. Set redirect URL: `https://your-domain.vercel.app/billing`

## 7. Vercel Environment Variables Checklist

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Example | Scope |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production only |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production only |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Production only |
| `STRIPE_PRO_PRICE_ID` | `price_...` | Production only |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | `price_...` | Production only |

> For Preview/Development environments, use test keys (`sk_test_`/`pk_test_`).

## 8. Post-Setup Verification

- [ ] Checkout session creates successfully with live keys
- [ ] Webhook events are received and return 200
- [ ] Subscription status updates correctly after checkout.session.completed
- [ ] Customer portal is accessible and functional
- [ ] Invoice.payment_failed triggers appropriate user notification
- [ ] Cancel flow works end-to-end
