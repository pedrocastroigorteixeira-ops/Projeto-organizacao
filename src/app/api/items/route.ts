import { NextRequest, NextResponse } from 'next/server';
import { getAllAppItems, upsertAppItem, deleteAppItem, queueOutboxAction, getCalendarAuth } from '@/lib/sqlite';

export async function GET() {
  try {
    const items = getAllAppItems();
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const auth = getCalendarAuth('google');
    const isGoogleActive = !!(auth && auth.is_active);

    if (Array.isArray(body)) {
      for (const item of body) {
        upsertAppItem(item);
        if (isGoogleActive && item.scheduled_date) {
          queueOutboxAction(item.id, 'insert', item);
        }
      }
      return NextResponse.json({ success: true, count: body.length });
    }

    if (body.action === 'delete' && body.id) {
      deleteAppItem(body.id);
      if (isGoogleActive) {
        queueOutboxAction(body.id, 'delete', {});
      }
      return NextResponse.json({ success: true, deleted: body.id });
    }

    upsertAppItem(body);
    if (isGoogleActive && body.scheduled_date) {
      queueOutboxAction(body.id, 'update', body);
    }

    return NextResponse.json({ success: true, item: body });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
