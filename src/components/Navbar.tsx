import { useState } from 'react';
import { ChevronDown, LogOut, Menu, Shield, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export type AppView = 'overview' | 'species' | 'analyze' | 'learn' | 'admin';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenProfileModal: () => void;
}

export function Navbar({
  activeView,
  onNavigate,
  onOpenProfileModal,
}: NavbarProps) {
  const { firebaseUser, profile, loading, signIn, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'species', label: 'Species Explorer' },
    { id: 'analyze', label: 'Analyze & Reports' },
    { id: 'learn', label: 'Learning Hub' },
  ];

  const handleNav = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#D8E5E1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand mark and wordmark */}
        <button
          type="button"
          onClick={() => handleNav('overview')}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0B2528] hover:text-emerald-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <img
            src="/assets/aistudio/file_00000000dfdc82119d820d7ad8217f01_cec9d5e9.png"
            alt="eDNA Explorer logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
          <span>eDNA Explorer</span>
        </button>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 ${
                  isActive
                    ? 'text-emerald-800 border-emerald-700'
                    : 'text-[#4A6366] border-transparent hover:text-[#0B2528] hover:border-[#B5CCC5]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {!loading && !firebaseUser && (
            <button
              type="button"
              onClick={signIn}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Sign In
            </button>
          )}

          {!loading && firebaseUser && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <span className="max-w-[140px] truncate">
                  {profile?.displayName || firebaseUser.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-[#4A6366]" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 bg-white border border-[#D8E5E1] rounded-xl shadow-lg py-1.5 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-[#E7F0ED]">
                    <p className="text-sm font-semibold text-[#0B2528] truncate">
                      {profile?.displayName || 'Researcher'}
                    </p>
                    <p className="text-xs text-[#4A6366] truncate">
                      {firebaseUser.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-[#0B2528] hover:bg-[#F0F6F4] flex items-center gap-2.5"
                  >
                    <User className="w-4 h-4 text-[#4A6366]" />
                    <span>Researcher Profile</span>
                  </button>

                  {profile?.role === 'admin' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleNav('admin')}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-sky-800 hover:bg-sky-50 flex items-center gap-2.5"
                    >
                      <Shield className="w-4 h-4 text-sky-700" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <div className="border-t border-[#E7F0ED] mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        if (activeView === 'admin') onNavigate('overview');
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-rose-700 hover:bg-rose-50 flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-[#0B2528] hover:bg-[#F0F6F4]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#D8E5E1] bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeView === item.id
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-[#4A6366] hover:bg-[#F0F6F4]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
