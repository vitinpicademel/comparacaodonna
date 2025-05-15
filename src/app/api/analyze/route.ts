import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { AnalisadorPlanilhas } from '@/lib/analisador';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files[]') as File[];
    const coluna1 = formData.get('coluna1') as string;
    const coluna2 = formData.get('coluna2') as string;

    if (files.length !== 4) {
      return NextResponse.json(
        { error: 'São necessárias 4 planilhas' },
        { status: 400 }
      );
    }

    // Criar pasta de uploads se não existir
    const uploadDir = join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Salvar arquivos
    const caminhos_planilhas = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const path = join(uploadDir, file.name);
        await writeFile(path, buffer);
        return path;
      })
    );

    // Analisar planilhas
    const analisador = new AnalisadorPlanilhas();
    analisador.carregar_planilhas(caminhos_planilhas);
    analisador.extrair_dados(coluna1, coluna2);

    return NextResponse.json({
      soma_total: analisador.soma_total,
    });
  } catch (error) {
    console.error('Erro ao processar planilhas:', error);
    return NextResponse.json(
      { error: 'Erro ao processar as planilhas' },
      { status: 500 }
    );
  }
} 