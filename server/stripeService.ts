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
      payment_method_types: ['card'],
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
}

export const stripeService = new StripeService();
