import { NextResponse } from 'next/server';
import { listAvailableBackups, runDailyBackupIfNeeded } from '@/lib/backup';

export async function GET() {
  try {
    // Executa rotina diária silenciosa se ainda não rodou hoje
    runDailyBackupIfNeeded();

    const backups = listAvailableBackups();
    return NextResponse.json({ backups });
  } catch (err: any) {
    console.error('Erro ao listar backups:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
