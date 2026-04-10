import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

// IDR to USD conversion for Stripe (Stripe doesn't natively support IDR)
// We charge in USD. Rate: approximately 1 USD = 16,000 IDR
const IDR_TO_USD_RATE = 16000

export async function POST(request: NextRequest) {
  try {
    const {
      orderId,
      totalIdr,
      schoolName,
      studentName,
      termName,
      itemCount,
    } = await request.json()

    if (!orderId || !totalIdr) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert IDR to USD cents for Stripe
    const totalUsd = Math.round((totalIdr / IDR_TO_USD_RATE) * 100)

    // Ensure minimum charge (Stripe minimum is usually $0.50)
    if (totalUsd < 50) {
      return NextResponse.json(
        { error: 'Order total too low for card payment' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Cantina Lunch – ${termName}`,
              description: `${itemCount} day${itemCount !== 1 ? 's' : ''} of lunch for ${studentName} at ${schoolName}`,
            },
            unit_amount: totalUsd,
          },
          quantity: 1,
        },
      ],
      metadata: {
        order_id: orderId,
        total_idr: totalIdr.toString(),
        school_name: schoolName,
        student_name: studentName,
      },
      success_url: `${baseUrl}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${baseUrl}/order-cancelled?order_id=${orderId}`,
      customer_email: undefined, // Could pass parent_email here
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
