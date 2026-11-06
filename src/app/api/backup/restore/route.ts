import { NextRequest, NextResponse } from 'next/server';
import {
  restoreBackupFromFile,
  restoreBackupFromBuffer,
  restoreDatabaseFromJson,
} from '@/lib/backup';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Caso 1: Upload via FormData (arquivo .db, .db.gz ou .json)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Nenhum arquivo enviado para restauração.' },
          { status: 400 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const jsonText = fileBuffer.toString('utf-8');
        const parsed = JSON.parse(jsonText);
        const result = restoreDatabaseFromJson(parsed);
        return NextResponse.json({
          success: true,
          message: 'Banco restaurado com sucesso a partir do arquivo JSON.',
          safetyBackup: result.safetyBackup,
          itemsRestored: result.itemsRestored,
        });
      }

      // Arquivo SQLite (.db ou .db.gz)
      const result = restoreBackupFromBuffer(fileBuffer);
      return NextResponse.json({
        success: true,
        message: 'Banco SQLite restaurado com sucesso.',
        safetyBackup: result.safetyBackup,
        restoredAt: result.restoredAt,
      });
    }

    // Caso 2: Restauração a partir de um arquivo já salvo na pasta de backups
    const body = await req.json().catch(() => ({}));
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        { error: 'Nome do arquivo de backup não informado.' },
        { status: 400 }
      );
    }

    const result = restoreBackupFromFile(filename);
    return NextResponse.json({
      success: true,
      message: `Banco restaurado a partir de ${filename}.`,
      safetyBackup: result.safetyBackup,
      restoredAt: result.restoredAt,
    });
  } catch (err: any) {
    console.error('Erro na restauração de backup:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
