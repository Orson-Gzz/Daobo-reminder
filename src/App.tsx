import { CalendarView } from './components/CalendarView';
import { CompletedList, ReminderList } from './components/ReminderList';
import { DragLayer } from './components/DragLayer';
import { Header } from './components/Header';
import { ImportDialog, ShortcutsHelp } from './components/Dialogs';
import { QuickAdd } from './components/QuickAdd';
import { Toast } from './components/Toast';
import { cx } from './components/ui';
import { ViewSwitch } from './components/ViewSwitch';
import { useClock, useDocumentState, useStorageSync } from './hooks/useAppSync';
import { useNotifications } from './hooks/useNotifications';
import { useShortcuts } from './hooks/useShortcuts';
import { useStore, useUI } from './store';

export default function App() {
  useClock();
  useStorageSync();
  useDocumentState();
  useNotifications();
  useShortcuts();
  const tab = useUI((s) => s.tab);
  const view = useStore((s) => s.settings.view);

  return (
    <DragLayer>
      <div className={cx('app', view === 'calendar' && 'wide')}>
        <aside className="sidebar">
          <ViewSwitch />
        </aside>
        <div className="workspace">
          <Header />
          {view === 'calendar' ? (
            <main>
              <CalendarView />
            </main>
          ) : (
            <main id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {tab === 'done' ? (
                <CompletedList />
              ) : (
                <>
                  <QuickAdd key={tab} section={tab} />
                  <ReminderList section={tab} />
                </>
              )}
            </main>
          )}
        </div>
      </div>
      <Toast />
      <ShortcutsHelp />
      <ImportDialog />
    </DragLayer>
  );
}
