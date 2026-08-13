import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config } from '@/auth';
import { getSharedWorkOrderTimers } from '@/app/api/workOrderTimers/workOrderTimers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const session = await getServerSession(config);
  if (!session?.user) {
    return NextResponse.json(
      { status: false, message: 'Sesion no valida.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const workOrderIds = Array.from(new Set(
    (url.searchParams.get('ids') || '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0)
  )).slice(0, 500);

  if (!workOrderIds.length) {
    return NextResponse.json(
      { status: false, message: 'Debe indicar al menos una orden de trabajo.' },
      { status: 400 }
    );
  }

  try {
    const timers = await getSharedWorkOrderTimers(session.user, workOrderIds);
    const response = NextResponse.json({ status: true, data: timers });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error('Error consultando relojes compartidos de OT:', error);
    return NextResponse.json(
      { status: false, message: 'No se pudieron consultar los relojes compartidos.' },
      { status: 500 }
    );
  }
}
