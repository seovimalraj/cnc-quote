-- Ensure manual review rules support typed guardrail metadata for pricing escalations
alter table if exists public.manual_review_rules
  add column if not exists "type" text not null default 'price';

alter table if exists public.manual_review_rules
  add column if not exists priority integer;

alter table if exists public.manual_review_rules
  alter column priority set default 3;

alter table if exists public.manual_review_rules
  add column if not exists conditions jsonb not null default '{}'::jsonb;

-- Backfill any legacy rows to the new defaults
update public.manual_review_rules
  set "type" = coalesce("type", 'price');

update public.manual_review_rules
  set priority = coalesce(priority, 3);

update public.manual_review_rules
  set conditions = coalesce(conditions, '{}'::jsonb);
