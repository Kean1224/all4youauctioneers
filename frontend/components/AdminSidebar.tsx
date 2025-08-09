import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/auctions', label: 'Auctions' },
  { href: '/admin/lots', label: 'Lots' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/invoices', label: 'Invoices' },
  { href: '/admin/payments', label: '💰 Payments' },
  { href: '/admin/assign-seller', label: 'Assign Seller' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex bg-gradient-to-b from-[#1a2a2f] to-[#22343a] border-r border-white/10 min-h-screen w-56 p-6 flex-col gap-4 sticky top-0 shadow-xl">
        <h2 className="text-xl font-extrabold text-green-400 mb-6 tracking-wide">Admin Panel</h2>
        <nav className="flex flex-col gap-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 rounded-lg font-semibold transition-all text-green-100 hover:bg-green-800/60 hover:text-white ${pathname === link.href ? 'bg-green-700/80 text-white shadow-lg' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile Sidebar */}
      <aside className="md:hidden fixed top-0 left-0 w-full h-full bg-black bg-opacity-95 z-50 shadow-2xl flex flex-col items-start justify-start pt-16 pb-8 px-0 overflow-y-auto">
        <div className="w-full space-y-4 px-4">
          <h2 className="text-2xl font-extrabold text-green-400 mb-6 tracking-wide text-center w-full">Admin Panel</h2>
          <nav className="flex flex-col gap-4 w-full">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block w-full px-4 py-4 bg-green-700 text-white rounded-xl transition-all duration-200 hover:bg-green-800 text-lg font-bold shadow border-2 border-green-400 text-center ${pathname === link.href ? 'bg-green-900 text-yellow-300 shadow-lg' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
