import { Search, X } from 'lucide-react';
import { focusById } from '../hooks/useShortcuts';
import { useStore, useUI } from '../store';
import { Menu } from './Menu';
import { Tabs } from './Tabs';
import { IconButton } from './ui';
import { ViewSwitch } from './ViewSwitch';

export function Header() {
  const searchOpen = useUI((s) => s.searchOpen);
  const query = useUI((s) => s.query);
  const view = useStore((s) => s.settings.view);

  const openSearch = () => {
    useUI.setState({ searchOpen: true, menuOpen: false });
    focusById('search');
  };
  const closeSearch = () => useUI.setState({ searchOpen: false, query: '' });

  return (
    <header className="header">
      <div className="header-top">
        {searchOpen ? (
          <div className="search">
            <Search size={16} aria-hidden />
            <input
              id="search"
              type="search"
              placeholder="Search all reminders"
              aria-label="Search reminders"
              autoComplete="off"
              value={query}
              onChange={(e) => useUI.setState({ query: e.target.value, selectedId: null })}
            />
            <IconButton label="Close search" onClick={closeSearch}>
              <X size={16} />
            </IconButton>
          </div>
        ) : (
          <>
            <ViewSwitch />
            <IconButton label="Search (/)" onClick={openSearch}>
              <Search size={18} />
            </IconButton>
          </>
        )}
        <Menu />
      </div>
      {view === 'list' && <Tabs />}
    </header>
  );
}
