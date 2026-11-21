import React from 'react';
import { Layers, Sparkles, Wand2, RefreshCw, Globe, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useWorkspaceStore, ActiveTab } from '../../store/workspaceStore';

export const Navbar: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const { activeTab, setActiveTab } = useWorkspaceStore();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'processing', label: t.nav.motionProcessing, icon: <Layers className="w-4 h-4" /> },
    { id: 'svga-editor', label: t.nav.svgaEditor, icon: <Wand2 className="w-4 h-4" /> },
    { id: 'batch', label: t.nav.batchConvert, icon: <RefreshCw className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 bg-[#0d0d11]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Brand Logo & Subtext */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/30">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              {t.appName}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              {t.freeBadge}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:block">
            {t.appTagline}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Language Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 hover:border-zinc-700 transition"
          title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
        >
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{t.nav.langToggle}</span>
        </button>
      </div>
    </header>
  );
};
