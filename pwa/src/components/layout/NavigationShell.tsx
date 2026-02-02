import { NavLink } from 'react-router-dom';
import { CalendarIcon, ShoppingCartIcon, ChefHatIcon, SettingsIcon, SearchIcon, BookOpenIcon } from '../icons';
import { useUIStore } from '@stores/ui-store';

interface NavigationShellProps {
  variant: 'bottom' | 'sidebar';
}

interface NavItem {
  id: 'plan' | 'shop' | 'cook' | 'recipes';
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'plan', label: 'Plan', path: '/plan', icon: CalendarIcon },
  { id: 'recipes', label: 'Recipes', path: '/recipes', icon: BookOpenIcon },
  { id: 'shop', label: 'Shop', path: '/shop', icon: ShoppingCartIcon },
  { id: 'cook', label: 'Cook', path: '/cook', icon: ChefHatIcon },
];

/**
 * Navigation Shell - Primary navigation component
 * 
 * Renders as:
 * - Bottom bar on mobile (< 768px)
 * - Collapsible sidebar on desktop (≥ 768px)
 * 
 * Includes:
 * - Plan, Shop, Cook tabs with icons
 * - Global search button
 * - Settings access
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export function NavigationShell({ variant }: NavigationShellProps) {
  const { openModal } = useUIStore();

  const handleSearchClick = () => {
    openModal('search');
  };

  if (variant === 'bottom') {
    return (
      <nav 
        className="bg-white border-t border-gray-200 safe-area-inset-bottom dark:bg-gray-900 dark:border-gray-700"
        role="navigation"
        aria-label="Main navigation"
        data-testid="navigation-bottom"
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`
              }
              aria-label={item.label}
            >
              <item.icon className="w-6 h-6 mb-1" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={handleSearchClick}
            className="flex flex-col items-center justify-center px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Search recipes"
          >
            <SearchIcon className="w-6 h-6 mb-1" aria-hidden="true" />
            <span>Search</span>
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`
            }
            aria-label="Settings"
          >
            <SettingsIcon className="w-6 h-6 mb-1" aria-hidden="true" />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>
    );
  }

  // Sidebar variant for desktop
  return (
    <nav 
      className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col dark:bg-gray-900 dark:border-gray-700"
      role="navigation"
      aria-label="Main navigation"
      data-testid="navigation-sidebar"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          Sous Chef
        </h1>
      </div>
      
      {/* Search button */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSearchClick}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          aria-label="Search recipes"
        >
          <SearchIcon className="w-5 h-5 mr-3" aria-hidden="true" />
          <span>Search</span>
          <kbd className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded dark:bg-gray-700">
            ⌘K
          </kbd>
        </button>
      </div>
      
      <div className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`
            }
            aria-label={item.label}
          >
            <item.icon className="w-5 h-5 mr-3" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
      
      <div className="border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 text-sm transition-colors ${
              isActive
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
            }`
          }
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5 mr-3" aria-hidden="true" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
