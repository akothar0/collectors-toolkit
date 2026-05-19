create table if not exists collection_card_images (
  id uuid primary key default gen_random_uuid(),
  collection_card_id uuid not null references collection_cards(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  image_url text not null,
  position int not null check (position >= 0),
  created_at timestamptz default now()
);

create unique index if not exists idx_collection_card_images_card_position
  on collection_card_images (collection_card_id, position);

create index if not exists idx_collection_card_images_user
  on collection_card_images (user_id, collection_card_id);

insert into collection_card_images (collection_card_id, user_id, image_url, position)
select cc.id, cc.user_id, cc.front_image_url, 0
from collection_cards cc
where cc.front_image_url is not null
  and not exists (
    select 1
    from collection_card_images cci
    where cci.collection_card_id = cc.id
      and cci.position = 0
  );

insert into collection_card_images (collection_card_id, user_id, image_url, position)
select cc.id, cc.user_id, cc.back_image_url, 1
from collection_cards cc
where cc.back_image_url is not null
  and not exists (
    select 1
    from collection_card_images cci
    where cci.collection_card_id = cc.id
      and cci.position = 1
  );

with ranked_images as (
  select
    cci.collection_card_id,
    cci.image_url,
    row_number() over (
      partition by cci.collection_card_id
      order by cci.position asc, cci.created_at asc, cci.id asc
    ) - 1 as next_position
  from collection_card_images cci
),
first_images as (
  select distinct on (collection_card_id)
    collection_card_id,
    image_url
  from ranked_images
  order by collection_card_id, next_position asc
),
second_images as (
  select
    collection_card_id,
    image_url
  from ranked_images
  where next_position = 1
)
update collection_card_images cci
set position = ranked.next_position
from ranked_images ranked
where ranked.collection_card_id = cci.collection_card_id
  and ranked.image_url = cci.image_url
  and cci.position <> ranked.next_position;

with ranked_images as (
  select
    cci.collection_card_id,
    cci.image_url,
    row_number() over (
      partition by cci.collection_card_id
      order by cci.position asc, cci.created_at asc, cci.id asc
    ) - 1 as next_position
  from collection_card_images cci
),
first_images as (
  select distinct on (collection_card_id)
    collection_card_id,
    image_url
  from ranked_images
  order by collection_card_id, next_position asc
),
second_images as (
  select
    collection_card_id,
    image_url
  from ranked_images
  where next_position = 1
)
update collection_cards cc
set
  front_image_url = first_images.image_url,
  back_image_url = second_images.image_url
from first_images
left join second_images
  on second_images.collection_card_id = first_images.collection_card_id
where cc.id = first_images.collection_card_id;

update collection_cards
set front_image_url = null,
    back_image_url = null
where id not in (select distinct collection_card_id from collection_card_images);

alter table collection_card_images enable row level security;

drop policy if exists "deny_anon_collection_card_images" on collection_card_images;
drop policy if exists "deny_authenticated_collection_card_images" on collection_card_images;

create policy "deny_anon_collection_card_images"
  on collection_card_images for all to anon using (false);

create policy "deny_authenticated_collection_card_images"
  on collection_card_images for all to authenticated using (false);
