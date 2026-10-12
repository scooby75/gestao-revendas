# Gestão Revendas

Sistema de gestão de revendas (lojas): login com Google, cadastro com CNPJ, endereço completo, site, Instagram e WhatsApp, aviso de revendas já existentes na cidade (com distância) e mapa com pin de cada loja.

Stack: Next.js 14, Supabase (Auth + Postgres), Leaflet/OpenStreetMap, Vercel.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Rodar localmente

    npm install
    npm run dev

## Banco

O schema está em `supabase/schema.sql`.

## Login com Google

1. No Google Cloud, crie um OAuth Client ID (tipo Web) e adicione como URI de redirecionamento `https://xxqnlmlmkamjkwebukkk.supabase.co/auth/v1/callback`.
2. No Supabase: Authentication > Providers > Google, ative e informe Client ID e Secret.
3. No Supabase: Authentication > URL Configuration, defina Site URL com a URL do app na Vercel e adicione a mesma URL (e `http://localhost:3000`) em Redirect URLs.
