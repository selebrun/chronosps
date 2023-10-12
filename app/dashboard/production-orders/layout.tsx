import React from 'react';

const title = 'Production Orders';

export const metadata = {
  title,
  openGraph: {
    title,
    images: [`/api/og?title=${title}`],
  },
};

export default async function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-9">
      <h1>Dashbboard Mi layout - Este layout se comparte con todos los hijos de la ruta</h1>
      <div>{children}</div>
    </div>
  );
}
