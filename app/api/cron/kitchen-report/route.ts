// CRON_SECRET=cantina-cron-2026
// Schedule: 0 23 * * * (23:00 UTC = 07:00 Bali time / WITA UTC+8)

export const runtime = 'edge'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  try {
    // Call the kitchen report API for all schools (no schoolId = all schools)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cantina-web-three.vercel.app'
    const response = await fetch(`${baseUrl}/api/send-kitchen-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Kitchen report cron failed:', errorText)
      return Response.json({ success: false, error: errorText }, { status: 500 })
    }

    const result = await response.json()
    console.log('Kitchen report cron success:', result)
    return Response.json({ success: true, date: today, emailId: result.emailId })
  } catch (error: unknown) {
    console.error('Kitchen report cron error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
