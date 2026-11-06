import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { exportFullDatabaseAsJson } from '@/lib/backup';
import { getDatabase } from '@/lib/sqlite';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'sqlite'; // 'sqlite' | 'json'
    const todayStr = new Date().toISOString().slice(0, 10);

    if (format === 'json') {
      const jsonData = exportFullDatabaseAsJson();
      const jsonString = JSON.stringify(jsonData, null, 2);

      return new Response(jsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="sistema_organizacao_backup_${todayStr}.json"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Exportação em SQLite (Compactado .db.gz)
    const dbPath = path.join(process.cwd(), 'data', 'local_calendar_sync.db');
    if (!fs.existsSync(dbPath)) {
      getDatabase();
    }

    const rawData = fs.readFileSync(dbPath);
    const compressed = zlib.gzipSync(rawData, { level: 9 });

    return new Response(compressed, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="sistema_organizacao_backup_${todayStr}.db.gz"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Erro na exportação de backup:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
