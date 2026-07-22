import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { config } from '@/auth';
import { getSharedWorkOrderTimer } from '@/app/api/workOrderTimers/workOrderTimers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: { workOrderId: string } }
) {
  const session = await getServerSession(config);
  if (!session?.user) {
    return NextResponse.json(
      { status: false, message: 'Sesion no valida.' },
      { status: 401 }
    );
  }

  const workOrderId = Number(params.workOrderId);
  if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
    return NextResponse.json(
      { status: false, message: 'Orden de trabajo no valida.' },
      { status: 400 }
    );
  }

  try {
    const timer = await getSharedWorkOrderTimer(session.user, workOrderId);
    const response = NextResponse.json(timer);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  } catch (error) {
    console.error(`Error consultando reloj compartido de OT ${workOrderId}:`, error);
    return NextResponse.json(
      { status: false, message: 'No se pudo consultar el reloj compartido.' },
      { status: 500 }
    );
  }
}
