export const EMAIL_REPRESENTANTE = 'lucianarcsilveira@gmail.com';

// Regra de origem: login da Luciana Silveira = Representante; qualquer outro = Fábrica.
// (O banco aplica a mesma regra no cadastro; aqui é só para exibir.)
export function origemPorEmail(email) {
  return String(email || '').trim().toLowerCase() === EMAIL_REPRESENTANTE ? 'representante' : 'fabrica';
}

export const ROTULO_ORIGEM = { fabrica: 'Fábrica', representante: 'Representante' };
export const ROTULO_STATUS = { ativo: 'Ativo', em_prospeccao: 'Em Prospecção', inativo: 'Inativo' };
export const ROTULO_TIPO = { fisica: 'Física', ecommerce: 'E-commerce' };
export const ROTULO_FORMA = { pix: 'Pix', cartao_credito: 'Cartão de Crédito' };

// Distância mínima (km) entre lojas da mesma cidade
export const DISTANCIA_MINIMA_KM = 8;
