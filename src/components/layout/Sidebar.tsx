import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Package,
  Printer,
  PackageCheck,
  Truck,
  Ship,
  BarChart3,
  Settings,
  Home,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useWorkflowSettings } from '@/hooks/useWorkflowSettings';
import { useStageCounts, StageCounts } from '@/hooks/useStageCounts';

interface SidebarProps {
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hiddenWhenBypass?: boolean;
  adminOnly?: boolean;
  countKey?: keyof StageCounts;
};

const Sidebar = ({ user, onLogout }: SidebarProps) => {
  const location = useLocation();
  const { settings } = useWorkflowSettings();
  const [bypassPacking, setBypassPacking] = useState(false);
  const { data: stageCounts } = useStageCounts();

  useEffect(() => {
    setBypassPacking(settings.bypassPacking);
  }, [settings.bypassPacking]);

  const allNavigationItems: NavItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Orders', href: '/orders', icon: Package },
    { name: 'Printing', href: '/printing', icon: Printer, countKey: 'printing' },
    { name: 'Packing', href: '/packing', icon: PackageCheck, hiddenWhenBypass: true, countKey: 'packing' },
    { name: 'Tracking', href: '/tracking', icon: Truck, countKey: 'tracking' },
    { name: 'Shipping', href: '/shipping', icon: Ship, countKey: 'shipped' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  ];

  const navigationItems = allNavigationItems.filter(
    item => !(item.hiddenWhenBypass && bypassPacking) && !(item.adminOnly && user.role !== 'admin')
  );

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
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Flow Pulse OFS
            </h1>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const count = item.countKey ? stageCounts?.[item.countKey] : undefined;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <span className="flex items-center min-w-0">
                <Icon className="mr-3 h-5 w-5 shrink-0" />
                <span className="truncate">{item.name}</span>
              </span>
              {count !== undefined && (
                <span
                  className={cn(
                    'ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-semibold tabular-nums',
                    active
                      ? 'bg-blue-600 text-white'
                      : count > 0
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}

        {user.role === 'admin' && (
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
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-200">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
