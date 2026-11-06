import { NextRequest, NextResponse } from 'next/server';
import { getAllAppItems } from '@/lib/sqlite';
import { generateICalFeed } from '@/lib/ical';
import { INITIAL_AREAS } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const items = getAllAppItems();
    const icalContent = generateICalFeed(items, INITIAL_AREAS);

    return new Response(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="agenda-sistema-organizacao.ics"',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Erro ao gerar feed iCal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
