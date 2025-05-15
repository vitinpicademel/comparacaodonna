import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from analise_planilhas import AnalisadorPlanilhas
import pandas as pd
import matplotlib.pyplot as plt
import io
import base64

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sua_chave_secreta_aqui'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# Criar pasta de uploads se não existir
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'xlsx', 'xls'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    if 'files[]' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    files = request.files.getlist('files[]')
    coluna1 = request.form.get('coluna1')
    coluna2 = request.form.get('coluna2')
    
    if not coluna1 or not coluna2:
        return jsonify({'error': 'Colunas não especificadas'}), 400
    
    # Salvar arquivos
    caminhos_planilhas = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            caminhos_planilhas.append(filepath)
    
    if len(caminhos_planilhas) < 4:
        return jsonify({'error': 'São necessárias 4 planilhas'}), 400
    
    # Analisar planilhas
    analisador = AnalisadorPlanilhas()
    analisador.carregar_planilhas(caminhos_planilhas)
    analisador.extrair_dados(coluna1, coluna2)
    
    # Gerar gráficos
    plt.figure(figsize=(10, 6))
    plt.bar(['Soma Total'], [analisador.soma_total])
    plt.title('Soma Total das Planilhas')
    plt.ylabel('Valor Total')
    
    # Converter gráfico para base64
    img = io.BytesIO()
    plt.savefig(img, format='png')
    img.seek(0)
    grafico_base64 = base64.b64encode(img.getvalue()).decode()
    plt.close()
    
    return jsonify({
        'soma_total': float(analisador.soma_total),
        'grafico': grafico_base64
    })

@app.route('/comparar', methods=['POST'])
def comparar():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    coluna1 = request.form.get('coluna1')
    coluna2 = request.form.get('coluna2')
    soma_anterior = float(request.form.get('soma_anterior', 0))
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'Arquivo inválido'}), 400
    
    if not coluna1 or not coluna2:
        return jsonify({'error': 'Colunas não especificadas'}), 400
    
    # Salvar arquivo
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Analisar nova planilha
    analisador = AnalisadorPlanilhas()
    analisador.soma_total = soma_anterior
    resultado = analisador.comparar_com_nova_planilha(filepath, coluna1, coluna2)
    
    if resultado:
        # Gerar gráficos
        plt.figure(figsize=(10, 6))
        plt.bar(['Soma Anterior', 'Nova Planilha'], 
                [resultado['soma_anterior'], resultado['soma_nova']])
        plt.title('Comparação entre Soma Anterior e Nova Planilha')
        plt.ylabel('Valor Total')
        
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        grafico_comparacao = base64.b64encode(img.getvalue()).decode()
        plt.close()
        
        # Gráfico de pizza
        plt.figure(figsize=(8, 8))
        plt.pie([resultado['soma_anterior'], resultado['soma_nova']], 
                labels=['Soma Anterior', 'Nova Planilha'],
                autopct='%1.1f%%')
        plt.title('Distribuição dos Valores')
        
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        grafico_pizza = base64.b64encode(img.getvalue()).decode()
        plt.close()
        
        return jsonify({
            'soma_anterior': resultado['soma_anterior'],
            'soma_nova': resultado['soma_nova'],
            'diferenca': resultado['diferenca'],
            'percentual': resultado['percentual'],
            'grafico_comparacao': grafico_comparacao,
            'grafico_pizza': grafico_pizza
        })
    
    return jsonify({'error': 'Erro ao processar a comparação'}), 500

if __name__ == '__main__':
    app.run(debug=True) 