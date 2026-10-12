-- Schema do Gestão Revendas (já aplicado no projeto Supabase)
create table public.revendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cnpj text not null,
  nome text not null,
  cep text,
  logradouro text not null,
  numero text,
  complemento text,
  bairro text,
  cidade text not null,
  uf char(2) not null,
  site text,
  instagram text,
  whatsapp text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint revendas_cnpj_formato check (cnpj ~ '^[0-9]{14}$'),
  constraint revendas_cnpj_unico unique (cnpj)
);

create index revendas_cidade_uf_idx on public.revendas (lower(cidade), uf);
create index revendas_user_id_idx on public.revendas (user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger revendas_set_updated_at before update on public.revendas
for each row execute function public.set_updated_at();

alter table public.revendas enable row level security;

create policy revendas_select_autenticados on public.revendas for select to authenticated using (true);
create policy revendas_insert_proprio on public.revendas for insert to authenticated with check (user_id = (select auth.uid()));
create policy revendas_update_proprio on public.revendas for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy revendas_delete_proprio on public.revendas for delete to authenticated using (user_id = (select auth.uid()));
