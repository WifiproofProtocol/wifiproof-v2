alter table events
  add column if not exists poster_image_url text,
  add column if not exists event_description text;
