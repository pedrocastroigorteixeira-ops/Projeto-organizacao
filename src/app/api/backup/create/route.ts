import { NextResponse } from 'next/server';
import { createCompressedBackup } from '@/lib/backup';

export async function POST() {
  try {
    const backup = createCompressedBackup('manual');
    return NextResponse.json({
      success: true,
      message: 'Backup manual gerado com sucesso.',
      backup,
    });
  } catch (err: any) {
    console.error('Erro ao gerar backup manual:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
