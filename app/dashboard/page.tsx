
import { navItems } from '@/config/nav-links';
import Link from 'next/link';
import { getServerSession } from 'next-auth'
import { config } from '@/auth';

export default async function Page() {
  const session = await getServerSession(config);
  const user = session.user;
  const navSections =  navItems.map((item: any) => ({
                      ...item,
                      items: item.items.filter((subItem: any) => subItem.role.includes(user.role)),
                    }));
  

  return (
    <div className="space-y-8">
      <div className="space-y-10">
        {navSections.map( section => (
          <div key={section.name} className="space-y-5">
            <div className="text-xs font-semibold uppercase tracking-wider">
              {section.name}
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {section.items.map((item: any) => (
                <Link
                  href={`/dashboard/${item.slug}`}
                  key={item.name}
                  className="group block space-y-1.5 rounded-lg bg-gray-200 px-5 py-3 hover:bg-sky-950"
                >
                  <div className="font-medium group-hover:text-gray-50">
                    {item.name}
                  </div>

                  {item.description && (
                    <div className="line-clamp-3 text-sm group-hover:text-gray-300">
                      {item.description}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
