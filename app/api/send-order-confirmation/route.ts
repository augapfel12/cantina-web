import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function buildAdminNotificationHtml(order: any, items: any[]): string {
  const student = order.student
  const school = order.school

  const dietFlags: string[] = []
  if (student?.diet_vegetarian) dietFlags.push('Vegetarisch')
  if (student?.diet_vegan) dietFlags.push('Vegan')
  if (student?.diet_gluten_free) dietFlags.push('Glutenfrei')
  if (student?.diet_dairy_free) dietFlags.push('Laktosefrei')
  const dietStr = dietFlags.length > 0 ? dietFlags.join(', ') : 'Keine'

  const grandTotal = order.total_idr

  const tableRows = items.map((item: any) => {
    let lunchName = '-'
    if (item.lunch_choice === 'menu1') {
      lunchName = item.menu_day?.menu1_name || 'Menu 1'
    } else if (item.lunch_choice === 'menu2') {
      lunchName = item.menu_day?.menu2_name || 'Menu 2'
    } else if (item.lunch_choice === 'daily_available') {
      lunchName = item.daily_available?.name || 'Daily Special'
    }
    const snackName = item.snack?.name || '-'
    const juiceName = item.juice?.name || '-'
    return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${formatDate(item.date)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${lunchName}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: center;">${snackName}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: center;">${juiceName}</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Neue Bestellung - Admin</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#F97316;padding:20px 28px;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;">Neue Bestellung eingegangen</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">Cantina Admin Benachrichtigung</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <!-- Student Info -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding-bottom:8px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:3px;">Schüler</div>
                        <div style="font-size:14px;font-weight:600;color:#111827;">${student?.student_name || '-'}</div>
                      </td>
                      <td width="50%" style="padding-bottom:8px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:3px;">Klasse</div>
                        <div style="font-size:14px;font-weight:600;color:#111827;">${student?.class_name || '-'}</div>
                      </td>
                    </tr>
                    <tr>
                      <td width="50%">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:3px;">Schule</div>
                        <div style="font-size:14px;font-weight:600;color:#111827;">${school?.name || '-'}</div>
                      </td>
                      <td width="50%">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;margin-bottom:3px;">Diät</div>
                        <div style="font-size:14px;font-weight:600;color:#111827;">${dietStr}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <!-- Info row -->
            <p style="font-size:14px;color:#374151;margin:0 0 16px 0;">
              <strong>Bestellte Tage:</strong> ${items.length} &nbsp;&nbsp;
              <strong>Gesamtbetrag:</strong> ${formatIDR(grandTotal)}
            </p>
            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#F97316;">
                <th style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#fff;text-align:left;">Datum</th>
                <th style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#fff;text-align:left;">Lunch</th>
                <th style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;">Snack</th>
                <th style="padding:8px 10px;font-size:11px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;">Juice</th>
              </tr>
              ${tableRows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#9ca3af;">Keine Artikel</td></tr>'}
            </table>
            <!-- Total -->
            <p style="font-size:18px;font-weight:800;color:#111827;margin:0 0 24px 0;">Total: ${formatIDR(grandTotal)}</p>
            <!-- Admin link -->
            <a href="https://cantina-web-three.vercel.app/admin" style="display:inline-block;background:#F97316;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">
              Admin Dashboard öffnen →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const resend = new Resend(process.env.RESEND_API_KEY)

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'EEE, dd. MMM', { locale: de })
}

function buildEmailHtml(order: any, items: any[]): string {
  const student = order.student
  const school = order.school
  const isPaid = order.payment_status === 'paid'
  const statusLabel = isPaid ? 'BEZAHLT' : 'AUSSTEHEND'
  const statusColor = isPaid ? '#16a34a' : '#ea580c'
  const statusBg = isPaid ? '#dcfce7' : '#fff7ed'

  // Diet flags
  const dietFlags: string[] = []
  if (student?.diet_vegetarian) dietFlags.push('Vegetarisch')
  if (student?.diet_vegan) dietFlags.push('Vegan')
  if (student?.diet_gluten_free) dietFlags.push('Glutenfrei')
  if (student?.diet_dairy_free) dietFlags.push('Laktosefrei')

  // Totals
  let lunchTotal = 0
  let snackTotal = 0
  let juiceTotal = 0
  let surchargeTotal = 0

  // Build item rows
  const tableRows = items.map((item: any) => {
    // Determine lunch name
    let lunchName = ''
    if (item.lunch_choice === 'menu1') {
      lunchName = item.menu_day?.menu1_name || 'Menu 1'
    } else if (item.lunch_choice === 'menu2') {
      lunchName = item.menu_day?.menu2_name || 'Menu 2'
    } else if (item.lunch_choice === 'daily_available') {
      lunchName = item.daily_available?.name || 'Daily Special'
    }

    const snackName = item.snack?.name || '-'
    const juiceName = item.juice?.name || '-'

    lunchTotal += item.lunch_price_idr || 0
    snackTotal += item.snack_price_idr || 0
    juiceTotal += item.juice_price_idr || 0
    surchargeTotal += item.diet_surcharge_idr || 0

    const rowTotal = (item.lunch_price_idr || 0) + (item.snack_price_idr || 0) +
      (item.juice_price_idr || 0) + (item.diet_surcharge_idr || 0)

    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; white-space: nowrap;">${formatDate(item.date)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151;">${lunchName || '-'}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; text-align: center;">${snackName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; text-align: center;">${juiceName}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; text-align: right; white-space: nowrap;">${formatIDR(rowTotal)}</td>
      </tr>`
  }).join('')

  const grandTotal = order.total_idr

  const dietBadges = dietFlags.length > 0
    ? dietFlags.map(d => `<span style="display: inline-block; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 4px; padding: 2px 8px; font-size: 12px; margin-right: 4px;">${d}</span>`).join('')
    : '<span style="color: #9ca3af; font-size: 13px;">Keine</span>'

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bestellbestätigung - ${student?.student_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Orange Header -->
          <tr>
            <td style="background-color: #F97316; padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #ffffff; border-radius: 10px; text-align: center; vertical-align: middle;">
                          <span style="font-size: 22px; font-weight: 900; color: #F97316; line-height: 44px; display: block;">C</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Cantina</div>
                          <div style="font-size: 12px; color: rgba(255,255,255,0.85); margin-top: 2px;">School Lunch Catering · Bali</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Bestellbestätigung</div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.85); margin-top: 4px;">Vielen Dank für Ihre Bestellung!</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">

              <!-- Greeting -->
              <p style="font-size: 15px; color: #374151; margin: 0 0 8px 0;">Hallo <strong style="color: #111827;">${student?.parent_name || 'Elternteil'}</strong>,</p>
              <p style="font-size: 14px; color: #6b7280; margin: 0 0 28px 0;">
                vielen Dank für Ihre Bestellung! Hier ist eine Übersicht der Bestellung für <strong style="color: #111827;">${student?.student_name}</strong>.
              </p>

              <!-- Student Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" style="padding-bottom: 8px;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 3px;">Schüler</div>
                          <div style="font-size: 14px; font-weight: 600; color: #111827;">${student?.student_name || '-'}</div>
                        </td>
                        <td width="50%" style="padding-bottom: 8px;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 3px;">Klasse</div>
                          <div style="font-size: 14px; font-weight: 600; color: #111827;">${student?.class_name || '-'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 3px;">Schule</div>
                          <div style="font-size: 14px; font-weight: 600; color: #111827;">${school?.name || '-'}</div>
                        </td>
                        <td width="50%">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 3px;">Diät</div>
                          <div style="margin-top: 2px;">${dietBadges}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <!-- Table header -->
                <tr style="background-color: #F97316;">
                  <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; text-align: left;">Datum</th>
                  <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; text-align: left;">Gericht</th>
                  <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; text-align: center;">Snack</th>
                  <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; text-align: center;">Juice</th>
                  <th style="padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff; text-align: right;">Preis</th>
                </tr>
                ${tableRows || `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #9ca3af; font-size: 13px;">Keine Artikel gefunden</td></tr>`}
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="right">
                    <table cellpadding="0" cellspacing="0" border="0" style="min-width: 260px;">
                      ${lunchTotal > 0 ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151;">Zwischensumme Lunch</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; text-align: right; padding-left: 24px; white-space: nowrap;">${formatIDR(lunchTotal)}</td>
                      </tr>` : ''}
                      ${snackTotal > 0 ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6;">Snacks</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; text-align: right; padding-left: 24px; white-space: nowrap; border-bottom: 1px solid #f3f4f6;">${formatIDR(snackTotal)}</td>
                      </tr>` : ''}
                      ${juiceTotal > 0 ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6;">Juices</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; text-align: right; padding-left: 24px; white-space: nowrap; border-bottom: 1px solid #f3f4f6;">${formatIDR(juiceTotal)}</td>
                      </tr>` : ''}
                      ${surchargeTotal > 0 ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6;">Diät-Aufschlag</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #374151; text-align: right; padding-left: 24px; white-space: nowrap; border-bottom: 1px solid #f3f4f6;">${formatIDR(surchargeTotal)}</td>
                      </tr>` : ''}
                      <!-- Divider -->
                      <tr>
                        <td colspan="2" style="padding: 4px 0;"><div style="border-top: 2px solid #F97316; margin: 4px 0;"></div></td>
                      </tr>
                      <!-- Grand total -->
                      <tr>
                        <td style="padding: 8px 0; font-size: 16px; font-weight: 800; color: #111827;">Gesamtbetrag</td>
                        <td style="padding: 8px 0; font-size: 16px; font-weight: 800; color: #111827; text-align: right; padding-left: 24px; white-space: nowrap;">${formatIDR(grandTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Payment Status -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: ${statusBg}; color: ${statusColor}; border: 1.5px solid ${statusColor}; border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px;">
                      Zahlungsstatus: ${statusLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="border-top: 1px solid #e5e7eb; margin-bottom: 24px;"></div>

              <!-- Closing note -->
              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                Bei Fragen können Sie uns jederzeit kontaktieren. Wir freuen uns, Ihr Kind mit frischem, gesundem Mittagessen zu versorgen!
              </p>

            </td>
          </tr>

          <!-- Orange Footer -->
          <tr>
            <td style="background-color: #F97316; padding: 20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 13px; color: rgba(255,255,255,0.9); line-height: 1.6;">
                      <strong style="color: #ffffff;">Bei Fragen:</strong>
                      <a href="mailto:cantina@ccsbali.com" style="color: #ffffff; text-decoration: none;">cantina@ccsbali.com</a>
                      &nbsp;|&nbsp;
                      WA: <a href="https://wa.me/6281239031620" style="color: #ffffff; text-decoration: none;">+62 812-3903-1620</a>
                    </div>
                    <div style="font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px;">
                      <a href="https://www.cantina.id" style="color: rgba(255,255,255,0.9); text-decoration: none;">www.cantina.id</a>
                    </div>
                  </td>
                  <td align="right">
                    <div style="font-size: 12px; color: rgba(255,255,255,0.75);">© 2025 Cantina Bali</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch order with related data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        total_idr,
        payment_status,
        notes,
        student:students(
          student_name,
          class_name,
          parent_name,
          parent_email,
          parent_phone,
          diet_vegetarian,
          diet_vegan,
          diet_gluten_free,
          diet_dairy_free
        ),
        school:schools(name, slug)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order fetch error:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch order items with item details
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        date,
        lunch_choice,
        lunch_price_idr,
        snack_price_idr,
        juice_price_idr,
        diet_surcharge_idr,
        total_idr,
        daily_available:daily_available_id(name),
        snack:snack_id(name),
        juice:juice_id(name),
        menu_day:date(menu1_name, menu2_name)
      `)
      .eq('order_id', orderId)
      .order('date', { ascending: true })

    if (itemsError) {
      console.error('Items fetch error:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 })
    }

    const orderAny = order as any
    const student = orderAny.student
    const school = orderAny.school

    const parentEmail = student?.parent_email
    if (!parentEmail) {
      return NextResponse.json({ error: 'No parent email on file for this student' }, { status: 400 })
    }

    const studentName = student?.student_name || 'Schüler'
    const schoolName = school?.name || 'Schule'
    const subject = `Bestellbestätigung - ${studentName} - ${schoolName}`

    const html = buildEmailHtml(orderAny, items || [])

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Cantina <onboarding@resend.dev>',
      to: [parentEmail],
      subject,
      html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', detail: emailError }, { status: 500 })
    }

    // Send admin notification for CCS school only
    const schoolSlug = (school as any)?.slug
    if (schoolSlug === 'ccs') {
      const className = student?.class_name || ''
      const adminSubject = `Neue Bestellung - ${studentName} (${className}) - ${schoolName}`
      const adminHtml = buildAdminNotificationHtml(orderAny, items || [])
      const { error: adminEmailError } = await resend.emails.send({
        from: 'Cantina <onboarding@resend.dev>',
        to: ['cantina@ccsbali.com'],
        subject: adminSubject,
        html: adminHtml,
      })
      if (adminEmailError) {
        console.error('Admin notification email error:', adminEmailError)
        // Non-fatal: parent email already sent, just log the error
      }
    }

    return NextResponse.json({ success: true, emailId: emailData?.id })
  } catch (error: unknown) {
    console.error('send-order-confirmation error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
