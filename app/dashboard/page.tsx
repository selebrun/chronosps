
import { navItems } from '@/config/nav-links';
import Link from 'next/link';
import { getServerSession } from 'next-auth'
import { config } from '@/auth';
import { isCompanyAdministrator } from '@/app/api/companies/companies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function roleCanSeeItem(item: any, userRole: string = "", isCompanyAdmin = false) {
  const normalizedUserRole = userRole.toString().trim();
  const roleAllowed = (item?.role || []).some((role: string) => role.toString().trim() === normalizedUserRole);
  return roleAllowed && (!item?.companyAdminOnly || isCompanyAdmin);
}

export default async function Page() {
  const session = await getServerSession(config);
  if (!session?.user) return null;
  const user = session.user;
  const isCompanyAdmin = await isCompanyAdministrator(user);
  const navSections =  navItems.map((item: any) => ({
                      ...item,
                      items: item.items.filter((subItem: any) => roleCanSeeItem(subItem, user.role, isCompanyAdmin)),
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
