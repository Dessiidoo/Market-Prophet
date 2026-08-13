import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  async createCheckoutSession(
    amount: number,
    portfolioId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const stripe = await getUncachableStripeClient();
    
    return await stripe.checkout.sessions.create({
      managed_payments: { enabled: false },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Gold Dust AI Investment',
              description: `Investment of $${amount.toFixed(2)} into AI-powered trading`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        portfolioId,
        investmentAmount: amount.toString(),
      },
    });
  }

  async getSession(sessionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.retrieve(sessionId);
  }

  async createConnectAccount(portfolioId: string) {
    const stripe = await getUncachableStripeClient();
    
    return await stripe.accounts.create({
      type: 'express',
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        portfolioId,
      },
    });
  }

  async createConnectOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  async getConnectAccount(accountId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.accounts.retrieve(accountId);
  }

  async createPayout(accountId: string, amount: number, portfolioId: string) {
    const stripe = await getUncachableStripeClient();
    
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: accountId,
      metadata: {
        portfolioId,
        type: 'withdrawal',
      },
    });
    
    return transfer;
  }

  async getAccountBalance(accountId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  }
}

export const stripeService = new StripeService();
