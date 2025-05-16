'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Typography, Paper, Button, Grid } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Home as HomeIcon, TableChart, BarChart, Settings, FileUpload, Assessment, Warning, People } from '@mui/icons-material';
import * as XLSX from 'xlsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

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

interface LinhaCampanha {
  'Inicio dos relatorios': string;
  'Nome da campanha': string;
  'Resultados': number;
}

interface ResultadoComparacaoSimples {
  meta: LinhaCampanha[];
  real: LinhaCampanha[];
}

export default function Home() {
  const [metaFiles, setMetaFiles] = useState<File[]>([]);
  const [comparacaoFile, setComparacaoFile] = useState<File | null>(null);
  const [resultados, setResultados] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [detalhesAbertos, setDetalhesAbertos] = useState<string | null>(null);
  const tabelaRef = useRef<HTMLDivElement>(null);

  // Dropzone para os 4 relatórios do Meta
  const { getRootProps: getMetaRootProps, getInputProps: getMetaInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 4,
    onDrop: (acceptedFiles) => {
      setMetaFiles(acceptedFiles);
      setResultados(null);
      setErro(null);
    },
  });

  // Dropzone para a planilha de comparação
  const { getRootProps: getCompRootProps, getInputProps: getCompInputProps } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setComparacaoFile(acceptedFiles[0] || null);
      setResultados(null);
      setErro(null);
    },
  });

  const handleComparar = async () => {
    if (metaFiles.length !== 4 || !comparacaoFile) {
      setErro('Envie 4 relatórios do Meta e 1 planilha de comparação.');
      return;
    }
    setLoading(true);
    setErro(null);
    setResultados(null);
    const formData = new FormData();
    metaFiles.forEach((file) => formData.append('files[]', file));
    formData.append('comparacao', comparacaoFile);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        setErro(err.error || 'Erro ao processar as planilhas');
        setLoading(false);
        return;
      }
      const data = await response.json();
      setResultados(data);
    } catch (error) {
      setErro('Erro ao processar arquivos.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll automático para a tabela quando resultados mudam
  useEffect(() => {
    if (resultados && tabelaRef.current) {
      tabelaRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [resultados]);

  const formatarMetrica = (valor: number, tipo: string) => {
    switch (tipo) {
      case 'cpc':
      case 'cpm':
      case 'custo':
        return `R$ ${valor.toFixed(2)}`;
      case 'roas':
        return `${valor.toFixed(2)}x`;
      case 'leads':
      case 'conversoes':
        return valor.toFixed(0);
      default:
        return valor.toFixed(2);
    }
  };

  const getCorMetrica = (valor: number, tipo: string) => {
    if (tipo === 'cpc' || tipo === 'cpm' || tipo === 'custo') {
      return valor > 0 ? 'error.main' : 'success.main';
    }
    return valor > 0 ? 'success.main' : 'error.main';
  };

  // Calcular totais (restaurado)
  const totalMeta = resultados?.linhas?.reduce((acc: number, l: any) => acc + (Number(l.resultados) || 0), 0) || 0;
  const totalLeads = resultados?.linhas?.reduce((acc: number, l: any) => acc + (Number(l.leads) || 0), 0) || 0;
  const totalDiferenca = totalLeads - totalMeta;
  const totalVisitasAgendadas = resultados?.linhas?.reduce((acc: number, l: any) => acc + (Number(l.visitas_agendadas) || 0), 0) || 0;

  // Função para exportar para Excel
  const handleExportar = () => {
    if (!resultados?.linhas || resultados.linhas.length === 0) return;
    // Agrupar por origem
    const grupos: { [origem: string]: any[] } = {};
    resultados.linhas.forEach((linha: any) => {
      const origem = linha.origem || 'comparacao';
      if (!grupos[origem]) grupos[origem] = [];
      grupos[origem].push(linha);
    });
    const ordem = Object.keys(grupos).sort((a, b) => {
      if (a === 'comparacao') return 1;
      if (b === 'comparacao') return -1;
      return a.localeCompare(b);
    });
    let planilhaCount = 1;
    let data: any[] = [];
    data.push({}); // Linha em branco após o cabeçalho
    let primeiroGrupo = true;
    ordem.forEach((origem) => {
      if (origem !== 'comparacao') {
        // Adiciona linha em branco antes de cada grupo, exceto o primeiro
        if (!primeiroGrupo) data.push({});
        primeiroGrupo = false;
        const nomeArquivo = metaFiles[planilhaCount - 1]?.name?.replace(/\.(xlsx|xls|csv)$/i, '') || `${planilhaCount}º Planilha`;
        data.push({ 'Nome da campanha': nomeArquivo });
        planilhaCount++;
      }
      grupos[origem].forEach((linha: any) => {
        // Formatar a data para mostrar apenas dia e mês
        const dataCompleta = linha.inicio;
        let dataFormatada = dataCompleta;
        if (dataCompleta && dataCompleta.includes('-')) {
          const [ano, mes, dia] = dataCompleta.split('-');
          dataFormatada = `${dia}-${mes}`;
        }

        data.push({
          'Nome da campanha': linha.nome,
          'Data': dataFormatada,
          'META': linha.resultados,
          'Custo': linha.custo_por_resultados !== undefined ? `R$ ${Number(linha.custo_por_resultados).toFixed(2)}` : '-',
          'C2S': linha.leads,
          'Visitas': linha.visitas_agendadas,
        });
      });
    });
    // Linha de total
    data.push({
      'Nome da campanha': 'TOTAL',
      'Data': '',
      'META': totalMeta,
      'Custo': '-',
      'C2S': totalLeads,
      'Visitas': totalVisitasAgendadas,
    });
    // Criar worksheet e workbook
    const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');
    // Gerar arquivo
    XLSX.writeFile(wb, 'comparativo_resultados.xls');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181926', fontFamily: 'Inter, Roboto, Segoe UI, Arial, sans-serif' }}>
      {/* Conteúdo principal */}
      <Box sx={{ flex: 1, bgcolor: 'transparent', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, Roboto, Segoe UI, Arial, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
        {/* Header/topbar */}
        <Paper sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, py: 3, borderBottom: '1px solid #35364a', bgcolor: '#23243a', borderTopLeftRadius: 16, borderTopRightRadius: 16, boxShadow: 2, mb: 4, color: '#fff' }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#fff', letterSpacing: 1 }}>Relatórios</Typography>
          <Button variant="contained" sx={{ bgcolor: '#fff', color: '#23243a', fontWeight: 700, px: 3, boxShadow: 1, borderRadius: 2, '&:hover': { bgcolor: '#e0e3e7', color: '#23243a' } }} onClick={handleExportar}>Exportar</Button>
        </Paper>
        {/* Blocos de upload e botão de comparar */}
        {resultados === null ? (
          <Paper sx={{ bgcolor: '#23243a', borderRadius: 4, boxShadow: 2, p: 2, mb: 4, color: '#fff' }}>
            <Grid container spacing={3} sx={{ mt: 1, px: 2 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ background: '#23243a', color: '#fff', p: 4, boxShadow: 1, fontFamily: 'Inter, Roboto, Segoe UI, Arial, sans-serif', borderRadius: 4, border: '1px solid #35364a' }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: '#fff', fontSize: 22, letterSpacing: 0.5 }}>Upload dos 4 Relatórios do Meta</Typography>
                  <Box {...getMetaRootProps()} sx={{ border: '2px dashed #5f5fff', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', transition: '0.2s', bgcolor: '#23243a', color: '#fff', '&:hover': { borderColor: '#fff', bgcolor: '#35364a' } }}>
                    <input {...getMetaInputProps()} />
                    <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>
                      Arraste ou selecione <span style={{ color: '#fff', fontWeight: 800 }}>4 relatórios do Meta</span>
                    </Typography>
                  </Box>
                  {metaFiles.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#fff' }}>Arquivos selecionados:</Typography>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {metaFiles.map((file) => (
                          <li key={file.name} style={{ color: '#fff', fontSize: 15, marginBottom: 2 }}>{file.name}</li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ background: '#23243a', color: '#fff', p: 4, boxShadow: 1, fontFamily: 'Inter, Roboto, Segoe UI, Arial, sans-serif', borderRadius: 4, border: '1px solid #35364a' }}>
                  <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: '#fff', fontSize: 22, letterSpacing: 0.5 }}>Upload da Planilha de Comparação</Typography>
                  <Box {...getCompRootProps()} sx={{ border: '2px dashed #5f5fff', borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer', transition: '0.2s', bgcolor: '#23243a', color: '#fff', '&:hover': { borderColor: '#fff', bgcolor: '#35364a' } }}>
                    <input {...getCompInputProps()} />
                    <Typography sx={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>
                      Arraste ou selecione <span style={{ color: '#fff', fontWeight: 800 }}>1 planilha de comparação</span>
                    </Typography>
                  </Box>
                  {comparacaoFile && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#fff' }}>Arquivo selecionado:</Typography>
                      <Typography sx={{ color: '#fff', fontSize: 15 }}>{comparacaoFile.name}</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
            <Box sx={{ px: 2, mt: 3, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                sx={{ bgcolor: '#fff', color: '#23243a', fontWeight: 900, fontSize: 20, px: 6, py: 2.2, borderRadius: 3, boxShadow: 1, letterSpacing: 1, transition: '0.2s', '&:hover': { bgcolor: '#e0e3e7', color: '#23243a', transform: 'scale(1.04)' } }}
                onClick={handleComparar}
                disabled={metaFiles.length !== 4 || !comparacaoFile || loading}
              >
                {loading ? 'Comparando...' : 'Comparar'}
              </Button>
              {erro && (
                <Typography sx={{ color: 'error.main', ml: 2, fontWeight: 700, fontSize: 16 }}>{erro}</Typography>
              )}
            </Box>
          </Paper>
        ) : null}
        {/* Fim dos blocos de upload */}
        {/* Botão para novo upload após envio */}
        {resultados !== null && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <Button
              variant="contained"
              sx={{ bgcolor: '#fff', color: '#23243a', fontWeight: 900, fontSize: 18, px: 5, py: 2, borderRadius: 3, boxShadow: 1, letterSpacing: 1, transition: '0.2s', '&:hover': { bgcolor: '#e0e3e7', color: '#23243a', transform: 'scale(1.04)' } }}
              onClick={() => { setMetaFiles([]); setComparacaoFile(null); setResultados(null); setErro(null); }}
            >
              Novo Upload
            </Button>
          </Box>
        )}
        {/* Tabela de campanhas */}
        <Paper sx={{ bgcolor: '#23243a', borderRadius: 4, boxShadow: 2, p: { xs: 1, md: 4 }, mb: 4, color: '#fff', overflowX: 'auto' }} ref={tabelaRef}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 900, color: '#fff', fontSize: 28, letterSpacing: 1, mb: 2, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }}>
            Comparativo de Resultados
          </Typography>
          <Box sx={{ width: '100%', minWidth: 700 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: '#23243a', color: '#fff', borderBottom: '2px solid #5f5fff' }}>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'left', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>Nome da campanha</th>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'center', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>Data</th>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'right', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>META</th>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'right', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>Custo</th>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'right', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>C2S</th>
                  <th style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 17, textAlign: 'right', background: '#23243a', color: '#fff', letterSpacing: 0.5, position: 'sticky', top: 0 }}>Visitas</th>
                </tr>
              </thead>
              <tbody>
                {/* Separação por planilha do Meta */}
                {(() => {
                  if (!resultados?.linhas || resultados.linhas.length === 0) return null;
                  // Agrupar linhas por origem (ex: meta1, meta2, meta3, meta4, comparacao)
                  const grupos: { [origem: string]: any[] } = {};
                  resultados.linhas.forEach((linha: any) => {
                    const origem = linha.origem || 'comparacao';
                    if (!grupos[origem]) grupos[origem] = [];
                    grupos[origem].push(linha);
                  });
                  const ordem = Object.keys(grupos).sort((a, b) => {
                    if (a === 'comparacao') return 1;
                    if (b === 'comparacao') return -1;
                    return a.localeCompare(b);
                  });
                  // Mapeamento dos nomes dos arquivos para cada grupo meta
                  const metaFileNames = metaFiles.map((file) => file.name);
                  return ordem.flatMap((origem, idx) => {
                    const isComparacao = origem === 'comparacao';
                    let header = null;
                    if (!isComparacao) {
                      // Extrair o índice do grupo meta (ex: meta1 -> 0)
                      const match = origem.match(/^meta(\d+)$/);
                      let nomeArquivo = '';
                      if (match) {
                        const fileIdx = parseInt(match[1], 10) - 1;
                        nomeArquivo = metaFileNames[fileIdx]?.replace(/\.(xlsx|xls|csv)$/i, '') || `${match[1]}º Planilha`;
                      }
                      header = (
                        <tr key={'sep-' + origem}>
                          <td colSpan={6} style={{ padding: 0, background: 'transparent', border: 'none' }}>
                            <Box sx={{ my: 3, p: 2, borderRadius: 3, bgcolor: '#292a3a', boxShadow: 2, border: '1px solid #35364a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography sx={{ fontWeight: 900, color: '#fff', fontSize: 18, letterSpacing: 0.5, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }}>{nomeArquivo}</Typography>
                            </Box>
                          </td>
                        </tr>
                      );
                    }
                    return [
                      header,
                      ...grupos[origem].map((linha: any, idx: number) => (
                        <React.Fragment key={linha.nome + idx}>
                          <tr style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a', borderBottom: '1px solid #35364a', height: 60 }}>
                            <td style={{ border: 'none', padding: 16, fontWeight: 600, fontSize: 16, textAlign: 'left', color: '#fff', letterSpacing: 0.2 }}>{linha.nome}</td>
                            <td style={{ border: 'none', padding: 16, fontWeight: 500, fontSize: 16, textAlign: 'center', color: '#fff' }}>{linha.inicio}</td>
                            <td style={{ border: 'none', padding: 16, fontWeight: 700, fontSize: 16, textAlign: 'right', color: (linha.resultados > 0 ? '#00e676' : '#ff5252') }}>{linha.resultados}</td>
                            <td style={{ border: 'none', padding: 16, fontWeight: 700, fontSize: 16, textAlign: 'right', color: '#fff' }}>{linha.custo_por_resultados !== undefined ? `R$ ${Number(linha.custo_por_resultados).toFixed(2)}` : '-'}</td>
                            <td style={{ border: 'none', padding: 16, fontWeight: 700, fontSize: 16, textAlign: 'right', color: (linha.leads > linha.resultados ? '#00e676' : linha.leads === linha.resultados ? '#fff' : '#ff5252') }}>
                              <Button size="small" sx={{ color: 'inherit', bgcolor: 'transparent', fontWeight: 800, fontSize: 16, textTransform: 'none', p: 0, minWidth: 0, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }} onClick={() => setDetalhesAbertos(detalhesAbertos === linha.nome ? null : linha.nome)}>
                                {linha.leads}
                              </Button>
                            </td>
                            <td style={{ border: 'none', padding: 16, fontWeight: 700, fontSize: 16, textAlign: 'right', color: linha.visitas_agendadas > 0 ? '#00e676' : '#fff' }}>
                              {linha.visitas_agendadas}
                            </td>
                          </tr>
                          {detalhesAbertos === linha.nome && linha.detalhes.length > 0 && (
                            <tr>
                              <td colSpan={6} style={{ background: '#35364a', border: 'none', padding: 18, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif', borderRadius: 8, color: '#fff' }}>
                                <b>Detalhes dos Leads:</b>
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  {linha.detalhes.map((lead: any, i: number) => (
                                    <li key={i} style={{ fontSize: 15, fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif', color: '#fff' }}>
                                      Data de chegada: <b>{lead.data_chegada}</b> | Atividade atual: <b>{lead.atividade_atual}</b>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )),
                    ];
                  });
                })()}
                <tr style={{ fontWeight: 900, background: '#292a3a', fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif', color: '#fff', borderTop: '2px solid #5f5fff', height: 60 }}>
                  <td style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 18, textAlign: 'left', letterSpacing: 0.5 }}>TOTAL</td>
                  <td style={{ border: 'none', padding: 16 }}></td>
                  <td style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 18, textAlign: 'right', color: '#ff5252' }}>{totalMeta}</td>
                  <td style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 18, textAlign: 'right', color: '#fff' }}>-</td>
                  <td style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 18, textAlign: 'right', color: '#fff' }}>{totalLeads}</td>
                  <td style={{ border: 'none', padding: 16, fontWeight: 900, fontSize: 18, textAlign: 'right', color: '#00e676' }}>{totalVisitasAgendadas}</td>
                </tr>
              </tbody>
            </table>
          </Box>
        </Paper>
        {/* Bloco de métricas dos totais (sem gráfico) */}
        {resultados?.linhas && resultados.linhas.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 2, mt: 2 }}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, boxShadow: 2, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Total Resultados (Meta)</Typography>
                <Typography variant="h4" fontWeight={900}>{resultados?.totais?.resultados ?? 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, boxShadow: 2, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Total Leads (Comparação)</Typography>
                <Typography variant="h4" fontWeight={900}>{resultados?.totais?.leads ?? 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, boxShadow: 2, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Diferença</Typography>
                <Typography variant="h4" fontWeight={900} color={((resultados?.totais?.leads ?? 0) - (resultados?.totais?.resultados ?? 0)) === 0 ? '#00e676' : '#ff5252'}>
                  {(resultados?.totais?.leads ?? 0) - (resultados?.totais?.resultados ?? 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={3}>
              <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, boxShadow: 2, textAlign: 'center', borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Total Visitas Agendadas</Typography>
                <Typography variant="h4" fontWeight={900}>{totalVisitasAgendadas}</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
        {/* Gráfico de pizza das métricas totais */}
        {resultados?.linhas && resultados.linhas.length > 0 && (
          <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 4, boxShadow: 2, borderRadius: 4, mb: 4, maxWidth: 500, mx: 'auto', mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 900, mb: 2, textAlign: 'center', fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }}>
              Proporção das Métricas
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 350, mx: 'auto' }}>
              <Bar
                data={{
                  labels: ['Resultados (Meta)', 'Leads (Comparação)', 'Diferença'],
                  datasets: [
                    {
                      label: 'Métricas',
                      data: [
                        resultados?.totais?.resultados ?? 0,
                        resultados?.totais?.leads ?? 0,
                        (resultados?.totais?.leads ?? 0) - (resultados?.totais?.resultados ?? 0),
                      ],
                      backgroundColor: [
                        '#5f5fff', // Meta
                        '#00e676', // Leads
                        '#ff5252', // Diferença
                      ],
                      borderColor: '#181926',
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          return `${context.label}: ${context.parsed.x}`;
                        },
                      },
                    },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                }}
                height={220}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#5f5fff', borderRadius: '50%' }} /> <Typography sx={{ fontSize: 15, color: '#fff' }}>Resultados (Meta)</Typography></Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#00e676', borderRadius: '50%' }} /> <Typography sx={{ fontSize: 15, color: '#fff' }}>Leads (Comparação)</Typography></Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 16, height: 16, bgcolor: '#ff5252', borderRadius: '50%' }} /> <Typography sx={{ fontSize: 15, color: '#fff' }}>Diferença</Typography></Box>
            </Box>
          </Paper>
        )}
        {/* Gráfico de colunas agrupadas por campanha */}
        {resultados?.linhas && resultados.linhas.length > 0 && (
          <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 4, boxShadow: 2, borderRadius: 4, mb: 4, maxWidth: 900, mx: 'auto', mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 900, mb: 2, textAlign: 'center', fontFamily: 'Inter, Poppins, Roboto, Arial, sans-serif' }}>
              Comparativo por Campanha
            </Typography>
            <Box sx={{ width: '100%', minWidth: 350, maxWidth: 800, mx: 'auto', height: 350 }}>
              <Bar
                data={{
                  labels: resultados.linhas.map((linha: any) => linha.nome),
                  datasets: [
                    {
                      label: 'Resultados (Meta)',
                      data: resultados.linhas.map((linha: any) => linha.resultados),
                      backgroundColor: '#5f5fff',
                    },
                    {
                      label: 'Leads (Comparação)',
                      data: resultados.linhas.map((linha: any) => linha.leads),
                      backgroundColor: '#00e676',
                    },
                    {
                      label: 'Diferença',
                      data: resultados.linhas.map((linha: any) => (linha.leads - linha.resultados)),
                      backgroundColor: '#ff5252',
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: {
                      labels: {
                        color: '#fff',
                        font: { family: 'Inter, Poppins, Roboto, Arial, sans-serif', size: 15 },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context: any) {
                          return `${context.dataset.label}: ${context.parsed.y}`;
                        },
                      },
                    },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      ticks: { color: '#fff', font: { family: 'Inter, Poppins, Roboto, Arial, sans-serif', size: 13 } },
                      grid: { color: '#35364a' },
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { color: '#fff', font: { family: 'Inter, Poppins, Roboto, Arial, sans-serif', size: 13 } },
                      grid: { color: '#35364a' },
                    },
                  },
                }}
                height={350}
              />
            </Box>
          </Paper>
        )}
        </Box>
      </Box>
    </Box>
  );
} 