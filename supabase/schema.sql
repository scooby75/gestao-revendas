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

-- Ajuste final: somente quem cadastrou a loja pode edita-la (e lancar pedidos e negocios dela)
alter table public.revendas disable trigger revendas_proteger_origem;
update public.revendas set origem = 'representante'; -- lojas existentes em 14/10/2026 eram da Luciana
alter table public.revendas enable trigger revendas_proteger_origem;

drop policy revendas_update_autenticados on public.revendas;
create policy revendas_update_proprio on public.revendas for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy pedidos_insert_autenticados on public.pedidos;
drop policy pedidos_update_autenticados on public.pedidos;
drop policy pedidos_delete_autenticados on public.pedidos;
create policy pedidos_insert_dono_revenda on public.pedidos for insert to authenticated
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy pedidos_update_dono_revenda on public.pedidos for update to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy pedidos_delete_dono_revenda on public.pedidos for delete to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));

drop policy negocios_insert_autenticados on public.negocios_provaveis;
drop policy negocios_update_autenticados on public.negocios_provaveis;
drop policy negocios_delete_autenticados on public.negocios_provaveis;
create policy negocios_insert_dono_revenda on public.negocios_provaveis for insert to authenticated
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy negocios_update_dono_revenda on public.negocios_provaveis for update to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));
create policy negocios_delete_dono_revenda on public.negocios_provaveis for delete to authenticated
  using (exists (select 1 from public.revendas r where r.id = revenda_id and r.user_id = (select auth.uid())));

-- Distancia minima de 8 km entre lojas da mesma cidade/UF (cadastro e mudanca de local)
create or replace function public.validar_distancia_minima_revenda()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_nome text;
  v_km double precision;
begin
  if new.latitude is null or new.longitude is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.latitude is not distinct from old.latitude
     and new.longitude is not distinct from old.longitude
     and lower(trim(new.cidade)) = lower(trim(old.cidade))
     and new.uf = old.uf then
    return new;
  end if;
  select r.nome,
         2 * 6371 * asin(sqrt(
           power(sin(radians(r.latitude - new.latitude) / 2), 2) +
           cos(radians(new.latitude)) * cos(radians(r.latitude)) *
           power(sin(radians(r.longitude - new.longitude) / 2), 2)
         ))
    into v_nome, v_km
    from public.revendas r
   where r.id <> new.id
     and lower(trim(r.cidade)) = lower(trim(new.cidade))
     and r.uf = new.uf
     and r.latitude is not null
     and r.longitude is not null
   order by 2
   limit 1;
  if found and v_km < 8 then
    raise exception 'A loja "%" fica a % km desta. E preciso respeitar 8 km de distancia entre lojas na mesma cidade.',
      v_nome, round(v_km::numeric, 1);
  end if;
  return new;
end;
$$;

create trigger revendas_validar_distancia before insert or update on public.revendas
for each row execute function public.validar_distancia_minima_revenda();

-- Endurecimento (auditoria de seguranca): remove funcao nao usada e valida dados no servidor
drop function if exists public.revendas_na_cidade(text, text, double precision, double precision, uuid);

create or replace function public.cpf_valido(c text) returns boolean language plpgsql immutable set search_path = '' as $$
declare s int; r int; i int;
begin
  if c is null or c !~ '^[0-9]{11}$' or c ~ '^(.)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(c, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> substr(c, 10, 1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(c, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = substr(c, 11, 1)::int;
end; $$;

create or replace function public.cnpj_valido(c text) returns boolean language plpgsql immutable set search_path = '' as $$
declare p1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2]; p2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2]; s int; r int; i int;
begin
  if c is null or c !~ '^[0-9]{14}$' or c ~ '^(.)\1{13}$' then return false; end if;
  s := 0; for i in 1..12 loop s := s + substr(c, i, 1)::int * p1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(c, 13, 1)::int then return false; end if;
  s := 0; for i in 1..13 loop s := s + substr(c, i, 1)::int * p2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(c, 14, 1)::int;
end; $$;

alter table public.revendas
  add constraint revendas_cnpj_digitos check (public.cnpj_valido(cnpj)) not valid,
  add constraint revendas_cpf_digitos check (proprietario_cpf is null or public.cpf_valido(proprietario_cpf)) not valid,
  add constraint revendas_tamanhos check (
    char_length(nome) <= 150 and char_length(logradouro) <= 200
    and (numero is null or char_length(numero) <= 20) and (complemento is null or char_length(complemento) <= 100)
    and (bairro is null or char_length(bairro) <= 100) and char_length(cidade) <= 100
    and (cep is null or char_length(cep) <= 8) and (site is null or char_length(site) <= 200)
    and (instagram is null or char_length(instagram) <= 100) and (whatsapp is null or char_length(whatsapp) <= 30)
    and (proprietario_nome is null or char_length(proprietario_nome) <= 150)) not valid,
  add constraint revendas_latitude_faixa check (latitude is null or latitude between -90 and 90) not valid,
  add constraint revendas_longitude_faixa check (longitude is null or longitude between -180 and 180) not valid;

alter table public.pedidos add constraint pedidos_datas_faixa check (
  data_pedido between date '2000-01-01' and date '2100-01-01'
  and (data_prevista_envio is null or data_prevista_envio between date '2000-01-01' and date '2100-01-01')) not valid;
alter table public.negocios_provaveis add constraint negocios_data_faixa
  check (data_negocio between date '2000-01-01' and date '2100-01-01') not valid;

-- Pacote C da auditoria: acesso restrito a e-mails autorizados
create table public.usuarios_autorizados (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.usuarios_autorizados enable row level security;
create policy usuarios_ve_propria_linha on public.usuarios_autorizados for select to authenticated
  using (email = lower(coalesce((select auth.jwt() ->> 'email'), '')));
-- insert into public.usuarios_autorizados (email) values ('email1@gmail.com'), ('email2@gmail.com');

create or replace function public.eh_autorizado() returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.usuarios_autorizados u where u.email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
revoke all on function public.eh_autorizado() from public, anon;
grant execute on function public.eh_autorizado() to authenticated;

-- As politicas de SELECT/INSERT/UPDATE/DELETE de revendas, pedidos e negocios_provaveis
-- passaram a exigir public.eh_autorizado() alem das regras de dono da loja.
