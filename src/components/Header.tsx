import { useEffect } from 'react';
import { focusById } from '../hooks/useShortcuts';
import { CalendarDaysIcon, MenuIcon, SearchIcon, XIcon } from '../icons';
import { useStore, useUI } from '../store';
import { SECTION_NAME } from '../types';
import { SECTION_ICON } from './Sidebar';
import { IconButton, useIconAnimation } from './ui';

export function Header() {
  const searchOpen = useUI((s) => s.searchOpen);
  const query = useUI((s) => s.query);
  const tab = useUI((s) => s.tab);
  const view = useStore((s) => s.settings.view);
  const Icon = view === 'calendar' ? CalendarDaysIcon : SECTION_ICON[tab];
  const icon = useIconAnimation();

  // Play the section icon once whenever the page changes.
  useEffect(() => {
    icon.ref.current?.startAnimation();
  }, [icon.ref, Icon]);

  const openSearch = () => {
    useUI.setState({ searchOpen: true, menuOpen: false });
    focusById('search');
  };
  const closeSearch = () => useUI.setState({ searchOpen: false, query: '' });

  return (
    <header className="header">
      <div className="header-top">
        <IconButton
          label="Open navigation"
          icon={MenuIcon}
          size={18}
          className="nav-toggle"
          onClick={() => useUI.setState({ navOpen: true, menuOpen: false })}
        />
        <h1 className="page-title" onMouseEnter={icon.triggers.onMouseEnter} onMouseLeave={icon.triggers.onMouseLeave}>
          <Icon ref={icon.ref} className="page-icon" aria-hidden />
          {view === 'calendar' ? 'Calendar' : SECTION_NAME[tab]}
        </h1>
        {!searchOpen && <IconButton label="Search (/)" icon={SearchIcon} size={18} onClick={openSearch} />}
      </div>
      {searchOpen && (
        <div className="search">
          <SearchIcon size={16} aria-hidden />
          <input
            id="search"
            type="search"
            placeholder="Search all reminders"
            aria-label="Search reminders"
            autoComplete="off"
            value={query}
            onChange={(e) => useUI.setState({ query: e.target.value, selectedId: null })}
          />
          <IconButton label="Close search" icon={XIcon} onClick={closeSearch} />
        </div>
      )}
    </header>
  );
}
