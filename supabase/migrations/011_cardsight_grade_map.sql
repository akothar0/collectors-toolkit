-- CardSight grade UUID lookup (avoid rebuilding from API on every refresh)

create table cardsight_grade_map (
  company text not null,
  grade numeric(4,1) not null,
  grade_id text not null,
  updated_at timestamptz not null default now(),
  primary key (company, grade)
);

create index idx_cardsight_grade_map_grade_id on cardsight_grade_map (grade_id);
