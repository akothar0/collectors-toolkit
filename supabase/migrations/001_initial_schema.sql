create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────
-- LAYER 1: REFERENCE — Canonical card identity
-- ──────────────────────────────────────────────────────
create table cards (
  id uuid primary key default gen_random_uuid(),
  player text not null,
  year int,
  sport text,
  manufacturer text,
  set_name text,
  set_series text,
  card_number text,
  variation text,
  parallel text,
  is_rookie boolean default false,
  is_autograph boolean default false,
  is_patch boolean default false,
  is_memorabilia boolean default false,
  print_run int,
  source text,
  source_id text,
  psa_spec_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique nulls not distinct (player, year, set_name, card_number, parallel)
);

create index idx_cards_player on cards (player);
create index idx_cards_year on cards (year);
create index idx_cards_sport on cards (sport);

-- ──────────────────────────────────────────────────────
-- USERS (synced from Clerk)
-- ──────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────
-- LAYER 3: ACTIVITY — Scanner sessions
-- ──────────────────────────────────────────────────────
create table graded_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  image_url text,
  ocr_cert_number text,
  ocr_grading_company text,
  ocr_confidence text,
  cert_number text,
  grading_company text,
  card_id uuid references cards(id),
  official_grade numeric(3,1),
  grade_description text,
  qualifier_code text,
  autograph_grade numeric(3,1),
  pop_at_grade int,
  pop_with_qualifier int,
  pop_higher int,
  pop_captured_at timestamptz,
  is_dual_cert boolean default false,
  item_status text,
  lookup_source text,
  raw_cert_response jsonb,
  created_at timestamptz default now()
);

create index idx_graded_scans_user on graded_scans (user_id);
create index idx_graded_scans_cert on graded_scans (cert_number);

-- ──────────────────────────────────────────────────────
-- LAYER 3: ACTIVITY — Raw grading sessions
-- ──────────────────────────────────────────────────────
create table raw_grade_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  image_url text,
  card_id uuid references cards(id),
  predicted_grade numeric(3,1),
  sub_centering numeric(3,1),
  sub_corners numeric(3,1),
  sub_edges numeric(3,1),
  sub_surface numeric(3,1),
  confidence text,
  condition_notes text,
  submission_recommended boolean,
  submission_roi_notes text,
  raw_ai_response jsonb,
  created_at timestamptz default now()
);

create index idx_raw_grade_user on raw_grade_sessions (user_id);

-- ──────────────────────────────────────────────────────
-- LAYER 3: ACTIVITY — Import batches + items
-- ──────────────────────────────────────────────────────
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source text,
  file_url text,
  raw_content text,
  total_parsed int default 0,
  total_matched int default 0,
  total_saved int default 0,
  status text default 'pending',
  created_at timestamptz default now()
);

create table import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references import_batches(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  raw_title text,
  raw_price numeric(10,2),
  raw_date date,
  raw_source text,
  parsed_player text,
  parsed_year int,
  parsed_set text,
  parsed_grade numeric(3,1),
  parsed_company text,
  parsed_parallel text,
  parse_confidence text,
  card_id uuid references cards(id),
  review_status text default 'pending',
  collection_card_id uuid,
  created_at timestamptz default now()
);

create index idx_import_items_batch on import_items (batch_id);
create index idx_import_items_user on import_items (user_id);

-- ──────────────────────────────────────────────────────
-- LAYER 2: INSTANCE — User's physical card collection
-- ──────────────────────────────────────────────────────
create table collection_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  card_id uuid references cards(id),
  override_player text,
  override_year int,
  override_set_name text,
  override_parallel text,
  override_card_number text,
  sport text,
  condition_type text not null default 'raw',
  grade numeric(3,1),
  grade_description text,
  qualifier_code text,
  grading_company text,
  cert_number text,
  autograph_grade numeric(3,1),
  sub_grades jsonb,
  pop_at_grade int,
  pop_higher int,
  pop_captured_at timestamptz,
  purchase_price numeric(10,2),
  purchase_date date,
  purchase_source text,
  purchase_url text,
  current_value numeric(10,2),
  value_updated_at timestamptz,
  value_source text,
  front_image_url text,
  back_image_url text,
  scan_id uuid references graded_scans(id),
  grade_session_id uuid references raw_grade_sessions(id),
  import_item_id uuid references import_items(id),
  status text not null default 'owned',
  sold_price numeric(10,2),
  sold_date date,
  sold_to text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table import_items
  add constraint fk_import_items_collection
  foreign key (collection_card_id) references collection_cards(id);

create index idx_collection_user on collection_cards (user_id);
create index idx_collection_card on collection_cards (card_id);
create index idx_collection_status on collection_cards (user_id, status);
create index idx_collection_grade on collection_cards (user_id, grade desc nulls last);
create index idx_collection_sport on collection_cards (user_id, sport);

-- ──────────────────────────────────────────────────────
-- LAYER 4: GOALS — Want list
-- ──────────────────────────────────────────────────────
create table want_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  card_id uuid references cards(id),
  description text not null,
  player text,
  year int,
  set_name text,
  parallel text,
  target_condition text,
  target_grade_min numeric(3,1),
  grading_company text,
  target_price numeric(10,2),
  status text not null default 'active',
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create index idx_want_list_user on want_list (user_id, status);

-- ──────────────────────────────────────────────────────
-- LAYER 4: GOALS — Set completion
-- ──────────────────────────────────────────────────────
create table card_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int,
  sport text,
  manufacturer text,
  total_cards int,
  created_by uuid references users(id),
  is_public boolean default false,
  is_verified boolean default false,
  created_at timestamptz default now()
);

create table collection_set_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  set_id uuid references card_sets(id) on delete cascade,
  cards_owned_count int default 0,
  card_checklist jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, set_id)
);

-- ──────────────────────────────────────────────────────
-- LAYER 5: OPERATIONAL — Rate limiting
-- ──────────────────────────────────────────────────────
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  action text not null,
  date date not null default current_date,
  count int not null default 1,
  unique(user_id, action, date)
);

