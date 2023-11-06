'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react"


export default function Page({
  params,
}: {
  params: { orderId: string; };
}) {

  const [count, setCount] = useState(0);

  // Asi se toma la sessión desde el Cliente
  const { data: session, status } = useSession()

  useEffect(() => {
    console.log("Session", session)
    console.log("Starus", status)
  })

  return (
    <>
      <h3 className="text-xl font-bold mb-3">Esta es la orden {params.orderId}</h3>
      <p>Signed in as {JSON.stringify(session)}</p>
      <ul className='mb-5'>
        <li>
          Este componente es un componente del lado del cliente. Es decir se puede interactuar con los eventos del navegador o peticiones del lado del cliente.
        </li>
      </ul>
      <Link
        className="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        href="/dashboard/production-orders">
        Volver al listado
      </Link>
      <button
        className="text-white bg-blue-800 hover:bg-blue-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        type="button"
        onClick={() => { setCount(count + 1) }}
      >
        Boton con OnClick {count}
      </button>
    </>
  );
}
