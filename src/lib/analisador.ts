import * as XLSX from 'xlsx';

export class AnalisadorPlanilhas {
  private dados_planilhas: { [key: string]: XLSX.WorkBook } = {};
  public soma_total: number = 0;

  public carregar_planilhas(caminhos_planilhas: string[]): void {
    for (const caminho of caminhos_planilhas) {
      try {
        const workbook = XLSX.readFile(caminho);
        this.dados_planilhas[caminho] = workbook;
        console.log(`Planilha ${caminho} carregada com sucesso!`);
      } catch (error) {
        console.error(`Erro ao carregar ${caminho}:`, error);
      }
    }
  }

  public extrair_dados(coluna1: string, coluna2: string): void {
    this.soma_total = 0;
    for (const [nome_planilha, workbook] of Object.entries(this.dados_planilhas)) {
      try {
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        const soma_planilha = data.reduce((acc: number, row: any) => {
          return acc + (Number(row[coluna1]) || 0) + (Number(row[coluna2]) || 0);
        }, 0);

        this.soma_total += soma_planilha;
        console.log(`Soma da planilha ${nome_planilha}: ${soma_planilha}`);
      } catch (error) {
        console.error(`Erro: Coluna não encontrada em ${nome_planilha}`);
      }
    }
  }

  public comparar_com_nova_planilha(
    caminho_nova_planilha: string,
    coluna1: string,
    coluna2: string
  ): {
    soma_anterior: number;
    soma_nova: number;
    diferenca: number;
    percentual: number;
  } | null {
    try {
      const workbook = XLSX.readFile(caminho_nova_planilha);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const soma_nova = data.reduce((acc: number, row: any) => {
        return acc + (Number(row[coluna1]) || 0) + (Number(row[coluna2]) || 0);
      }, 0);

      const diferenca = soma_nova - this.soma_total;
      const percentual = (diferenca / this.soma_total) * 100;

      return {
        soma_anterior: this.soma_total,
        soma_nova,
        diferenca,
        percentual
      };
    } catch (error) {
      console.error('Erro ao comparar com nova planilha:', error);
      return null;
    }
  }
} 