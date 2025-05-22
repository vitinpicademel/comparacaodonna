'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  CircularProgress,
  Button,
  Modal,
  IconButton
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useUploadStore } from '../store';
import React from 'react';
import CloseIcon from '@mui/icons-material/Close';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const resultados = useUploadStore((state) => state.resultados);
  const metaFiles = useUploadStore((state) => state.metaFiles);
  const [tabValue, setTabValue] = useState(0);
  const [openLandingModal, setOpenLandingModal] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [responsavelFiltro, setResponsavelFiltro] = useState<string>('');

  // Adicionar cálculo de quantoGostou
  const times = [
    { nome: 'Time Ely', filtro: 'ely' },
    { nome: 'Time Daiane', filtro: 'daiane' },
    { nome: 'Time André', filtro: 'andre' },
    { nome: 'Time Lorena', filtro: 'lorena' },
  ];
  const quantoGostou = times.map((time) => {
    let valor = 0;
    if (resultados && resultados.linhas && resultados.linhas.length > 0 && resultados.linhas[0].detalhes) {
      resultados.linhas.forEach((linha: any) => {
        if (linha.nome.toLowerCase().includes(time.filtro)) {
          if (linha.valor_usado_brl !== undefined) {
            valor += Number(linha.valor_usado_brl) || 0;
          }
        }
      });
    }
    return {
      time: time.nome,
      valor: valor,
    };
  });

  // Processar dados reais das planilhas
  const data = React.useMemo(() => {
    if (!resultados || !resultados.linhas) return null;
    // Leads por campanha
    const leadsPorCampanha = resultados.linhas.map((linha: any) => ({
      nome: linha.nome,
      quantidade: linha.leads,
    }));
    // Status dos leads (exemplo: agrupando atividades)
    const statusMap: Record<string, number> = {};
    resultados.linhas.forEach((linha: any) => {
      if (linha.detalhes) {
        linha.detalhes.forEach((lead: any) => {
          const status = lead.atividade_atual || lead.status || 'Desconhecido';
          statusMap[status] = (statusMap[status] || 0) + 1;
        });
      }
    });
    const statusLeads = Object.entries(statusMap).map(([status, quantidade]) => ({ status, quantidade }));
    // Visitas agendadas por mês
    const visitasPorMesMap: Record<string, number> = {};
    resultados.linhas.forEach((linha: any) => {
      if (linha.detalhes) {
        linha.detalhes.forEach((lead: any) => {
          if ((lead.atividade_atual || lead.status) === 'Visita Agendada' && lead.data_chegada) {
            const [ano, mes] = lead.data_chegada.split('-');
            const label = mes ? `${mes}/${ano}` : lead.data_chegada;
            visitasPorMesMap[label] = (visitasPorMesMap[label] || 0) + 1;
          }
        });
      }
    });
    const visitasPorMes = Object.entries(visitasPorMesMap).map(([mes, quantidade]) => ({ mes, quantidade }));
    visitasPorMes.sort((a, b) => a.mes.localeCompare(b.mes));
    // Se não houver valor_usado_brl nas linhas, usar o valor total (dividido igualmente só para não ficar vazio)
    const temValorPorTime = quantoGostou.some(q => q.valor > 0);
    if (!temValorPorTime && resultados.valor_usado_brl_total) {
      const valorPorTime = resultados.valor_usado_brl_total / times.length;
      times.forEach((time, idx) => {
        quantoGostou[idx].valor = valorPorTime;
      });
    }
    return {
      totalLeads: resultados.totais?.leads || 0,
      leadsPorCampanha,
      statusLeads,
      visitasPorMes,
      quantoGostou,
    };
  }, [resultados]);

  const orcamentoPorTime = React.useMemo(() => {
    if (!resultados || !resultados.valor_usado_brl_por_arquivo || !metaFiles) return [];
    // valor_usado_brl_por_arquivo deve ser um array na mesma ordem dos arquivos enviados
    return metaFiles.map((file: File, idx: number) => ({
      nome: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
      valor: resultados.valor_usado_brl_por_arquivo[idx] || 0,
    }));
  }, [resultados, metaFiles]);

  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>
        Nenhum dado disponível. Faça o upload das planilhas na aba Comparação.
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Remover botão e modal do topo */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.print()}
          sx={{ fontWeight: 700, fontSize: 16, px: 4, py: 1.5, borderRadius: 2, boxShadow: 1, textTransform: 'none' }}
          className="btn-print"
        >
          Imprimir Dashboard
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          sx={{ fontWeight: 700, fontSize: 15, px: 3, py: 1, borderRadius: 2, textTransform: 'none', borderWidth: 2, borderColor: '#a259ff', color: '#a259ff', '&:hover': { borderColor: '#7b61ff', background: '#181926' } }}
          onClick={() => setTabValue(8)}
        >
          Leads Landing Page
        </Button>
      </Box>
      <Typography variant="h4" sx={{ mb: 4, color: '#fff', fontWeight: 'bold', display: 'inline-block', verticalAlign: 'middle' }}>
        Dashboard de Performance
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total de Leads
              </Typography>
              <Typography variant="h4">
                {data.totalLeads}
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                size="small"
                sx={{ mt: 1, mb: 2, textTransform: 'none' }}
                onClick={() => setMostrarDiagnostico((v) => !v)}
              >
                {mostrarDiagnostico ? 'Ocultar Diagnóstico' : 'Mostrar Diagnóstico'}
              </Button>
              {mostrarDiagnostico && (
                <Box>
                  {/* Diagnóstico: Exibir fontes únicas encontradas com contagem (apenas fontes válidas) */}
                  <Box sx={{ color: '#fff', mb: 2, fontSize: 14 }}>
                    <b>Fontes únicas encontradas:</b>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(() => {
                        if (!resultados || !resultados.todosLeadsComparacao) return null;
                        function normalizarFonte(fonte: string) {
                          return fonte
                            .normalize('NFD')
                            .replace(/[^\w\s\(\)\/]/g, '')
                            .replace(/\s+/g, ' ')
                            .replace(/[\n\r]/g, '')
                            .trim()
                            .toLowerCase();
                        }
                        const fontesValidas = [
                          'Landing Page (RE/MAX Comunitá)',
                          'Landing Page (G. Santos Imóveis)'
                        ];
                        const contagemFontes: Record<string, number> = {};
                        resultados.todosLeadsComparacao.forEach((lead: any) => {
                          if (typeof lead.fonte === 'string') {
                            fontesValidas.forEach(fonteValida => {
                              if (normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)) {
                                contagemFontes[fonteValida] = (contagemFontes[fonteValida] || 0) + 1;
                              }
                            });
                          }
                        });
                        // Exibir apenas as fontes válidas que realmente existem na planilha
                        return fontesValidas.filter(fonteValida => contagemFontes[fonteValida]).map((fonte, idx) => (
                          <li key={idx} style={{ fontFamily: 'monospace' }}>{fonte}: <b>{contagemFontes[fonte]}</b></li>
                        ));
                      })()}
                    </ul>
                  </Box>
                  {/* Diagnóstico: Filtro por responsável/time */}
                  <Box sx={{ color: '#fff', mb: 2, fontSize: 14 }}>
                    <b>Filtrar por responsável/time:</b>
                    <select
                      value={responsavelFiltro}
                      onChange={e => setResponsavelFiltro(e.target.value)}
                      style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4 }}
                    >
                      <option value="">Todos</option>
                      {(() => {
                        function normalizarFonte(fonte: string) {
                          return fonte
                            .normalize('NFD')
                            .replace(/[^\w\s\(\)\/]/g, '')
                            .replace(/\s+/g, ' ')
                            .replace(/[\n\r]/g, '')
                            .trim()
                            .toLowerCase();
                        }
                        const fontesValidas = [
                          'Landing Page (RE/MAX Comunitá)',
                          'Landing Page (G. Santos Imóveis)'
                        ];
                        if (!resultados || !resultados.todosLeadsComparacao) return null;
                        const leadsLanding = resultados.todosLeadsComparacao.filter((lead: any) => {
                          if (typeof lead.fonte !== 'string') return false;
                          return fontesValidas.some(fonteValida =>
                            normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)
                          );
                        });
                        const responsaveisSet = new Set<string>();
                        leadsLanding.forEach((lead: any) => {
                          const responsavel = lead.responsavel || lead.time || lead.usuario_responsavel_atual || 'Não informado';
                          responsaveisSet.add(responsavel);
                        });
                        return Array.from(responsaveisSet).sort().map((resp, idx) => (
                          <option key={idx} value={resp}>{resp}</option>
                        ));
                      })()}
                    </select>
                  </Box>
                  {/* Diagnóstico: Exibir tabela de leads filtrados */}
                  <Box sx={{ color: '#fff', mb: 2, fontSize: 14 }}>
                    <b>Leads filtrados pelas fontes válidas:</b>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', marginTop: 8 }}>
                      <thead>
                        <tr style={{ background: '#181926' }}>
                          <th style={{ padding: 8, textAlign: 'left' }}>Fonte</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Título</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Responsável/Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          function normalizarFonte(fonte: string) {
                            return fonte
                              .normalize('NFD')
                              .replace(/[^\w\s\(\)\/]/g, '')
                              .replace(/\s+/g, ' ')
                              .replace(/[\n\r]/g, '')
                              .trim()
                              .toLowerCase();
                          }
                          const fontesValidas = [
                            'Landing Page (RE/MAX Comunitá)',
                            'Landing Page (G. Santos Imóveis)'
                          ];
                          if (!resultados || !resultados.todosLeadsComparacao) return null;
                          const leadsLanding = resultados.todosLeadsComparacao.filter((lead: any) => {
                            if (typeof lead.fonte !== 'string') return false;
                            return fontesValidas.some(fonteValida =>
                              normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)
                            );
                          });
                          return leadsLanding
                            .filter((lead: any) => !responsavelFiltro || (lead.responsavel || lead.time || lead.usuario_responsavel_atual || 'Não informado') === responsavelFiltro)
                            .map((lead: any, idx: number) => (
                              <tr key={idx} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                                <td style={{ padding: 8 }}>{lead.fonte}</td>
                                <td style={{ padding: 8 }}>{lead.titulo}</td>
                                <td style={{ padding: 8 }}>{lead.responsavel || lead.time || lead.usuario_responsavel_atual || 'Não informado'}</td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPL Médio
              </Typography>
              <Typography variant="h4">
                {(() => {
                  const totalLeads = data.totalLeads || 0;
                  const valorTotal = resultados.valor_usado_brl_total || 0;
                  if (totalLeads === 0) return 'R$ 0,00';
                  const cpl = valorTotal / totalLeads;
                  return `R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                })()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visitas Agendadas
              </Typography>
              <Typography variant="h4">
                {data.statusLeads.find(s => s.status === 'Visita Agendada')?.quantidade || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Leads Arquivados
              </Typography>
              <Typography variant="h4">
                {resultados?.leads_arquivados_comparacao?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {orcamentoPorTime.length > 0 && orcamentoPorTime.map((time, idx) => (
          <Grid item xs={12} md={3} key={time.nome}>
            <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {time.nome}
                </Typography>
                <Typography variant="h4">
                  R$ {time.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {orcamentoPorTime.length === 0 && (
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: '#23243a', color: '#fff', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Orçamento Total
                </Typography>
                <Typography variant="h4">
                  R$ {resultados.valor_usado_brl_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Box sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Leads" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Leads por Campanha" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Custo por Campanha" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Quanto cada time gastou" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Leads Arquivados" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Status dos Leads" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Visitas Agendadas" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="CPL Médio Detalhado" sx={{ color: '#fff', '&.Mui-selected': { color: '#2979ff' } }} />
          <Tab label="Leads Landing Page" sx={{ color: '#fff', '&.Mui-selected': { color: '#a259ff' } }} />
        </Tabs>
        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Total de Leads por Planilha
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#181926' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Planilha</th>
                      <th style={{ padding: 12, textAlign: 'right' }}>Total de Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      if (!resultados?.linhas || !metaFiles) return null;
                      // Agrupar por origem
                      const grupos: Record<string, number> = {};
                      resultados.linhas.forEach((linha: any) => {
                        const origem: string = linha.origem || 'comparacao';
                        if (!grupos[origem]) grupos[origem] = 0;
                        grupos[origem] += Number(linha.leads) || 0;
                      });
                      // Mapear nomes dos arquivos
                      const nomesPlanilhas = metaFiles.map((file: File) => file.name.replace(/\.(xlsx|xls|csv)$/i, ''));
                      // Exibir apenas as planilhas do Meta (meta1, meta2, ...)
                      return Object.keys(grupos)
                        .filter((origem) => origem.startsWith('meta'))
                        .sort()
                        .map((origem, idx) => {
                          // meta1 -> índice 0, meta2 -> índice 1, etc.
                          const match = origem.match(/^meta(\d+)$/);
                          let nomePlanilha = origem;
                          if (match) {
                            const fileIdx = parseInt(match[1], 10) - 1;
                            nomePlanilha = nomesPlanilhas[fileIdx] || origem;
                          }
                          return (
                            <tr key={origem} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                              <td style={{ padding: 12 }}>{nomePlanilha}</td>
                              <td style={{ padding: 12, textAlign: 'right' }}>{grupos[origem]}</td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
          {tabValue === 1 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Leads por Origem
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.leadsPorCampanha}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}
          {tabValue === 2 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Custo por Campanha (Meta)
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#181926' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Campanha</th>
                      <th style={{ padding: 12, textAlign: 'right' }}>Custo por Resultados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados?.linhas?.map((linha: any, idx: number) => (
                      <tr key={linha.nome} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                        <td style={{ padding: 12 }}>{linha.nome}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>R$ {Number(linha.custo_por_resultados).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
          {tabValue === 3 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Quanto cada time gastou
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orcamentoPorTime.length > 0 ? orcamentoPorTime : [
                    { nome: 'AltoPadrao', valor: resultados?.totais?.altoPadrao || 0 },
                    { nome: 'BM Roxa', valor: resultados?.totais?.bmRoxa || 0 },
                    { nome: 'Ely', valor: resultados?.totais?.ely || 0 },
                    { nome: 'Ricardo', valor: resultados?.totais?.ricardo || 0 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Bar dataKey="valor" fill="#7b61ff" name="Valor usado (BRL)" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}
          {tabValue === 4 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Total de Leads Arquivados
              </Typography>
              <Typography variant="h2" sx={{ color: '#ff5252', fontWeight: 900 }}>
                {resultados?.leads_arquivados_comparacao?.length || 0}
              </Typography>
              <Box sx={{ mt: 4, textAlign: 'left', overflowX: 'auto' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                  Detalhamento dos Leads Arquivados
                </Typography>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#181926' }}>
                      <th style={{ padding: 12 }}>Usuário responsável atual</th>
                      <th style={{ padding: 12 }}>Status</th>
                      <th style={{ padding: 12 }}>Título</th>
                      <th style={{ padding: 12 }}>Nome do cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados?.leads_arquivados_comparacao?.map((lead: any, idx: number) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                        <td style={{ padding: 12 }}>{lead.usuario_responsavel_atual || '-'}</td>
                        <td style={{ padding: 12 }}>{lead.status || '-'}</td>
                        <td style={{ padding: 12 }}>{lead.titulo || '-'}</td>
                        <td style={{ padding: 12 }}>{lead.nome_do_cliente || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
          {tabValue === 5 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Status dos Leads
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusLeads}
                      dataKey="quantidade"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label
                    >
                      {data.statusLeads.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          )}
          {tabValue === 6 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
                Evolução de Visitas Agendadas por Mês
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.visitasPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantidade" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Typography variant="h6" sx={{ mt: 3, color: '#fff', textAlign: 'center' }}>
                Total de Visitas Agendadas: {data.visitasPorMes.reduce((acc, v) => acc + v.quantidade, 0)}
              </Typography>
            </Paper>
          )}
          {tabValue === 7 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff', fontWeight: 'bold' }}>
                CPL Médio Detalhado por Campanha
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#181926' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, fontSize: 17 }}>Campanha</th>
                      <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 17 }}>Total de Leads</th>
                      <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 17 }}>Valor Usado (BRL)</th>
                      <th style={{ padding: 12, textAlign: 'right', fontWeight: 700, fontSize: 17 }}>CPL Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados?.linhas?.map((linha: any, idx: number) => (
                      <tr key={linha.nome} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                        <td style={{ padding: 12 }}>{linha.nome}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>{linha.leads}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>R$ {(linha.valor_usado_brl !== undefined ? Number(linha.valor_usado_brl) : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: 12, textAlign: 'right' }}>
                          {linha.leads > 0 && linha.valor_usado_brl !== undefined
                            ? `R$ ${(Number(linha.valor_usado_brl) / linha.leads).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}`
                            : 'R$ 0,00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
          {tabValue === 8 && (
            <Paper sx={{ bgcolor: '#23243a', color: '#fff', p: 3, borderRadius: 3, mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#fff', fontWeight: 'bold' }}>
                Leads vindos de Landing Page
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#fff', mb: 2 }}>
                Total de Leads: {(() => {
                  function normalizarFonte(fonte: string) {
                    return fonte
                      .normalize('NFD')
                      .replace(/[^\u0000-\u007F\w\s\(\)\/]/g, '')
                      .replace(/\s+/g, ' ')
                      .replace(/[\n\r]/g, '')
                      .trim()
                      .toLowerCase();
                  }
                  const fontesValidas = [
                    'Landing Page (RE/MAX Comunitá)',
                    'Landing Page (G. Santos Imóveis)'
                  ];
                  if (!resultados || !resultados.todosLeadsComparacao) return 0;
                  return resultados.todosLeadsComparacao.filter((lead: any) => {
                    if (typeof lead.fonte !== 'string') return false;
                    return fontesValidas.some(fonteValida =>
                      normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)
                    );
                  }).length;
                })()}
              </Typography>
              {/* Fontes únicas encontradas: apenas fontes válidas */}
              <Box sx={{ color: '#fff', mb: 2, fontSize: 14 }}>
                <b>Fontes únicas encontradas:</b>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {(() => {
                    if (!resultados || !resultados.todosLeadsComparacao) return null;
                    function normalizarFonte(fonte: string) {
                      return fonte
                        .normalize('NFD')
                        .replace(/[^\u0000-\u007F\w\s\(\)\/]/g, '')
                        .replace(/\s+/g, ' ')
                        .replace(/[\n\r]/g, '')
                        .trim()
                        .toLowerCase();
                    }
                    const fontesValidas = [
                      'Landing Page (RE/MAX Comunitá)',
                      'Landing Page (G. Santos Imóveis)'
                    ];
                    const contagemFontes: Record<string, number> = {};
                    resultados.todosLeadsComparacao.forEach((lead: any) => {
                      if (typeof lead.fonte === 'string') {
                        fontesValidas.forEach(fonteValida => {
                          if (normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)) {
                            contagemFontes[fonteValida] = (contagemFontes[fonteValida] || 0) + 1;
                          }
                        });
                      }
                    });
                    // Exibir apenas as fontes válidas que realmente existem na planilha
                    return fontesValidas.filter(fonteValida => contagemFontes[fonteValida]).map((fonte, idx) => (
                      <li key={idx} style={{ fontFamily: 'monospace' }}>{fonte}: <b>{contagemFontes[fonte]}</b></li>
                    ));
                  })()}
                </ul>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#181926' }}>
                      <th style={{ padding: 12, textAlign: 'left' }}>Usuário responsável atual</th>
                      <th style={{ padding: 12, textAlign: 'right' }}>Total de Leads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      function normalizarFonte(fonte: string) {
                        return fonte
                          .normalize('NFD')
                          .replace(/[^\u0000-\u007F\w\s\(\)\/]/g, '')
                          .replace(/\s+/g, ' ')
                          .replace(/[\n\r]/g, '')
                          .trim()
                          .toLowerCase();
                      }
                      if (!resultados || !resultados.todosLeadsComparacao) return null;
                      const fontesValidas = [
                        'Landing Page (RE/MAX Comunitá)',
                        'Landing Page (G. Santos Imóveis)'
                      ];
                      const leadsLanding = resultados.todosLeadsComparacao.filter((lead: any) => {
                        if (typeof lead.fonte !== 'string') return false;
                        return fontesValidas.some(fonteValida =>
                          normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)
                        );
                      });
                      // LOG: Mostrar todos os valores de usuario_responsavel_atual
                      console.log('usuario_responsavel_atual dos leadsLanding:', leadsLanding.map((lead: any) => lead.usuario_responsavel_atual));
                      // Agrupar exatamente pelo valor de usuario_responsavel_atual (corrigido)
                      const grupos: Record<string, number> = {};
                      leadsLanding.forEach((lead: any) => {
                        let responsavel = '';
                        // Tenta pegar o campo com acento e espaço
                        if ('Usuário responsável atual' in lead && typeof lead['Usuário responsável atual'] === 'string' && lead['Usuário responsável atual'].trim()) {
                          responsavel = lead['Usuário responsável atual'].trim();
                        } else if ('usuario_responsavel_atual' in lead && typeof lead.usuario_responsavel_atual === 'string' && lead.usuario_responsavel_atual.trim()) {
                          responsavel = lead.usuario_responsavel_atual.trim();
                        }
                        if (!responsavel) {
                          responsavel = 'Não informado';
                        }
                        if (!grupos[responsavel]) grupos[responsavel] = 0;
                        grupos[responsavel] += 1;
                      });
                      return Object.entries(grupos).map(([responsavel, total], idx) => (
                        <tr key={responsavel} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                          <td style={{ padding: 12 }}>{responsavel}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{total}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </Box>
              {/* Diagnóstico: Exibir todos os campos dos leads filtrados por landing page */}
              <Box sx={{ overflowX: 'auto', mt: 3, mb: 2 }}>
                <b>Diagnóstico dos campos dos leads de Landing Page:</b>
                {(() => {
                  function normalizarFonte(fonte: string) {
                    return fonte
                      .normalize('NFD')
                      .replace(/[^\u0000-\u007F\w\s\(\)\/]/g, '')
                      .replace(/\s+/g, ' ')
                      .replace(/[\n\r]/g, '')
                      .trim()
                      .toLowerCase();
                  }
                  if (!resultados || !resultados.todosLeadsComparacao) return null;
                  const fontesValidas = [
                    'Landing Page (RE/MAX Comunitá)',
                    'Landing Page (G. Santos Imóveis)'
                  ];
                  const leadsLanding = resultados.todosLeadsComparacao.filter((lead: any) => {
                    if (typeof lead.fonte !== 'string') return false;
                    return fontesValidas.some(fonteValida =>
                      normalizarFonte(lead.fonte) === normalizarFonte(fonteValida)
                    );
                  });
                  if (leadsLanding.length === 0) return null;
                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', marginTop: 8 }}>
                      <thead>
                        <tr style={{ background: '#292a3a' }}>
                          {Object.keys(leadsLanding[0]).map((key) => (
                            <th key={key} style={{ padding: 8, textAlign: 'left', fontSize: 13 }}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leadsLanding.map((lead: any, idx: number) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#23243a' : '#292a3a' }}>
                            {Object.keys(lead).map((key) => (
                              <td key={key} style={{ padding: 8, fontSize: 13 }}>{String(lead[key])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </Box>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
}

// Adicionar CSS global para impressão
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      nav, .MuiTabs-root, .MuiTab-root, .btn-print, button, .MuiButton-root, .MuiFab-root, .MuiSpeedDial-root, .MuiDrawer-root, .MuiAppBar-root, .MuiToolbar-root, .MuiPagination-root, .MuiPaginationItem-root, .MuiIconButton-root, .MuiBottomNavigation-root, .MuiBottomNavigationAction-root {
        display: none !important;
      }
      body {
        background: #fff !important;
        color: #000 !important;
      }
      table {
        color: #000 !important;
        background: #fff !important;
      }
      th, td {
        color: #000 !important;
        background: #fff !important;
        border: 1px solid #888 !important;
      }
      .MuiPaper-root, .MuiContainer-root, .MuiBox-root {
        background: #fff !important;
        color: #000 !important;
        box-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(style);
} 