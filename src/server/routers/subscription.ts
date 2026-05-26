import { TRPCError } from '@trpc/server';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { getStripe } from '@/lib/stripe';

export const subscriptionRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    let sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!sub) {
      sub = await ctx.prisma.subscription.create({
        data: { userId: ctx.session.user.id },
      });
    }

    return sub;
  }),

  createCheckoutSession: protectedProcedure.mutation(async ({ ctx }) => {
    let sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!sub) {
      sub = await ctx.prisma.subscription.create({
        data: { userId: ctx.session.user.id },
      });
    }

    let customerId = sub.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: ctx.session.user.email!,
        name: ctx.session.user.name ?? undefined,
        metadata: { userId: ctx.session.user.id },
      });

      await ctx.prisma.subscription.update({
        where: { userId: ctx.session.user.id },
        data: { stripeCustomerId: customer.id },
      });

      customerId = customer.id;
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/upgrade`,
      metadata: { userId: ctx.session.user.id },
    });

    return { url: session.url };
  }),

  createBillingPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await ctx.prisma.subscription.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!sub?.stripeCustomerId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Aucun abonnement Stripe actif trouvé',
      });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
    });

    return { url: session.url };
  }),
});
