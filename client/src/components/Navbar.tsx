import React, { useState } from 'react';
import {
  Wind,
  LayoutDashboard,
  CalendarCheck,
  Bot,
  Home,
  Bike,
  Scale,
  Users,
  BookmarkCheck,
  MapPin,
  Menu,
  X
} from 'lucide-react';
import { LocationCoordinates } from '@shared/types';

export type NavTab =
  | 'landing'
  | 'dashboard'
  | 'plan'
  | 'assistant'
  | 'indoor'
  | 'sustainable'
  | 'impact'
  | 'community'
  | 'saved';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentLocation: LocationCoordinates | null;
  onOpenLocationModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentLocation,
  onOpenLocationModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', label: 'AQI Dashboard', icon: LayoutDashboard },
    { id: 'plan', label: 'Daily Action Plan', icon: CalendarCheck },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
    { id: 'indoor', label: 'Indoor Air Guide', icon: Home },
    { id: 'sustainable', label: 'Sustainable Living', icon: Bike },
    { id: 'impact', label: 'Impact Explainer', icon: Scale },
    { id: 'community', label: 'Family & Community', icon: Users },
    { id: 'saved', label: 'My Saved Actions', icon: BookmarkCheck }
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <button
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            aria-label="AirWise AI Home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-navy-900 shadow-md group-hover:scale-105 transition-transform">
              <Wind className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5">
                AirWise <span className="text-teal-400 font-black">AI</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1 font-medium">Urban Air Intelligence</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1" role="navigation" aria-label="Main Navigation">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Location Quick-Pill & Mobile Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenLocationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-slate-700/80 text-xs font-medium text-slate-200 hover:border-teal-500/60 hover:text-teal-300 transition-all shadow-sm"
              aria-label={`Current location: ${currentLocation ? currentLocation.name : 'Select location'}. Click to change.`}
            >
              <MapPin className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {currentLocation ? currentLocation.name : 'Select City'}
              </span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-navy-800 border border-slate-700 text-slate-300 hover:text-white focus:outline-none"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-navy-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1 shadow-2xl">
          <button
            onClick={() => handleNavClick('landing')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold ${
              currentTab === 'landing' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span>Overview & Mission</span>
          </button>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold ${
                  isActive ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300 hover:bg-slate-800'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
