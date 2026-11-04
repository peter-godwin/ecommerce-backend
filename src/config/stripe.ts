import Stripe from 'stripe';
import { env } from './env';

if (!env.stripe.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
}

export const stripe = new Stripe(env.stripe.secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
});

export const stripeConfig = {
    publishableKey: env.stripe.publishableKey,
    currency: env.stripe.currency,
    webhookSecret: env.stripe.webhookSecret,
};