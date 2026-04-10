import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, parseISO } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatItemDate(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'EEE dd-MMM')
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params

  // Fetch order with related data
  const { data: order, error } = await supabase
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
        parent_phone
      ),
      school:schools(name),
      term:terms(name, start_date, end_date)
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return new NextResponse('Order not found', { status: 404 })
  }

  // Fetch order items with item details
  const { data: items } = await supabase
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

  const orderAny = order as any
  const student = orderAny.student
  const school = orderAny.school
  const term = orderAny.term

  const orderDate = format(parseISO(orderAny.created_at), 'dd MMMM yyyy')
  const orderYear = format(parseISO(orderAny.created_at), 'yyyy')
  const orderMonth = format(parseISO(orderAny.created_at), 'MM')
  const invoiceNumber = `INV-${orderYear}${orderMonth}-${orderId.substring(0, 8).toUpperCase()}`

  const isPaid = orderAny.payment_status === 'paid'
  const statusLabel = isPaid ? 'PAID' : 'OUTSTANDING'
  const statusColor = isPaid ? '#16a34a' : '#ea580c'
  const statusBg = isPaid ? '#dcfce7' : '#fff7ed'

  // Build item rows
  const itemRows = (items || []).map((item: any) => {
    const rows: string[] = []

    // Determine lunch name
    let lunchName = ''
    if (item.lunch_choice === 'menu1') {
      lunchName = item.menu_day?.menu1_name || 'Menu 1'
    } else if (item.lunch_choice === 'menu2') {
      lunchName = item.menu_day?.menu2_name || 'Menu 2'
    } else if (item.lunch_choice === 'daily_available') {
      lunchName = item.daily_available?.name || 'Daily Available'
    }

    const dateLabel = formatItemDate(item.date)

    if (lunchName && item.lunch_price_idr > 0) {
      rows.push(`
        <tr>
          <td class="cell">${dateLabel}</td>
          <td class="cell">${lunchName} (Lunch)</td>
          <td class="cell center">1</td>
          <td class="cell right">${formatIDR(item.lunch_price_idr)}</td>
          <td class="cell right">${formatIDR(item.lunch_price_idr)}</td>
        </tr>
      `)
    }

    if (item.snack?.name && item.snack_price_idr > 0) {
      rows.push(`
        <tr>
          <td class="cell">${dateLabel}</td>
          <td class="cell">${item.snack.name} (Snack)</td>
          <td class="cell center">1</td>
          <td class="cell right">${formatIDR(item.snack_price_idr)}</td>
          <td class="cell right">${formatIDR(item.snack_price_idr)}</td>
        </tr>
      `)
    }

    if (item.juice?.name && item.juice_price_idr > 0) {
      rows.push(`
        <tr>
          <td class="cell">${dateLabel}</td>
          <td class="cell">${item.juice.name} (Juice)</td>
          <td class="cell center">1</td>
          <td class="cell right">${formatIDR(item.juice_price_idr)}</td>
          <td class="cell right">${formatIDR(item.juice_price_idr)}</td>
        </tr>
      `)
    }

    if (item.diet_surcharge_idr > 0) {
      rows.push(`
        <tr>
          <td class="cell">${dateLabel}</td>
          <td class="cell">Diet Surcharge</td>
          <td class="cell center">1</td>
          <td class="cell right">${formatIDR(item.diet_surcharge_idr)}</td>
          <td class="cell right">${formatIDR(item.diet_surcharge_idr)}</td>
        </tr>
      `)
    }

    return rows.join('')
  }).join('')

  const subtotal = (items || []).reduce((sum: number, item: any) => {
    return sum + (item.lunch_price_idr || 0) + (item.snack_price_idr || 0) + (item.juice_price_idr || 0)
  }, 0)

  const totalSurcharge = (items || []).reduce((sum: number, item: any) => {
    return sum + (item.diet_surcharge_idr || 0)
  }, 0)

  const grandTotal = orderAny.total_idr

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1f2937;
      background: #fff;
    }

    .page {
      max-width: 720px;
      margin: 0 auto;
      padding: 40px 48px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #f97316;
    }

    .logo-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: #f97316;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 22px;
      font-weight: 900;
      flex-shrink: 0;
    }

    .logo-text p:first-child {
      font-size: 22px;
      font-weight: 800;
      color: #f97316;
      letter-spacing: -0.5px;
    }

    .logo-text p:last-child {
      font-size: 12px;
      color: #6b7280;
      margin-top: 1px;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta h1 {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -1px;
    }

    .invoice-meta p {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }

    .invoice-meta .inv-number {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-top: 6px;
      font-family: 'Courier New', monospace;
    }

    /* Status badge */
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1.5px solid ${statusColor};
      margin-top: 8px;
    }

    /* Bill to */
    .bill-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }

    .bill-box h3 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 10px;
    }

    .bill-box p {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
    }

    .bill-box p strong {
      color: #111827;
      font-weight: 600;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    thead tr {
      background: #f97316;
      color: white;
    }

    thead th {
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }

    thead th.right { text-align: right; }
    thead th.center { text-align: center; }

    .cell {
      padding: 9px 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12.5px;
      color: #374151;
    }

    .cell.right { text-align: right; }
    .cell.center { text-align: center; }

    tr:nth-child(even) td {
      background: #fafafa;
    }

    /* Totals */
    .totals {
      margin-left: auto;
      width: 260px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid #f3f4f6;
      color: #374151;
    }

    .totals-row.total {
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      border-top: 2px solid #f97316;
      border-bottom: none;
      padding-top: 10px;
      margin-top: 4px;
    }

    /* Footer */
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .footer h4 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 8px;
    }

    .footer p {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.6;
    }

    .footer p strong {
      color: #374151;
    }

    .print-btn {
      display: block;
      margin: 32px auto 0;
      padding: 10px 24px;
      background: #f97316;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    @media print {
      .print-btn { display: none; }
      body { background: white; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      <div class="logo-block">
        <div class="logo-icon">C</div>
        <div class="logo-text">
          <p>Cantina</p>
          <p>School Lunch Catering · Bali</p>
        </div>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p class="inv-number">${invoiceNumber}</p>
        <p>Issued: ${orderDate}</p>
        <div class="status-badge">${statusLabel}</div>
      </div>
    </div>

    <!-- Bill To / Order Info -->
    <div class="bill-section">
      <div class="bill-box">
        <h3>Bill To</h3>
        <p>
          <strong>${student?.parent_name || student?.student_name || 'Parent/Guardian'}</strong><br />
          ${student?.parent_email ? `${student.parent_email}<br />` : ''}
          ${student?.parent_phone ? `${student.parent_phone}<br />` : ''}
          <br />
          Student: <strong>${student?.student_name || 'N/A'}</strong><br />
          Class: ${student?.class_name || 'N/A'}<br />
          School: ${school?.name || 'N/A'}
        </p>
      </div>
      <div class="bill-box">
        <h3>Order Details</h3>
        <p>
          Order ID: <strong>${orderId.substring(0, 8).toUpperCase()}</strong><br />
          ${term ? `Period: <strong>${term.name}</strong><br />` : ''}
          ${term ? `${term.start_date} to ${term.end_date}<br />` : ''}
          ${(items || []).length} lunch day${(items || []).length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>

    <!-- Items table -->
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Item</th>
          <th class="center">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td class="cell" colspan="5" style="text-align:center;color:#9ca3af;">No items found</td></tr>'}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatIDR(subtotal)}</span>
      </div>
      ${totalSurcharge > 0 ? `
      <div class="totals-row">
        <span>Diet Surcharges</span>
        <span>${formatIDR(totalSurcharge)}</span>
      </div>
      ` : ''}
      <div class="totals-row total">
        <span>Grand Total</span>
        <span>${formatIDR(grandTotal)}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <h4>Payment Information</h4>
        <p>
          <strong>Bank Transfer</strong><br />
          Bank: BCA<br />
          Account: 123-456-789<br />
          Name: Cantina Bali<br />
          Reference: ${invoiceNumber}
        </p>
      </div>
      <div>
        <h4>Contact</h4>
        <p>
          cantina.bali@gmail.com<br />
          +62 812 3456 7890<br />
          Canggu, Bali, Indonesia<br />
          <br />
          Thank you for choosing Cantina!
        </p>
      </div>
    </div>

    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>

  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
