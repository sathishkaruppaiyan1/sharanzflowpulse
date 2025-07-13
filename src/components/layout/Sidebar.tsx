
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Printer, 
  PackageCheck, 
  Truck, 
  BarChart3,
  Settings,
  Home,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const location = useLocation();

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Orders', href: '/orders', icon: Package },
    { name: 'Printing', href: '/printing', icon: Printer },
    { name: 'Packing', href: '/packing', icon: PackageCheck },
    { name: 'Tracking', href: '/tracking', icon: Truck },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const adminItems = [
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 lg:w-64 md:w-48 sm:w-16 flex-col bg-white border-r border-gray-200 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center h-16 px-2 sm:px-4 lg:px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Flow Pulse OFS
            </h1>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-2 sm:px-4 lg:px-6 py-4 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center justify-center sm:justify-start px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive(item.href)
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5 sm:mr-3" />
              <span className="hidden sm:block">{item.name}</span>
            </Link>
          );
        })}

        {(user.role === 'admin' || user.role === 'manager') && (
          <>
            <Separator className="my-4" />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center justify-center sm:justify-start px-2 sm:px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5 sm:mr-3" />
                  <span className="hidden sm:block">{item.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-2 sm:px-4 py-4 border-t border-gray-200">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-center sm:justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 sm:px-3"
        >
          <LogOut className="h-5 w-5 sm:mr-3" />
          <span className="hidden sm:block">Sign Out</span>
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
