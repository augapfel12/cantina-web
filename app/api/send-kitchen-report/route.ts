import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { enGB } from 'date-fns/locale'

// CRON_SECRET=cantina-cron-2026

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

function formatDateNice(dateStr: string): string {
  const d = parseISO(dateStr)
  return format(d, 'EEEE, dd MMMM yyyy', { locale: enGB })
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

interface KitchenRow {
  name: string
  count: number
}

interface PackItem {
  class_name: string
  student_name: string
  lunch: string
  snack: string
  juice: string
  diet: string[]
}

async function generateKitchenReport(date: string, schoolId?: string): Promise<string> {
  // Fetch all schools if no schoolId provided
  let schools: { id: string; name: string; slug: string }[] = []
  if (schoolId) {
    const { data } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('id', schoolId)
      .eq('active', true)
    schools = data || []
  } else {
    const { data } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('active', true)
      .order('name')
    schools = data || []
  }

  const sections: string[] = []

  for (const school of schools) {
    // Fetch menu_day for this school/date
    const { data: menuDay } = await supabase
      .from('menu_days')
      .select('menu1_name, menu2_name')
      .eq('school_id', school.id)
      .eq('date', date)
      .single()

    // Fetch order_items for this date/school (paid or pending)
    const { data: items } = await supabase
      .from('order_items')
      .select(`
        id,
        date,
        lunch_choice,
        daily_available:daily_available_id(name),
        snack:snack_id(name),
        juice:juice_id(name),
        orders!inner(
          school_id,
          payment_status,
          students(
            student_name,
            class_name,
            diet_vegan,
            diet_vegetarian,
            diet_gluten_free,
            diet_dairy_free
          )
        )
      `)
      .eq('date', date)
      .eq('orders.school_id', school.id)
      .in('orders.payment_status', ['paid', 'pending'])

    if (!items || items.length === 0) {
      sections.push(
        `\n${'═'.repeat(47)}\n` +
        `${school.name.toUpperCase()}\n` +
        `${'═'.repeat(47)}\n` +
        `No orders.\n`
      )
      continue
    }

    // Aggregate
    const lunchCounts: Record<string, KitchenRow> = {}
    const snackCounts: Record<string, KitchenRow> = {}
    const juiceCounts: Record<string, KitchenRow> = {}
    const dietCounts: Record<string, number> = {}
    const packList: PackItem[] = []

    for (const item of items) {
      const order = item.orders as any
      const student = order?.students

      // Lunch
      let lunchName = ''
      if (item.lunch_choice === 'menu1') {
        lunchName = menuDay?.menu1_name || 'Menu 1'
      } else if (item.lunch_choice === 'menu2') {
        lunchName = menuDay?.menu2_name || 'Menu 2'
      } else if (item.lunch_choice === 'daily_available') {
        lunchName = (item.daily_available as any)?.name || 'Daily Special'
      }

      if (lunchName) {
        if (!lunchCounts[lunchName]) lunchCounts[lunchName] = { name: lunchName, count: 0 }
        lunchCounts[lunchName].count++
      }

      // Snack
      const snackName = (item.snack as any)?.name || ''
      if (snackName) {
        if (!snackCounts[snackName]) snackCounts[snackName] = { name: snackName, count: 0 }
        snackCounts[snackName].count++
      }

      // Juice
      const juiceName = (item.juice as any)?.name || ''
      if (juiceName) {
        if (!juiceCounts[juiceName]) juiceCounts[juiceName] = { name: juiceName, count: 0 }
        juiceCounts[juiceName].count++
      }

      // Diet
      const dietFlags: string[] = []
      if (student?.diet_vegan) {
        dietFlags.push('VEGAN')
        dietCounts['Vegan'] = (dietCounts['Vegan'] || 0) + 1
      }
      if (student?.diet_vegetarian) {
        dietFlags.push('VEG')
        dietCounts['Vegetarian'] = (dietCounts['Vegetarian'] || 0) + 1
      }
      if (student?.diet_gluten_free) {
        dietFlags.push('GF')
        dietCounts['Gluten-Free'] = (dietCounts['Gluten-Free'] || 0) + 1
      }
      if (student?.diet_dairy_free) {
        dietFlags.push('DF')
        dietCounts['Dairy-Free'] = (dietCounts['Dairy-Free'] || 0) + 1
      }

      packList.push({
        class_name: student?.class_name || '-',
        student_name: student?.student_name || '-',
        lunch: lunchName || '-',
        snack: snackName || '-',
        juice: juiceName || '-',
        diet: dietFlags,
      })
    }

    // Sort pack list by class then student name
    packList.sort((a, b) => {
      if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name)
      return a.student_name.localeCompare(b.student_name)
    })

    const lunchRows = Object.values(lunchCounts).sort((a, b) => b.count - a.count)
    const snackRows = Object.values(snackCounts).sort((a, b) => b.count - a.count)
    const juiceRows = Object.values(juiceCounts).sort((a, b) => b.count - a.count)
    const totalLunch = lunchRows.reduce((s, r) => s + r.count, 0)

    let section = `\n${'═'.repeat(47)}\n`
    section += `QUANTITIES - ${school.name.toUpperCase()}\n`
    section += `${'═'.repeat(47)}\n\n`

    // Lunch
    section += `LUNCH:\n`
    for (const r of lunchRows) {
      section += `  ${padRight(r.name + ':', 36)} ${padLeft(r.count + 'x', 4)}\n`
    }
    section += `  ${'─'.repeat(42)}\n`
    section += `  ${padRight('TOTAL LUNCHBOXES:', 36)} ${padLeft(totalLunch + 'x', 4)}\n\n`

    // Diet
    if (Object.keys(dietCounts).length > 0) {
      section += `DIET:\n`
      for (const [label, cnt] of Object.entries(dietCounts)) {
        section += `  ${padRight(label + ':', 36)} ${padLeft(cnt + 'x', 4)}\n`
      }
      section += '\n'
    }

    // Snacks
    if (snackRows.length > 0) {
      section += `SNACKS:\n`
      for (const r of snackRows) {
        section += `  ${padRight(r.name + ':', 36)} ${padLeft(r.count + 'x', 4)}\n`
      }
      section += '\n'
    }

    // Juices
    if (juiceRows.length > 0) {
      section += `JUICES:\n`
      for (const r of juiceRows) {
        section += `  ${padRight(r.name + ':', 36)} ${padLeft(r.count + 'x', 4)}\n`
      }
      section += '\n'
    }

    // Pack list
    section += `${'═'.repeat(47)}\n`
    section += `PACK LIST (alphabetical by class):\n`
    section += `${'═'.repeat(47)}\n`
    for (const p of packList) {
      const dietStr = p.diet.length > 0 ? p.diet.join('+') : ''
      section += `${padRight(p.class_name, 8)} | ${padRight(p.student_name, 20)} | ${padRight(p.lunch, 24)} | ${padRight(p.snack, 14)} | ${padRight(p.juice, 14)} | ${dietStr}\n`
    }

    sections.push(section)
  }

  const header = `CANTINA - DAILY KITCHEN REPORT\nDate: ${formatDateNice(date)}\n`
  return header + sections.join('\n')
}

function buildKitchenReportHtml(reportText: string, date: string): string {
  const escaped = reportText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Küchenreport - ${date}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" border="0" style="max-width:700px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#F97316;padding:20px 28px;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;">CANTINA - Daily Kitchen Report</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">${formatDateNice(date)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <pre style="font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.6;color:#111827;white-space:pre-wrap;word-break:break-word;margin:0;">${escaped}</pre>
          </td>
        </tr>
        <tr>
          <td style="background:#F97316;padding:16px 28px;">
            <div style="font-size:12px;color:rgba(255,255,255,0.85);">
              <a href="https://cantina-web-three.vercel.app/admin/kitchen" style="color:#ffffff;font-weight:700;text-decoration:none;">Admin Kitchen →</a>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const date: string = body.date || new Date().toISOString().split('T')[0]
    const schoolId: string | undefined = body.schoolId

    const reportText = await generateKitchenReport(date, schoolId)
    const html = buildKitchenReportHtml(reportText, date)

    const subject = `Kitchen Report - ${formatDateNice(date)}`

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Cantina <onboarding@resend.dev>',
      to: ['cantina@ccsbali.com'],
      subject,
      html,
    })

    if (emailError) {
      console.error('Kitchen report email error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', detail: emailError }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: emailData?.id, date })
  } catch (error: unknown) {
    console.error('send-kitchen-report error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
