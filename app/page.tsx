import { navItems } from '@/config/nav-links';
import { options } from "./auth/[...nextauth]/options"
import { getServerSession } from "next-auth/next"
import Link from 'next/link';
import Login from './login/page';

export default async function Page() {
//   const session = await getServerSession(options)
// console.log(session, 'session')
  return (
    <div className="space-y-8">
    </div>
  );
}
