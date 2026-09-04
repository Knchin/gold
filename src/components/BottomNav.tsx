import { Home, Calculator, BarChart3, Settings } from './Icons';

type Page = 'home' | 'calculator' | 'chart' | 'settings';

interface BottomNavProps {
  active: Page;
  onChange: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'calculator', label: 'Calculator', icon: Calculator },
  { id: 'chart', label: 'Chart', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/50 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="max-w-lg mx-auto flex justify-around">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`nav-item ${active === id ? 'nav-item-active' : 'nav-item-inactive'}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export type { Page };
