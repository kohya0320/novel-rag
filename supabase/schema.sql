-- pgvector 拡張を有効化
create extension if not exists vector;

-- novels テーブル
create table if not exists novels (
  id bigserial primary key,
  title text not null,
  author text not null,
  genre text,
  description text,
  reviews text[],
  -- text-embedding-004 の次元数は 768
  embedding vector(768),
  created_at timestamp with time zone default now()
);

-- ベクトル検索用インデックス（IVFFlat: コサイン類似度）
create index if not exists novels_embedding_idx
  on novels using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ベクトル類似検索の関数
create or replace function match_novels(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 5
)
returns table (
  id bigint,
  title text,
  author text,
  genre text,
  description text,
  reviews text[],
  similarity float
)
language sql stable
as $$
  select
    novels.id,
    novels.title,
    novels.author,
    novels.genre,
    novels.description,
    novels.reviews,
    1 - (novels.embedding <=> query_embedding) as similarity
  from novels
  where 1 - (novels.embedding <=> query_embedding) > match_threshold
  order by novels.embedding <=> query_embedding
  limit match_count;
$$;
