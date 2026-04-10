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

function escapeCsvField(val: string | number | null | undefined): string {
  const str = val == null ? '' : String(val)
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // e.g. "2026-04"

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new NextResponse('Invalid or missing month parameter. Use format: YYYY-MM', {
      status: 400,
    })
  }

  const [year, monthNum] = month.split('-')
  const startDate = `${year}-${monthNum}-01`
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate()
  const endDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`

  // Fetch order items for school + month
  const { data: items, error } = await supabase
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
      orders!inner(
        id,
        payment_status,
        school_id,
        students(
          student_name,
          class_name,
          parent_name,
          parent_email
        ),
        terms(name)
      ),
      menu_day:date(menu1_name, menu2_name)
    `)
    .eq('orders.school_id', schoolId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    return new NextResponse(`Database error: ${error.message}`, { status: 500 })
  }

  const rows: string[] = []

  // Header row
  rows.push(
    csvRow([
      'Order ID',
      'Date',
      'Student Name',
      'Class',
      'Level',
      'Lunch Choice',
      'Snack',
      'Juice',
      'Lunch Price',
      'Snack Price',
      'Juice Price',
      'Diet Surcharge',
      'Total',
      'Payment Status',
    ])
  )

  for (const item of (items || []) as any[]) {
    const orders = item.orders
    const student = orders?.students

    // Determine lunch name
    let lunchChoice = ''
    if (item.lunch_choice === 'menu1') {
      lunchChoice = item.menu_day?.menu1_name || 'Menu 1'
    } else if (item.lunch_choice === 'menu2') {
      lunchChoice = item.menu_day?.menu2_name || 'Menu 2'
    } else if (item.lunch_choice === 'daily_available') {
      lunchChoice = item.daily_available?.name || 'Daily Available'
    } else if (item.lunch_choice === 'none') {
      lunchChoice = 'None'
    }

    const dateLabel = item.date
      ? format(parseISO(item.date), 'dd MMM yyyy')
      : ''

    rows.push(
      csvRow([
        orders?.id ? orders.id.substring(0, 8).toUpperCase() : '',
        dateLabel,
        student?.student_name || '',
        student?.class_name || '',
        '', // level — not directly on student, could be expanded
        lunchChoice,
        item.snack?.name || '',
        item.juice?.name || '',
        formatIDR(item.lunch_price_idr || 0),
        formatIDR(item.snack_price_idr || 0),
        formatIDR(item.juice_price_idr || 0),
        formatIDR(item.diet_surcharge_idr || 0),
        formatIDR(item.total_idr || 0),
        orders?.payment_status || '',
      ])
    )
  }

  const csv = rows.join('\n')
  const filename = `cantina-${month}-export.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
