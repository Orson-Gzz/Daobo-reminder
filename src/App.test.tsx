import { render, screen, waitFor, within } from '@testing-library/react';
import { addDays } from 'date-fns';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { toDateKey } from './lib/dates';
import { useStore, useUI } from './store';

const TODAY = toDateKey(new Date());

beforeEach(() => {
  useStore.setState({ reminders: [] });
  useStore.getState().setSettings({
    notifications: false,
    view: 'list',
    calendarShow: { todo: true, waiting: true },
    collapsedZones: { todo: [], waiting: [] },
  });
  useUI.setState({
    tab: 'todo',
    query: '',
    searchOpen: false,
    expandedId: null,
    selectedId: null,
    toast: null,
    selectedDate: TODAY,
  });
});

const list = () => screen.getByRole('tabpanel');
const tab = (name: RegExp) => screen.getByRole('tab', { name });

describe('App', () => {
  it('adds a reminder, completes it, and restores it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('Add to To-do'), 'Buy milk{Enter}');
    expect(within(list()).getByText('Buy milk')).toBeInTheDocument();
    expect(tab(/To-do/)).toHaveTextContent('1');

    await user.click(screen.getByRole('checkbox', { name: 'Complete “Buy milk”' }));
    expect(within(list()).queryByText('Buy milk')).not.toBeInTheDocument();
    expect(screen.getByText('Completed “Buy milk”')).toBeInTheDocument();

    await user.click(tab(/Completed/));
    expect(within(list()).getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'Restore “Buy milk”' }));
    await user.click(tab(/To-do/));
    expect(within(list()).getByText('Buy milk')).toBeInTheDocument();
  });

  it('moves a reminder to Awaiting Reply and records who', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(tab(/Awaiting Reply/));
    await user.type(screen.getByLabelText('Add to Awaiting Reply'), 'Quote for roof @Dana{Enter}');
    expect(within(list()).getByText('Quote for roof')).toBeInTheDocument();
    expect(within(list()).getByText(/from Dana/)).toBeInTheDocument();

    await user.click(tab(/To-do/));
    await user.type(screen.getByLabelText('Add to To-do'), 'Follow up with bank{Enter}');
    await user.click(screen.getByRole('button', { name: 'Move to Awaiting Reply (w)' }));
    expect(within(list()).queryByText('Follow up with bank')).not.toBeInTheDocument();
    expect(tab(/Awaiting Reply/)).toHaveTextContent('2');
  });

  it('deletes with undo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Add to To-do'), 'Temp{Enter}');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(within(list()).queryByText('Temp')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(within(list()).getByText('Temp')).toBeInTheDocument();
  });

  it('edits details inline', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Add to To-do'), 'Dentist{Enter}');
    await user.click(within(list()).getByText('Dentist'));

    await user.type(screen.getByLabelText('Notes'), 'Bring insurance card');
    await user.click(screen.getByRole('button', { name: '!!!' }));
    // Due shortcuts stay hidden until asked for, and fold away once used.
    expect(screen.queryByRole('button', { name: 'Tomorrow' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Shortcuts' }));
    await user.click(screen.getByRole('button', { name: 'Tomorrow' }));
    expect(screen.queryByRole('button', { name: 'Tomorrow' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));

    const r = useStore.getState().reminders[0];
    expect(r).toMatchObject({ notes: 'Bring insurance card', priority: 3, dueTime: '09:00' });
    expect(within(list()).getByText(/Tomorrow 9:00 AM/)).toBeInTheDocument();
    expect(within(list()).getByText('Bring insurance card')).toBeInTheDocument();
  });

  it('groups reminders into collapsible priority zones', async () => {
    const user = userEvent.setup();
    render(<App />);
    const zone = (name: string) => within(list()).getByRole('region', { name });

    await user.type(screen.getByLabelText('Add to To-do'), 'Taxes{Enter}Laundry{Enter}');
    expect(within(zone('No priority')).getByText('Taxes')).toBeInTheDocument();
    expect(within(zone('High priority')).getByText('Nothing here')).toBeInTheDocument();

    await user.click(within(list()).getByText('Taxes'));
    await user.click(screen.getByRole('button', { name: '!!!' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(within(zone('High priority')).getByText('Taxes')).toBeInTheDocument();
    expect(within(zone('No priority')).queryByText('Taxes')).not.toBeInTheDocument();

    // Folding a zone hides its rows but keeps the count.
    const noneHead = within(zone('No priority')).getByRole('button', { expanded: true });
    await user.click(noneHead);
    expect(noneHead).toHaveAttribute('aria-expanded', 'false');
    expect(within(list()).queryByText('Laundry')).not.toBeInTheDocument();
    expect(within(noneHead).getByText('1')).toBeInTheDocument();
    expect(useStore.getState().settings.collapsedZones.todo).toEqual([0]);

    // Adding a reminder unfolds the None zone again.
    await user.type(screen.getByLabelText('Add to To-do'), 'Groceries{Enter}');
    expect(within(zone('No priority')).getByText('Laundry')).toBeInTheDocument();
  });

  it('searches across sections and supports keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Add to To-do'), 'Alpha{Enter}Beta{Enter}');
    await user.keyboard('{Escape}');

    await user.keyboard('/');
    await user.type(screen.getByLabelText('Search reminders'), 'alp');
    expect(within(list()).getByText('Alpha')).toBeInTheDocument();
    expect(within(list()).queryByText('Beta')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');

    // Select the first item (Beta, newest on top) and complete it with "x".
    await user.keyboard('jx');
    expect(within(list()).queryByText('Beta')).not.toBeInTheDocument();
    await user.keyboard('3');
    expect(tab(/Completed/)).toHaveAttribute('aria-selected', 'true');
    expect(within(list()).getByText('Beta')).toBeInTheDocument();
  });
});

describe('notifications', () => {
  const shown: { title: string; body?: string }[] = [];

  beforeEach(() => {
    shown.length = 0;
    class FakeNotification {
      static permission = 'granted';
      onclick: (() => void) | null = null;
      constructor(title: string, options?: NotificationOptions) {
        shown.push({ title, body: options?.body });
      }
      close() {}
    }
    vi.stubGlobal('Notification', FakeNotification);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires once for a reminder that has come due', async () => {
    const r = useStore.getState().add({ title: 'Call Sam back', status: 'waiting', waitingOn: 'Sam' });
    useStore.getState().update(r.id, { dueDate: '2020-01-01', dueTime: '09:00' });
    useStore.getState().setSettings({ notifications: true });

    render(<App />);
    await waitFor(() => expect(shown).toHaveLength(1));
    expect(shown).toEqual([{ title: 'Call Sam back', body: 'Follow up with Sam' }]);
    expect(useStore.getState().reminders[0].notifiedAt).not.toBeNull();

    // A later clock tick doesn't fire it again.
    useUI.setState({ now: Date.now() + 60_000 });
    expect(shown).toHaveLength(1);
  });
});

describe('calendar', () => {
  const grid = () => document.querySelector<HTMLElement>('.month')!;
  const agenda = () => screen.getByRole('region', { name: /^Reminders on/ });
  const tray = () => screen.getByRole('region', { name: 'No date' });

  it('switches views with the title switch and the C key', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(useStore.getState().settings.view).toBe('calendar');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(grid()).toBeInTheDocument();

    await user.keyboard('c');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    await user.keyboard('c');
    expect(grid()).toBeInTheDocument();

    // A section number jumps back to the list.
    await user.keyboard('2');
    expect(useStore.getState().settings.view).toBe('list');
    expect(tab(/Awaiting Reply/)).toHaveAttribute('aria-selected', 'true');
  });

  it('shows dated items in the grid and agenda, undated ones in the tray', async () => {
    const { add } = useStore.getState();
    add({ title: 'Dentist', status: 'todo', dueDate: TODAY });
    add({ title: 'Roof quote', status: 'waiting', waitingOn: 'Dana', dueDate: TODAY });
    add({ title: 'Someday', status: 'todo' });
    useStore.getState().setSettings({ view: 'calendar' });

    const user = userEvent.setup();
    render(<App />);
    expect(within(grid()).getByText('Dentist')).toBeInTheDocument();
    expect(within(grid()).getByText('Roof quote')).toBeInTheDocument();
    expect(within(agenda()).getByText('Dentist')).toBeInTheDocument();
    expect(within(agenda()).getByLabelText('Awaiting Reply')).toBeInTheDocument();
    expect(within(tray()).getByText('Someday')).toBeInTheDocument();
    expect(within(grid()).queryByText('Someday')).not.toBeInTheDocument();

    // Hide Awaiting Reply items.
    await user.click(screen.getByRole('button', { name: 'Awaiting' }));
    expect(within(grid()).queryByText('Roof quote')).not.toBeInTheDocument();
    expect(within(grid()).getByText('Dentist')).toBeInTheDocument();
  });

  it('adds reminders dated to the selected day', async () => {
    useStore.getState().setSettings({ view: 'calendar' });
    const user = userEvent.setup();
    render(<App />);

    // Move to tomorrow with the keyboard, then add.
    await user.keyboard('{ArrowRight}');
    const tomorrow = toDateKey(addDays(new Date(), 1));
    expect(useUI.getState().selectedDate).toBe(tomorrow);

    const input = within(agenda()).getByRole('textbox');
    await user.type(input, 'Pay rent{Enter}Contract @Lee{Enter}');
    const [contract, rent] = useStore.getState().reminders;
    expect(rent).toMatchObject({ title: 'Pay rent', status: 'todo', dueDate: tomorrow });
    expect(contract).toMatchObject({ title: 'Contract', status: 'waiting', waitingOn: 'Lee', dueDate: tomorrow });
    expect(within(agenda()).getByText('Pay rent')).toBeInTheDocument();
  });

  it('opens an item in the agenda when its chip is clicked', async () => {
    const tomorrow = toDateKey(addDays(new Date(), 1));
    useStore.getState().add({ title: 'Haircut', status: 'todo', dueDate: tomorrow });
    useStore.getState().setSettings({ view: 'calendar' });
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(grid()).getByText('Haircut'));
    expect(useUI.getState().selectedDate).toBe(tomorrow);
    expect(within(agenda()).getByLabelText('Notes')).toBeInTheDocument();
  });
});
