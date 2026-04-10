-- Schools
create table schools (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, -- 'ccs', 'lfb', 'sunrise', 'monte', 'dyatmika-students', 'dyatmika-staff'
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- School levels (Primary/Secondary with different prices)
create table school_levels (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null, -- 'Primary', 'Secondary', 'Staff'
  sort_order int default 0
);

-- Prices per school per level per item type
create table prices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  level_id uuid references school_levels(id) on delete cascade,
  item_type text not null, -- 'lunch', 'snack', 'juice'
  price_idr int not null,
  diet_surcharge_vegan int default 15000,
  diet_surcharge_gf int default 15000
);

-- Terms / ordering periods per school
create table terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null, -- 'Term 4 2026', 'May 2026'
  start_date date not null,
  end_date date not null,
  ordering_type text default 'flexible', -- 'term', 'monthly', 'flexible'
  active boolean default true,
  created_at timestamptz default now()
);

-- Holidays and school breaks per school
create table holidays (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz default now()
);

-- Daily menu per school per term
create table menu_days (
  id uuid primary key default gen_random_uuid(),
  term_id uuid references terms(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  date date not null,
  menu1_name text,
  menu1_desc text,
  menu2_name text,
  menu2_desc text,
  created_at timestamptz default now(),
  unique(term_id, date)
);

-- Daily available items per school (the ~15 always-available dishes)
create table daily_available (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  code text, -- 'A', 'B', 'C'...
  name text not null,
  description text,
  active boolean default true,
  sort_order int default 0
);

-- Snacks per school
create table snacks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  active boolean default true,
  sort_order int default 0
);

-- Juices per school
create table juices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  active boolean default true,
  sort_order int default 0
);

-- Students / children profiles
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id),
  level_id uuid references school_levels(id),
  student_name text not null,
  class_name text,
  parent_name text,
  parent_email text,
  parent_phone text,
  diet_vegetarian boolean default false,
  diet_vegan boolean default false,
  diet_gluten_free boolean default false,
  diet_dairy_free boolean default false,
  created_at timestamptz default now()
);

-- Orders (one per checkout session)
create table orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  school_id uuid references schools(id),
  term_id uuid references terms(id),
  total_idr int not null default 0,
  payment_status text default 'pending', -- 'pending', 'paid', 'failed'
  payment_method text, -- 'stripe', 'midtrans'
  stripe_session_id text,
  notes text,
  created_at timestamptz default now()
);

-- Individual order items (one per day ordered)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  date date not null,
  lunch_choice text, -- 'menu1', 'menu2', 'daily_available', 'none'
  daily_available_id uuid references daily_available(id),
  snack_id uuid references snacks(id),
  juice_id uuid references juices(id),
  lunch_price_idr int default 0,
  snack_price_idr int default 0,
  juice_price_idr int default 0,
  diet_surcharge_idr int default 0,
  total_idr int default 0,
  created_at timestamptz default now()
);

-- Insert seed data for schools
insert into schools (id, slug, name) values
  ('11111111-1111-1111-1111-111111111111', 'ccs', 'Canggu Community School'),
  ('22222222-2222-2222-2222-222222222222', 'lfb', 'Little Fingers Bali'),
  ('33333333-3333-3333-3333-333333333333', 'sunrise', 'Sunrise School'),
  ('44444444-4444-4444-4444-444444444444', 'monte', 'Monte School'),
  ('55555555-5555-5555-5555-555555555555', 'dyatmika-students', 'Dyatmika - Students'),
  ('66666666-6666-6666-6666-666666666666', 'dyatmika-staff', 'Dyatmika - Staff');

-- CCS levels
insert into school_levels (id, school_id, name, sort_order) values
  ('aaaa0001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Primary', 1),
  ('aaaa0002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Secondary', 2);

-- CCS prices
insert into prices (school_id, level_id, item_type, price_idr) values
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001', 'lunch', 45000),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001', 'snack', 15000),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0001-0000-0000-0000-000000000001', 'juice', 15000),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000002', 'lunch', 50000),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000002', 'snack', 15000),
  ('11111111-1111-1111-1111-111111111111', 'aaaa0002-0000-0000-0000-000000000002', 'juice', 15000);

-- CCS Term 4 2026
insert into terms (id, school_id, name, start_date, end_date) values
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Term 4 2026', '2026-04-06', '2026-06-12');

-- CCS holidays
insert into holidays (school_id, date, name) values
  ('11111111-1111-1111-1111-111111111111', '2026-05-01', 'Labour Day'),
  ('11111111-1111-1111-1111-111111111111', '2026-05-14', 'Ascension Day');

-- CCS Daily Available
insert into daily_available (school_id, code, name, description, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'A', 'Pasta Pesto', 'Spaghetti/Fusilli/Fettuccine with pesto sauce', 1),
  ('11111111-1111-1111-1111-111111111111', 'B', 'Bolognaise Pasta', 'Spaghetti/Fusilli/Fettuccine with bolognaise sauce', 2),
  ('11111111-1111-1111-1111-111111111111', 'C', 'Ham and Cheese Sandwich', 'With French fries and steamed vegetables', 3),
  ('11111111-1111-1111-1111-111111111111', 'D', 'Grilled Chicken Sandwich', 'With French fries and steamed vegetables', 4),
  ('11111111-1111-1111-1111-111111111111', 'E', 'Nasi Goreng (Chicken)', 'Indonesian stir fried rice with chicken', 5),
  ('11111111-1111-1111-1111-111111111111', 'F', 'Nasi Goreng (Vegetarian)', 'Indonesian stir fried rice with vegetables', 6),
  ('11111111-1111-1111-1111-111111111111', 'G', 'Mie Goreng (Chicken)', 'Indonesian stir fried noodles with chicken', 7),
  ('11111111-1111-1111-1111-111111111111', 'H', 'Chicken Schnitzel', 'With French fries and vegetables', 8),
  ('11111111-1111-1111-1111-111111111111', 'I', 'Beef Burger', 'Homemade burger patty with fries', 9),
  ('11111111-1111-1111-1111-111111111111', 'J', 'Mac and Cheese', 'Creamy macaroni with cheese sauce', 10),
  ('11111111-1111-1111-1111-111111111111', 'K', 'Pizza Margherita', 'With tomato sauce and mozzarella', 11),
  ('11111111-1111-1111-1111-111111111111', 'L', 'Hot Dog', 'With French fries and coleslaw', 12),
  ('11111111-1111-1111-1111-111111111111', 'M', 'Soto Ayam', 'Indonesian chicken soup', 13),
  ('11111111-1111-1111-1111-111111111111', 'N', 'Vegetarian Sushi', 'Fresh vegetarian sushi rolls', 14),
  ('11111111-1111-1111-1111-111111111111', 'O', 'Ikan Bakar Tuna', 'Grilled tuna with steamed rice and vegetables', 15);

-- CCS Snacks
insert into snacks (school_id, name, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Edamame', 1),
  ('11111111-1111-1111-1111-111111111111', 'Fruit Bowl', 2),
  ('11111111-1111-1111-1111-111111111111', 'Pancake', 3),
  ('11111111-1111-1111-1111-111111111111', 'Waffle', 4),
  ('11111111-1111-1111-1111-111111111111', 'Muffin', 5),
  ('11111111-1111-1111-1111-111111111111', 'Pop Corn', 6),
  ('11111111-1111-1111-1111-111111111111', 'Jaffle', 7),
  ('11111111-1111-1111-1111-111111111111', 'Pretzel', 8),
  ('11111111-1111-1111-1111-111111111111', 'Gluten-free Cookies', 9),
  ('11111111-1111-1111-1111-111111111111', 'Pizza', 10),
  ('11111111-1111-1111-1111-111111111111', 'Baguette with Cheese and Ground Beef', 11),
  ('11111111-1111-1111-1111-111111111111', 'Cinnamon Roll', 12),
  ('11111111-1111-1111-1111-111111111111', 'Bomboloni', 13),
  ('11111111-1111-1111-1111-111111111111', 'Vegan Brownie', 14),
  ('11111111-1111-1111-1111-111111111111', 'Beef Ham & Cheese Sandwich', 15),
  ('11111111-1111-1111-1111-111111111111', 'Pesto Cheese Sandwich', 16);

-- CCS Juices
insert into juices (school_id, name, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Orange Juice', 1),
  ('11111111-1111-1111-1111-111111111111', 'Lime Juice', 2),
  ('11111111-1111-1111-1111-111111111111', 'Mango Juice', 3),
  ('11111111-1111-1111-1111-111111111111', 'Pineapple Juice', 4),
  ('11111111-1111-1111-1111-111111111111', 'Watermelon Juice', 5),
  ('11111111-1111-1111-1111-111111111111', 'Mix Juice (daily)', 6),
  ('11111111-1111-1111-1111-111111111111', 'Coconut Water', 7),
  ('11111111-1111-1111-1111-111111111111', 'Chocolate Milk', 8),
  ('11111111-1111-1111-1111-111111111111', 'Milk', 9);

-- CCS Menu days (Term 4) - Week 1
insert into menu_days (term_id, school_id, date, menu1_name, menu1_desc, menu2_name, menu2_desc) values
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-06', 'Chicken Cordon Bleu', 'Chicken breast stuffed with turkey ham and cheese, served with French fries and Thousand Island sauce', 'Veg Mie Goreng', 'Indonesian stir fried noodles with vegetable served with pickles and cracker'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-07', 'Pesto Sandwich', 'Ciabata Bread with pesto sauce and cheese, served with french fries and vegetable', 'Indian Butter Chicken', 'Indian butter chicken served with rice, crackers and steamed vegetables'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-08', 'Pizza Margherita', 'Neapolitan pizza with tomato sauce, mozzarella, fresh basil and extra virgin olive oil, served with sauted vegetables', 'Ayam Goreng', 'Indonesian fried chicken, served with sauted vegetables, steamed rice, and mild Sambal Tomate'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-09', 'Beef Bulgogi', 'Beef Bulgogi Korean Style, served with steamed rice and vegetables', 'Tofu Nugget', 'Vegetarian crispy baked tofu nugget served with steam rice, pickles, crackers, tomato ketchup and green veggie'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-10', 'Fish & Chips', 'Crispy fried fish fillet, served with seasonal vegetables and Sauce Remoulade', 'Pineapple Fried Rice', 'Stir fry rice with pineapple and vegetable, served with sunny side up'),
  -- Week 2
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-13', 'Beef Burger', 'Homemade Brioche Burger bun with beef paddy, served with Ranch Dressing, French fries and coleslaw', 'Vegetarian Pad Thai', 'Thai rice noodles with tofu, peanut, bean sprouts, egg and tamarind sauce'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-14', 'Fettuccini Napolitano', 'Fettuccini noodles with homemade tomato sauce and vegetables', 'Traditional Crispy Fried Chicken', 'Traditional crispy fried chicken, served with steamed rice, mild tomato sambal and steamed rice'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-15', 'Vegetable Lasagna', 'Classic baked Italian Lasagna with tomatoes and Mozarella cheese sauce', 'Chicken Teriyaki', 'Grilled Chicken with Teriyaki Sauce, vegetables and steamed rice'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-16', 'Crispy Honey Butter Chicken', 'Loaded with crispy fried chicken glazed with sweet and savoury Honey butter sauce, vegetable and rice', 'Vegetarian Nasi Goreng', 'Indonesian stir-fried rice with vegetables, served with pickles and crackers'),
  ('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-04-17', 'Bean Cheese Quesadillas', 'Tortilla filled with red beans, caramelized onions and cheese, served with tomato salsa, Guacamole and sour cream, French fries and coleslaw', 'Ayam Bakar', 'Grilled chicken Lombok style, served with steamed rice, plecing kangkung and eggplant');
