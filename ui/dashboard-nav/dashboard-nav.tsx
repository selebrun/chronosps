'use client';

import { navItems, type navItem } from '@/config/nav-links';
import Link from 'next/link';
import Image from 'next/image';
import { useSelectedLayoutSegment } from 'next/navigation';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { useState } from 'react';

export function DashboardNav() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);


  return (
    <div className="fixed top-0 z-10 flex w-full flex-col border-b border-gray-800 bg-gradient-to-t from-slate-900 to-indigo-950 lg:bottom-0 lg:z-auto lg:w-72 lg:border-b-0 lg:border-r lg:border-gray-800">
      <div className="flex h-14 items-center px-4 lg:h-auto my-5">
        <Link
          href="/"
          className="group flex w-full items-center gap-x-2.5"
          onClick={close}
        >
            <Image
                src="/logo-chronos-horizontal-w.png"
                width={180}
                height={38}
                alt="Chronos"
            />
        </Link>
      </div>

      <button
        type="button"
        className="group absolute right-0 top-0 flex h-14 items-center gap-x-2 px-4 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="font-medium text-gray-100 group-hover:text-gray-400">
          Menu
        </div>
        {isOpen ? (
          <XMarkIcon className="block w-6 h-6 text-gray-400" />
        ) : (
          <Bars3Icon className="block w-6 h-6 text-gray-400" />
        )}
      </button>

      <div
        className={clsx('overflow-y-auto lg:static lg:block', {
          'fixed inset-x-0 bottom-0 top-14 mt-px bg-black': isOpen,
          hidden: !isOpen,
        })}
      >
        <nav className="space-y-6 px-2 pb-24 pt-5">
          {navItems.map((section) => {
            return (
              <div key={section.name} className='mb-[4em]'>
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400/80">
                  <div>{section.name}</div>
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => (
                    <DashboardNavItem key={item.slug} item={item} close={close} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="py-2 px-4 absolute bottom-5">
        <p className="text-sm font-medium opacity-60 text-gray-50">©2023, by Chronos</p>
      </div>
      </div>
    </div>
  );
}

function DashboardNavItem({
  item,
  close,
}: {
  item: navItem;
  close: () => false | void;
}) {
  const segment = useSelectedLayoutSegment();
  const isActive = item.slug === segment;

  return (
    <Link
      onClick={close}
      href={`/${item.slug}`}
      className={clsx(
        'block rounded-md px-3 py-2 text-sm font-medium hover:text-gray-300',
        {
          'text-gray-400 hover:bg-sky-900': !isActive,
          'text-white': isActive,
        },
      )}
    >
      {item.name}
    </Link>
  );
}
