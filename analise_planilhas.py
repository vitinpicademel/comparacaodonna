import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

class AnalisadorPlanilhas:
    def __init__(self):
        self.dados_planilhas = {}
        self.soma_total = 0
        
    def carregar_planilhas(self, caminhos_planilhas):
        """Carrega as planilhas iniciais"""
        for caminho in caminhos_planilhas:
            try:
                df = pd.read_excel(caminho)
                self.dados_planilhas[caminho] = df
                print(f"Planilha {caminho} carregada com sucesso!")
            except Exception as e:
                print(f"Erro ao carregar {caminho}: {str(e)}")
    
    def extrair_dados(self, coluna1, coluna2):
        """Extrai e soma os dados específicos das colunas"""
        self.soma_total = 0
        for nome_planilha, df in self.dados_planilhas.items():
            try:
                soma_planilha = df[coluna1].sum() + df[coluna2].sum()
                self.soma_total += soma_planilha
                print(f"Soma da planilha {nome_planilha}: {soma_planilha}")
            except KeyError as e:
                print(f"Erro: Coluna {str(e)} não encontrada em {nome_planilha}")
    
    def comparar_com_nova_planilha(self, caminho_nova_planilha, coluna1, coluna2):
        """Compara a soma anterior com os dados da nova planilha"""
        try:
            df_novo = pd.read_excel(caminho_nova_planilha)
            soma_nova = df_novo[coluna1].sum() + df_novo[coluna2].sum()
            
            # Criar gráfico de comparação
            plt.figure(figsize=(10, 6))
            plt.bar(['Soma Anterior', 'Nova Planilha'], [self.soma_total, soma_nova])
            plt.title('Comparação entre Soma Anterior e Nova Planilha')
            plt.ylabel('Valor Total')
            plt.savefig('comparacao.png')
            plt.close()
            
            # Criar gráfico de pizza para distribuição
            plt.figure(figsize=(8, 8))
            plt.pie([self.soma_total, soma_nova], 
                   labels=['Soma Anterior', 'Nova Planilha'],
                   autopct='%1.1f%%')
            plt.title('Distribuição dos Valores')
            plt.savefig('distribuicao.png')
            plt.close()
            
            # Calcular métricas
            diferenca = soma_nova - self.soma_total
            percentual = (diferenca / self.soma_total) * 100 if self.soma_total != 0 else 0
            
            print("\nMétricas de Comparação:")
            print(f"Soma anterior: {self.soma_total:.2f}")
            print(f"Soma nova planilha: {soma_nova:.2f}")
            print(f"Diferença: {diferenca:.2f}")
            print(f"Variação percentual: {percentual:.2f}%")
            
            return {
                'soma_anterior': self.soma_total,
                'soma_nova': soma_nova,
                'diferenca': diferenca,
                'percentual': percentual
            }
            
        except Exception as e:
            print(f"Erro ao comparar com nova planilha: {str(e)}")
            return None

def main():
    analisador = AnalisadorPlanilhas()
    
    # Exemplo de uso
    print("Bem-vindo ao Sistema de Análise de Planilhas!")
    print("\nPor favor, forneça os caminhos das 4 planilhas iniciais:")
    caminhos = []
    for i in range(4):
        caminho = input(f"Caminho da planilha {i+1}: ")
        caminhos.append(caminho)
    
    analisador.carregar_planilhas(caminhos)
    
    coluna1 = input("\nNome da primeira coluna para análise: ")
    coluna2 = input("Nome da segunda coluna para análise: ")
    
    analisador.extrair_dados(coluna1, coluna2)
    
    print("\nAgora, forneça o caminho da nova planilha para comparação:")
    nova_planilha = input("Caminho da nova planilha: ")
    
    analisador.comparar_com_nova_planilha(nova_planilha, coluna1, coluna2)
    print("\nGráficos gerados: 'comparacao.png' e 'distribuicao.png'")

if __name__ == "__main__":
    main() 