'use client';

import { useMemo, useState } from 'react';
import { formatCnpj, soDigitos, validarCnpj } from '../lib/cnpj';
import { formatCpf, validarCpf } from '../lib/cpf';
import { infoCidade, fmtKm } from '../lib/geo';
import { origemPorEmail, ROTULO_ORIGEM, DISTANCIA_MINIMA_KM } from '../lib/config';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// A checagem de distância vale no cadastro e, na edição, só se cidade/UF/localização mudaram
function mudouLocal(inicial, f, la, lo) {
  if (!inicial || !inicial.id) return true;
  const perto = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-7;
  return (
    String(inicial.cidade || '').trim().toLowerCase() !== String(f.cidade).trim().toLowerCase() ||
    inicial.uf !== f.uf ||
    !perto(inicial.latitude, la) ||
    !perto(inicial.longitude, lo)
  );
}

async function geocodificar(f) {
  const rua = [f.logradouro, f.numero].filter(Boolean).join(' ');
  const tentativas = [
    { q: [rua, f.bairro, f.cidade, f.uf, 'Brasil'].filter(Boolean).join(', '), aprox: false },
    { q: [f.logradouro, f.cidade, f.uf, 'Brasil'].filter(Boolean).join(', '), aprox: false },
    { q: [f.cidade, f.uf, 'Brasil'].filter(Boolean).join(', '), aprox: true },
  ];
  for (let i = 0; i < tentativas.length; i++) {
    if (i > 0) await espera(1100);
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=' + encodeURIComponent(tentativas[i].q)
      );
      const json = await res.json();
      if (json && json[0]) {
        return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon), aprox: tentativas[i].aprox };
      }
    } catch (e) {
      // tenta a próxima
    }
  }
  return null;
}

export default function RevendaForm({ inicial, revendas, emailUsuario, aoSalvar, aoCancelar, aoLocalizar }) {
  const [f, setF] = useState({
    cnpj: formatCnpj((inicial && inicial.cnpj) || ''),
    nome: (inicial && inicial.nome) || '',
    tipo_loja: (inicial && inicial.tipo_loja) || 'fisica',
    status: (inicial && inicial.status) || 'ativo',
    proprietario_nome: (inicial && inicial.proprietario_nome) || '',
    proprietario_cpf: formatCpf((inicial && inicial.proprietario_cpf) || ''),
    cep: (inicial && inicial.cep) || '',
    logradouro: (inicial && inicial.logradouro) || '',
    numero: (inicial && inicial.numero) || '',
    complemento: (inicial && inicial.complemento) || '',
    bairro: (inicial && inicial.bairro) || '',
    cidade: (inicial && inicial.cidade) || '',
    uf: (inicial && inicial.uf) || '',
    site: (inicial && inicial.site) || '',
    instagram: (inicial && inicial.instagram) || '',
    whatsapp: (inicial && inicial.whatsapp) || '',
    latitude: inicial && inicial.latitude != null ? inicial.latitude : '',
    longitude: inicial && inicial.longitude != null ? inicial.longitude : '',
  });
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aprox, setAprox] = useState(false);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const lat = f.latitude === '' ? NaN : parseFloat(String(f.latitude).replace(',', '.'));
  const lng = f.longitude === '' ? NaN : parseFloat(String(f.longitude).replace(',', '.'));
  const nlat = Number.isFinite(lat) ? lat : null;
  const nlng = Number.isFinite(lng) ? lng : null;
  const idAtual = inicial && inicial.id;
  const origem = idAtual ? inicial.origem : origemPorEmail(emailUsuario);

  const outras = useMemo(
    () => infoCidade(revendas, { id: idAtual, cidade: f.cidade, uf: f.uf, latitude: nlat, longitude: nlng }),
    [revendas, idAtual, f.cidade, f.uf, nlat, nlng]
  );
  const muitoPerto = outras.filter((o) => o.distancia_km != null && o.distancia_km < DISTANCIA_MINIMA_KM);
  const verificar = mudouLocal(inicial, f, nlat, nlng);

  async function aoSairCnpj() {
    const d = soDigitos(f.cnpj);
    if (d.length !== 14 || !validarCnpj(d) || f.nome) return;
    try {
      const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d);
      if (!r.ok) return;
      const j = await r.json();
      setF((p) => ({
        ...p,
        nome: p.nome || j.nome_fantasia || j.razao_social || '',
        cep: p.cep || (j.cep ? String(j.cep) : ''),
        logradouro: p.logradouro || [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' '),
        numero: p.numero || j.numero || '',
        bairro: p.bairro || j.bairro || '',
        cidade: p.cidade || j.municipio || '',
        uf: p.uf || j.uf || '',
      }));
    } catch (e) {
      // preenchimento automático é opcional
    }
  }

  async function aoSairCep() {
    const d = soDigitos(f.cep);
    if (d.length !== 8) return;
    try {
      const r = await fetch('https://viacep.com.br/ws/' + d + '/json/');
      const j = await r.json();
      if (j.erro) return;
      setF((p) => ({
        ...p,
        logradouro: j.logradouro || p.logradouro,
        bairro: j.bairro || p.bairro,
        cidade: j.localidade || p.cidade,
        uf: j.uf || p.uf,
      }));
    } catch (e) {
      // preenchimento automático é opcional
    }
  }

  async function localizar() {
    setErro('');
    setMsg('');
    if (!f.cidade || !f.uf) {
      setErro('Informe cidade e UF para localizar no mapa.');
      return null;
    }
    setBuscando(true);
    const r = await geocodificar(f);
    setBuscando(false);
    if (!r) {
      setErro('Não foi possível localizar o endereço. Preencha latitude e longitude manualmente.');
      return null;
    }
    setF((p) => ({ ...p, latitude: r.lat.toFixed(6), longitude: r.lng.toFixed(6) }));
    setAprox(r.aprox);
    if (aoLocalizar) aoLocalizar({ lat: r.lat, lng: r.lng });
    setMsg(
      r.aprox
        ? 'Endereço exato não encontrado: pin colocado no centro da cidade. Ajuste a latitude e a longitude se precisar.'
        : 'Endereço localizado no mapa.'
    );
    return r;
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    const cnpj = soDigitos(f.cnpj);
    if (!validarCnpj(cnpj)) return setErro('CNPJ inválido.');
    if (!f.nome.trim() || !f.logradouro.trim() || !f.cidade.trim() || !f.uf) {
      return setErro('Preencha nome, logradouro, cidade e UF.');
    }
    const cpf = soDigitos(f.proprietario_cpf);
    if (cpf && !validarCpf(cpf)) return setErro('CPF do proprietário inválido.');
    setSalvando(true);
    let la = nlat;
    let lo = nlng;
    let aproxAtual = aprox;
    if (la == null || lo == null) {
      const r = await localizar();
      if (r) {
        la = r.lat;
        lo = r.lng;
        aproxAtual = r.aprox;
      }
    }
    if (mudouLocal(inicial, f, la, lo)) {
      const vizinhas = infoCidade(revendas, { id: idAtual, cidade: f.cidade, uf: f.uf, latitude: la, longitude: lo });
      if (vizinhas.length > 0) {
        if (la == null || lo == null || aproxAtual) {
          setSalvando(false);
          return setErro(
            'Não foi possível confirmar a distância mínima de ' + DISTANCIA_MINIMA_KM + ' km: já existem lojas em ' +
              f.cidade + '/' + f.uf + ' e o endereço não foi localizado com precisão. Corrija o endereço ou informe a latitude e a longitude exatas.'
          );
        }
        const perto = vizinhas.find((v) => v.distancia_km != null && v.distancia_km < DISTANCIA_MINIMA_KM);
        if (perto) {
          setSalvando(false);
          return setErro(
            'Esta loja fica a ' + fmtKm(perto.distancia_km) + ' da loja "' + perto.nome + '". É preciso respeitar ' +
              DISTANCIA_MINIMA_KM + ' km de distância entre lojas na mesma cidade.'
          );
        }
      }
    }
    const nulo = (v) => (v && String(v).trim() ? String(v).trim() : null);
    const payload = {
      cnpj,
      nome: f.nome.trim(),
      tipo_loja: f.tipo_loja,
      status: f.status,
      proprietario_nome: nulo(f.proprietario_nome),
      proprietario_cpf: cpf || null,
      cep: nulo(soDigitos(f.cep)),
      logradouro: f.logradouro.trim(),
      numero: nulo(f.numero),
      complemento: nulo(f.complemento),
      bairro: nulo(f.bairro),
      cidade: f.cidade.trim(),
      uf: f.uf.toUpperCase(),
      site: nulo(f.site),
      instagram: nulo(f.instagram),
      whatsapp: nulo(f.whatsapp),
      latitude: la,
      longitude: lo,
    };
    const erroSalvar = await aoSalvar(payload, idAtual);
    setSalvando(false);
    if (erroSalvar) setErro(erroSalvar);
  }

  return (
    <form className="form" onSubmit={enviar}>
      <label>
        CNPJ *
        <input value={f.cnpj} onChange={(e) => setF((p) => ({ ...p, cnpj: formatCnpj(e.target.value) }))} onBlur={aoSairCnpj} placeholder="00.000.000/0000-00" inputMode="numeric" />
      </label>
      <label>
        Nome da loja *
        <input value={f.nome} onChange={set('nome')} />
      </label>
      <div className="linha">
        <label>
          Tipo de loja *
          <select value={f.tipo_loja} onChange={set('tipo_loja')}>
            <option value="fisica">Física</option>
            <option value="ecommerce">E-commerce</option>
          </select>
        </label>
        <label>
          Status *
          <select value={f.status} onChange={set('status')}>
            <option value="ativo">Ativo</option>
            <option value="em_prospeccao">Em Prospecção</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>
      </div>
      <div className="caixa info">
        Pertence a: <strong>{ROTULO_ORIGEM[origem] || 'Fábrica'}</strong>
        {idAtual ? '' : ' (definido automaticamente pelo seu login)'}
      </div>
      <div className="linha">
        <label>
          Proprietário - Nome
          <input value={f.proprietario_nome} onChange={set('proprietario_nome')} />
        </label>
        <label>
          Proprietário - CPF
          <input
            value={f.proprietario_cpf}
            onChange={(e) => setF((p) => ({ ...p, proprietario_cpf: formatCpf(e.target.value) }))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </label>
      </div>
      <div className="linha">
        <label>
          CEP
          <input value={f.cep} onChange={set('cep')} onBlur={aoSairCep} placeholder="00000000" inputMode="numeric" />
        </label>
        <label>
          UF *
          <select value={f.uf} onChange={set('uf')}>
            <option value="">Selecione</option>
            {UFS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="linha3">
        <label>
          Logradouro *
          <input value={f.logradouro} onChange={set('logradouro')} />
        </label>
        <label>
          Número
          <input value={f.numero} onChange={set('numero')} />
        </label>
      </div>
      <div className="linha">
        <label>
          Complemento
          <input value={f.complemento} onChange={set('complemento')} />
        </label>
        <label>
          Bairro
          <input value={f.bairro} onChange={set('bairro')} />
        </label>
      </div>
      <label>
        Cidade *
        <input value={f.cidade} onChange={set('cidade')} />
      </label>
      <label>
        Site
        <input value={f.site} onChange={set('site')} placeholder="www.loja.com.br" />
      </label>
      <div className="linha">
        <label>
          Instagram
          <input value={f.instagram} onChange={set('instagram')} placeholder="@loja" />
        </label>
        <label>
          WhatsApp
          <input value={f.whatsapp} onChange={set('whatsapp')} placeholder="(83) 99999-9999" inputMode="tel" />
        </label>
      </div>

      <div className="linha">
        <label>
          Latitude
          <input value={f.latitude} onChange={(e) => { setAprox(false); set('latitude')(e); }} placeholder="automática" />
        </label>
        <label>
          Longitude
          <input value={f.longitude} onChange={(e) => { setAprox(false); set('longitude')(e); }} placeholder="automática" />
        </label>
      </div>
      <button type="button" className="btn sec" onClick={localizar} disabled={buscando}>
        {buscando ? 'Localizando…' : '📍 Localizar endereço no mapa'}
      </button>

      {msg && <div className="caixa info">{msg}</div>}

      {f.cidade && f.uf ? (
        outras.length === 0 ? (
          <div className="caixa ok">Não existe revenda cadastrada em {f.cidade}/{f.uf}.</div>
        ) : (
          <div className={'caixa ' + (muitoPerto.length > 0 && verificar ? 'erro' : 'alerta')}>
            {muitoPerto.length > 0 && verificar && (
              <div style={{ marginBottom: 6 }}>
                <strong>Distância mínima não respeitada:</strong> as lojas na mesma cidade precisam ficar a pelo menos {DISTANCIA_MINIMA_KM} km uma da outra.
              </div>
            )}
            {muitoPerto.length > 0 && !verificar && (
              <div style={{ marginBottom: 6 }}>
                Esta loja já está a menos de {DISTANCIA_MINIMA_KM} km de outra (cadastro anterior à regra).
              </div>
            )}
            {aprox && (
              <div style={{ marginBottom: 6 }}>
                Localização aproximada (centro da cidade): a distância abaixo não é confiável.
              </div>
            )}
            Já existe(m) {outras.length} revenda(s) em {f.cidade}/{f.uf}. Mais próxima: <strong>{outras[0].nome}</strong> ({fmtKm(outras[0].distancia_km)}).
            <ul>
              {outras.map((o) => (
                <li key={o.id} style={o.distancia_km != null && o.distancia_km < DISTANCIA_MINIMA_KM ? { fontWeight: 700 } : undefined}>
                  {o.nome} — {fmtKm(o.distancia_km)}
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}

      {erro && <div className="caixa erro">{erro}</div>}

      <div className="acoes">
        <button type="submit" className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button type="button" className="btn sec" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
