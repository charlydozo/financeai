import Stripe from 'stripe';

// Initialisation paresseuse : on ne crée l'instance qu'au premier appel pour
// éviter que next build échoue quand STRIPE_SECRET_KEY n'est pas encore définie.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY est manquante dans .env.local');
    _stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true });
  }
  return _stripe;
}
