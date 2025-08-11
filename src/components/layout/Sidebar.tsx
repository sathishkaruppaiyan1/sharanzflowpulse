
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Printer,
  PackageCheck,
  Search,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: Package },
  { name: 'Printing', href: '/printing', icon: Printer },
  { name: 'Packing', href: '/packing', icon: PackageCheck },
  { name: 'Tracking', href: '/tracking', icon: Search },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Users', href: '/users', icon: Users },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="bg-gray-900 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <Link to="/" className="text-white flex items-center space-x-2 px-4">
        <Package className="w-8 h-8" />
        <span className="text-2xl font-extrabold">Blitz Ship</span>
      </Link>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'text-white hover:bg-gray-700 hover:text-white group flex items-center px-2 py-2 text-base font-medium rounded-md',
                location.pathname === item.href && 'bg-gray-800'
              )}
            >
              <Icon className="text-gray-300 mr-4 flex-shrink-0 h-6 w-6" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
