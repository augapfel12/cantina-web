import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

// Use service role key for webhook (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed'
    console.error('Webhook signature error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      const orderId = session.metadata?.order_id

      if (!orderId) {
        console.error('No order_id in session metadata')
        return NextResponse.json({ error: 'No order_id' }, { status: 400 })
      }

      // Update order as paid
      const { error } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          stripe_session_id: session.id,
        })
        .eq('id', orderId)

      if (error) {
        console.error('Failed to update order:', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      console.log(`Order ${orderId} marked as paid`)
      break
    }

    case 'checkout.session.expired':
    case 'payment_intent.payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id

      if (orderId) {
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('id', orderId)
      }
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

// In Next.js App Router, raw body is available by default in Route Handlers
// No need to disable body parsing — request.text() reads the raw body
