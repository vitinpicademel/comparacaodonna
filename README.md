# Sistema de Análise de Planilhas

Este sistema permite analisar e comparar dados de múltiplas planilhas Excel, gerando gráficos e métricas comparativas.

## Requisitos

- Python 3.7 ou superior
- Bibliotecas Python listadas em `requirements.txt`

## Instalação

1. Clone este repositório
2. Instale as dependências:
```bash
pip install -r requirements.txt
```

## Como Usar

1. Execute o script principal:
```bash
python analise_planilhas.py
```

2. O sistema irá solicitar:
   - Caminhos para as 4 planilhas iniciais
   - Nomes das duas colunas que deseja analisar
   - Caminho da nova planilha para comparação

3. O sistema irá gerar:
   - Soma dos dados das colunas selecionadas
   - Comparação com a nova planilha
   - Dois gráficos:
     - `comparacao.png`: Gráfico de barras comparando as somas
     - `distribuicao.png`: Gráfico de pizza mostrando a distribuição

## Observações

- As planilhas devem estar no formato Excel (.xlsx)
- As colunas especificadas devem existir em todas as planilhas
- Os dados nas colunas devem ser numéricos 