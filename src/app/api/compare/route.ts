import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import * as XLSX from 'xlsx';

interface Metricas {
  cpc: number;
  cpm: number;
  roas: number;
  leads: number;
  custo: number;
  conversoes: number;
}

interface ResultadoComparacao {
  meta: Metricas;
  real: Metricas;
  diferenca: Metricas;
  percentual: Metricas;
}

interface CampanhaMeta {
  nome: string;
  inicio: string;
  resultados: number;
}

interface LeadComparacao {
  data_chegada: string;
  atividade_atual: string;
}

interface LinhaComparativa {
  nome: string;
  inicio: string;
  resultados: number;
  leads: number;
  detalhes: LeadComparacao[];
}

function extrairMetricas(worksheet: XLSX.WorkSheet): Metricas {
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Função auxiliar para somar coluna, mesmo se não existir
  const somaColuna = (nome: string) =>
    data.reduce((acc: number, row: any) => acc + (Number(row[nome]) || 0), 0);

  const custo = somaColuna('Custo');
  const conversoes = somaColuna('Conversões');
  const impressoes = somaColuna('Impressões');
  const cliques = somaColuna('Cliques');
  const valor_conversoes = somaColuna('Valor das conversões');

  return {
    cpc: cliques ? custo / cliques : 0,
    cpm: impressoes ? (custo / impressoes) * 1000 : 0,
    roas: custo ? valor_conversoes / custo : 0,
    leads: conversoes,
    custo,
    conversoes: valor_conversoes,
  };
}

function extrairLinhasChave(worksheet: XLSX.WorkSheet) {
  const data = XLSX.utils.sheet_to_json(worksheet);
  // Nomes das colunas conforme a planilha enviada
  return data.map((row: any) => ({
    'Inicio dos relatorios': row['Início dos relatórios'] || row['Inicio dos relatorios'] || '',
    'Nome da campanha': row['Nome da campanha'] || '',
    'Resultados': row['Resultados'] || 0,
  }));
}

// Função para normalizar strings para comparação
function normalizar(str: string) {
  return (str || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim().toLowerCase();
}

function extrairMeta(sheet: any[]): { nome: string, inicio: string, resultados: number, custo_por_resultados: number }[] {
  return sheet.map((row) => ({
    nome: row['Nome da campanha'],
    inicio: row['Início dos relatórios'],
    resultados: Number(row['Resultados']) || 0,
    custo_por_resultados: Number(row['Custo por resultados']) || 0,
  })).filter((row) => row.nome && row.inicio);
}

function extrairLeads(sheet: any[]): { titulo: string, data_chegada: string, atividade_atual: string }[] {
  return sheet.map((row) => ({
    titulo: row['Título'],
    data_chegada: row['Data de chegada'],
    atividade_atual: row['Atividade atual'],
  })).filter((row) => row.titulo);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const metaFiles = formData.getAll('files[]');
    const comparacaoFile = formData.get('comparacao');
    if (!metaFiles || metaFiles.length !== 4 || !comparacaoFile) {
      return new Response(JSON.stringify({ error: 'Envie 4 relatórios do Meta e 1 planilha de comparação.' }), { status: 400 });
    }

    // Carregar arquivos em memória
    const bufferFromFile = async (file: any) => Buffer.from(await file.arrayBuffer());
    const xlsx = require('xlsx');

    // Extrair dados dos 4 relatórios do Meta
    let campanhasMeta: { nome: string, inicio: string, resultados: number, custo_por_resultados: number, origem: string }[] = [];
    let fileIndex = 1;
    for (const file of metaFiles) {
      const buf = await bufferFromFile(file);
      const workbook = xlsx.read(buf, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = xlsx.utils.sheet_to_json(sheet);
      // Adiciona a propriedade origem
      const metaComOrigem = extrairMeta(json).map((linha: any) => ({ ...linha, origem: `meta${fileIndex}` }));
      campanhasMeta = campanhasMeta.concat(metaComOrigem);
      fileIndex++;
    }

    // Extrair leads da planilha de comparação
    const bufComp = await bufferFromFile(comparacaoFile);
    const workbookComp = xlsx.read(bufComp, { type: 'buffer' });
    const sheetComp = workbookComp.Sheets[workbookComp.SheetNames[0]];
    const leads = extrairLeads(xlsx.utils.sheet_to_json(sheetComp));

    // Debug: listar todos os títulos que começam com [4219] após normalização
    const debugLeads4219 = leads.filter(l => normalizar(l.titulo).startsWith('[4219]')).map(l => ({ original: l.titulo, normalizado: normalizar(l.titulo) }));

    // Montar linhas comparativas para todas as campanhas do Meta
    const nomesCampanhas = Array.from(new Set(campanhasMeta.map(c => c.nome)));
    const linhas = nomesCampanhas.map((nome) => {
      const meta = campanhasMeta.find(c => c.nome === nome);
      const nomeNorm = normalizar(nome);
      let leadsCampanha: any[] = [];
      // Bloquear nomes genéricos exatos
      if (nomeNorm === normalizar('villa gavea')) {
        leadsCampanha = [];
      } else if (nomeNorm.includes(normalizar('reserva dos passaros cod 4219'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[4219]'));
      } else if (nomeNorm.includes(normalizar('villa gávea cod 2772')) || nomeNorm.includes(normalizar('villa gavea cod 2772'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[2772]'));
      } else if (nomeNorm.includes(normalizar('villas do parque 2123'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[2123]'));
      } else if (nomeNorm.includes(normalizar('village merces cod 1377'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[1377]'));
      } else if (nomeNorm.includes(normalizar('felicita 1643'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[1643]'));
      } else if (nomeNorm.includes(normalizar('casa no cyrela ii'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[1031]'));
      } else if (nomeNorm.includes(normalizar('edificio boulevard 6162'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[6162]'));
      } else if (nomeNorm.includes(normalizar('casa b olinda'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).startsWith('[3593]'));
      } else if (nomeNorm.includes(normalizar('casa no pacaembu cod 1054'))) {
        leadsCampanha = leads.filter(l => normalizar(l.titulo).includes('leaddewhatsapp'));
      } else {
        // Busca padrão: campanhas genéricas não puxam leads de campanhas especiais
        const regexCodigo = /^\[\d{3,}\]/;
        if (!regexCodigo.test(nomeNorm)) {
          leadsCampanha = leads.filter(l => {
            const tituloNorm = normalizar(l.titulo);
            // Não contar se o título começa com [número]
            return !/^\[\d{3,}\]/.test(tituloNorm) && tituloNorm.includes(nomeNorm);
          });
        } else {
          // Caso padrão para outros nomes
          leadsCampanha = leads.filter(l => normalizar(l.titulo).includes(nomeNorm));
        }
      }
      const detalhes = leadsCampanha.map(l => ({ data_chegada: l.data_chegada, atividade_atual: l.atividade_atual, titulo: l.titulo }));
      const visitas_agendadas = detalhes.filter(d => d.atividade_atual === 'Visita Agendada').length;
      return {
        nome,
        nomeNorm,
        inicio: meta?.inicio || '-',
        resultados: meta?.resultados || 0,
        custo_por_resultados: meta?.custo_por_resultados || 0,
        leads: leadsCampanha.length,
        visitas_agendadas,
        detalhes,
        origem: meta?.origem || 'comparacao',
      };
    });

    // Calcular totais
    const totais = {
      resultados: linhas.reduce((acc, l) => acc + (l.resultados || 0), 0),
      leads: linhas.reduce((acc, l) => acc + (l.leads || 0), 0)
    };

    return new Response(JSON.stringify({ linhas, debugLeads4219, totais }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Erro ao processar arquivos.' }), { status: 500 });
  }
} 