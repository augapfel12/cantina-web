export interface School {
  id: string
  slug: string
  name: string
  active: boolean
  created_at: string
}

export interface SchoolLevel {
  id: string
  school_id: string
  name: string
  sort_order: number
}

export interface Price {
  id: string
  school_id: string
  level_id: string
  item_type: 'lunch' | 'snack' | 'juice'
  price_idr: number
  diet_surcharge_vegan: number
  diet_surcharge_gf: number
}

export interface Term {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  ordering_type: 'term' | 'monthly' | 'flexible'
  active: boolean
  created_at: string
}

export interface Holiday {
  id: string
  school_id: string
  date: string
  name: string
  created_at: string
}

export interface MenuDay {
  id: string
  term_id: string
  school_id: string
  date: string
  menu1_name: string | null
  menu1_desc: string | null
  menu2_name: string | null
  menu2_desc: string | null
  created_at: string
}

export interface DailyAvailable {
  id: string
  school_id: string
  code: string | null
  name: string
  description: string | null
  active: boolean
  sort_order: number
}

export interface Snack {
  id: string
  school_id: string
  name: string
  active: boolean
  sort_order: number
}

export interface Juice {
  id: string
  school_id: string
  name: string
  active: boolean
  sort_order: number
}

export interface Student {
  id: string
  school_id: string
  level_id: string
  student_name: string
  class_name: string | null
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  diet_vegetarian: boolean
  diet_vegan: boolean
  diet_gluten_free: boolean
  diet_dairy_free: boolean
  created_at: string
}

export interface Order {
  id: string
  student_id: string
  school_id: string
  term_id: string
  total_idr: number
  payment_status: 'pending' | 'paid' | 'failed'
  payment_method: 'stripe' | 'midtrans' | null
  stripe_session_id: string | null
  notes: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  date: string
  lunch_choice: 'menu1' | 'menu2' | 'daily_available' | 'none' | null
  daily_available_id: string | null
  snack_id: string | null
  juice_id: string | null
  lunch_price_idr: number
  snack_price_idr: number
  juice_price_idr: number
  diet_surcharge_idr: number
  total_idr: number
  created_at: string
}

// Form types for the order page
export interface StudentFormData {
  student_name: string
  class_name: string
  level_id: string
  parent_name: string
  parent_email: string
  parent_phone: string
  diet_vegetarian: boolean
  diet_vegan: boolean
  diet_gluten_free: boolean
  diet_dairy_free: boolean
}

export interface DayOrderSelection {
  date: string
  lunch_choice: 'menu1' | 'menu2' | 'daily_available' | 'none' | ''
  daily_available_id: string
  snack_id: string
  juice_id: string
}

// Admin view types
export interface OrderWithDetails extends Order {
  student: Student
  items: OrderItemWithDetails[]
}

export interface OrderItemWithDetails extends OrderItem {
  daily_available?: DailyAvailable
  snack?: Snack
  juice?: Juice
  menu_day?: MenuDay
}
