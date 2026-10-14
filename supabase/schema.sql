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

-- Pedidos de cada revenda (aba "Pedidos")
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  revenda_id uuid not null references public.revendas(id) on delete cascade,
  data_pedido date not null,
  forma_pagamento text not null check (forma_pagamento in ('pix', 'cartao_credito')),
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);

create index pedidos_revenda_id_idx on public.pedidos (revenda_id, data_pedido desc);

alter table public.pedidos enable row level security;

create policy pedidos_select_autenticados on public.pedidos for select to authenticated using (true);
create policy pedidos_insert_dono_revenda on public.pedidos for insert to authenticated
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy pedidos_update_dono_revenda on public.pedidos for update to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy pedidos_delete_dono_revenda on public.pedidos for delete to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));

-- Novos campos do cadastro da loja
alter table public.revendas
  add column tipo_loja text not null default 'fisica' check (tipo_loja in ('fisica', 'ecommerce')),
  add column status text not null default 'ativo' check (status in ('ativo', 'em_prospeccao', 'inativo')),
  add column proprietario_nome text,
  add column proprietario_cpf text check (proprietario_cpf is null or proprietario_cpf ~ '^[0-9]{11}$'),
  add column origem text not null default 'fabrica' check (origem in ('fabrica', 'representante'));

-- Origem definida pelo login no cadastro (lucianarcsilveira@gmail.com = representante); nao muda depois
create or replace function public.proteger_origem_revenda()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.origem := case
      when lower(coalesce(auth.jwt() ->> 'email', '')) = 'lucianarcsilveira@gmail.com' then 'representante'
      else 'fabrica'
    end;
  else
    new.origem := old.origem;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create trigger revendas_proteger_origem before insert or update on public.revendas
for each row execute function public.proteger_origem_revenda();

-- Usuarios logados editam lojas; excluir loja continua restrito ao dono
drop policy revendas_update_proprio on public.revendas;
create policy revendas_update_autenticados on public.revendas for update to authenticated using (true) with check (true);

alter table public.pedidos add column data_prevista_envio date;
drop policy pedidos_insert_dono_revenda on public.pedidos;
drop policy pedidos_update_dono_revenda on public.pedidos;
drop policy pedidos_delete_dono_revenda on public.pedidos;
create policy pedidos_insert_autenticados on public.pedidos for insert to authenticated with check (true);
create policy pedidos_update_autenticados on public.pedidos for update to authenticated using (true) with check (true);
create policy pedidos_delete_autenticados on public.pedidos for delete to authenticated using (true);

create table public.negocios_provaveis (
  id uuid primary key default gen_random_uuid(),
  revenda_id uuid not null references public.revendas(id) on delete cascade,
  data_negocio date not null,
  valor numeric(12,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);
create index negocios_provaveis_revenda_id_idx on public.negocios_provaveis (revenda_id, data_negocio desc);
alter table public.negocios_provaveis enable row level security;
create policy negocios_select_autenticados on public.negocios_provaveis for select to authenticated using (true);
create policy negocios_insert_autenticados on public.negocios_provaveis for insert to authenticated with check (true);
create policy negocios_update_autenticados on public.negocios_provaveis for update to authenticated using (true) with check (true);
create policy negocios_delete_autenticados on public.negocios_provaveis for delete to authenticated using (true);
