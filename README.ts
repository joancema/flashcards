/*

create table flashcards (
  id bigint primary key generated always as identity,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table categories (
  id bigint primary key generated always as identity,
  name text not null unique
);

create table flashcard_categories (
  flashcard_id bigint references flashcards (id) on delete cascade,
  category_id bigint references categories (id) on delete cascade,
  primary key (flashcard_id, category_id)
);

alter table flashcards
add column image_url text;

create table flashcard_views (
  id bigint primary key generated always as identity,
  flashcard_id bigint references flashcards (id) on delete cascade,
  viewed_at timestamp with time zone default now()
);
*/ 