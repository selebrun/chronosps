import { notFound } from 'next/navigation';

// `server-only` guarantees any modules that import code in file
// will never run on the client. Even though this particular api
// doesn't currently use sensitive environment variables, it's
// good practise to add `server-only` preemptively.
import 'server-only';

export async function getOrders() {
  const res = await fetch(
    `https://rickandmortyapi.com/api/character`,
  );

  if (!res.ok) {
    // Render the closest `error.js` Error Boundary
    throw new Error('Something went wrong!');
  }

  const orders = (await res.json());

  if (orders.results.length === 0) {
    // Render the closest `not-found.js` Error Boundary
    notFound();
  }

  return orders.results;
}
