import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-error';
import { toDisplayError } from '../api/error-message';
import { Corners } from './Blueprint';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';
import { Icon, type IconName } from './Icon';
import { ListControls, type ListControlsValue } from './ListControls';
import { Pagination } from './Pagination';
import { TableSkeleton } from './TableSkeleton';
import { Timestamp, formatTimestamp } from './Timestamps';
import { TOAST_DURATION_MS, ToastProvider, useToast } from './Toast';

afterEach(() => {
  vi.useRealTimers();
});

describe('Corners', () => {
  it('GIVEN a blueprint frame WHEN rendered THEN four decorative registration marks are present', () => {
    const { container } = render(
      <div className="blueprint">
        <Corners />
      </div>,
    );

    const marks = [...container.querySelectorAll('.blueprint > i.corner')];
    expect(marks.map((mark) => mark.className)).toEqual([
      'corner tl',
      'corner tr',
      'corner bl',
      'corner br',
    ]);
    expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true')).toBe(true);
  });
});

describe('Icon', () => {
  const names: IconName[] = [
    'brackets',
    'trash',
    'pencil',
    'chevronLeft',
    'chevronRight',
    'arrowLeft',
    'alertTriangle',
    'checkCircle',
    'close',
    'upload',
    'download',
    'copy',
  ];

  it.each(names)(
    'GIVEN the %s icon WHEN rendered THEN it is a decorative Lucide svg at stroke-width 1.5',
    (name) => {
      const { container } = render(<Icon name={name} />);
      const svg = container.querySelector('svg')!;

      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('stroke-width', '1.5');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg.children.length).toBeGreaterThan(0);
    },
  );

  it('GIVEN a size WHEN rendered THEN width and height follow it', () => {
    const { container } = render(<Icon name="copy" size={30} />);

    expect(container.querySelector('svg')).toHaveAttribute('width', '30');
  });
});

describe('Timestamps', () => {
  it('GIVEN an ISO instant WHEN formatted THEN it is pinned to en-US and UTC', () => {
    expect(formatTimestamp('2026-09-21T10:05:00.000Z')).toBe('Sep 21, 2026, 10:05 UTC');
    expect(formatTimestamp('2026-01-01T23:59:00.000Z')).toBe('Jan 1, 2026, 23:59 UTC');
  });

  it('GIVEN an ISO instant WHEN rendered THEN <time dateTime> keeps the exact instant', () => {
    render(<Timestamp value="2026-09-21T10:05:00.123Z" />);

    const time = screen.getByText('Sep 21, 2026, 10:05 UTC');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('datetime', '2026-09-21T10:05:00.123Z');
  });

  it('GIVEN an unparsable value WHEN formatted THEN it is shown as is', () => {
    expect(formatTimestamp('not a date')).toBe('not a date');
  });
});

describe('Dialog', () => {
  function Harness({ role }: { role?: 'dialog' | 'alertdialog' }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        {open ? (
          <Dialog
            title="Hello"
            role={role}
            onClose={() => setOpen(false)}
            actions={<button>OK</button>}
          >
            <input aria-label="inside" />
          </Dialog>
        ) : null}
      </>
    );
  }

  it('GIVEN an opener WHEN the dialog opens THEN it takes focus and is labelled by its title', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: 'Hello' });
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('GIVEN an open dialog WHEN Escape is pressed THEN it closes and focus returns to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('GIVEN the alertdialog role WHEN opened THEN it is exposed as an alertdialog', async () => {
    const user = userEvent.setup();
    render(<Harness role="alertdialog" />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('alertdialog', { name: 'Hello' })).toBeInTheDocument();
  });

  it('GIVEN an open dialog WHEN the backdrop is pressed THEN it closes, but clicks inside do not', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.click(screen.getByLabelText('inside'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(container.ownerDocument.querySelector('.dialog-backdrop')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('GIVEN an open dialog WHEN Tab is pressed past the last control THEN focus wraps inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await user.tab();
    expect(screen.getByLabelText('inside')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('inside')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'OK' })).toHaveFocus();
  });

  it('GIVEN a dialog with nothing focusable WHEN Tab is pressed THEN nothing throws', async () => {
    const user = userEvent.setup();
    render(
      <Dialog title="Bare" onClose={() => undefined}>
        text only
      </Dialog>,
    );

    await user.tab();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('GIVEN a destructive action WHEN confirmed or cancelled THEN the matching callback runs', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog title="Delete entry?" onConfirm={onConfirm} onCancel={onCancel}>
        Are you sure?
      </ConfirmDialog>,
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Delete entry?' });
    expect(dialog).toHaveTextContent('Are you sure?');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('GIVEN a busy request WHEN shown THEN the confirm button is disabled and a custom label is used', () => {
    render(
      <ConfirmDialog
        title="Sure?"
        confirmLabel="Remove"
        busy
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        x
      </ConfirmDialog>,
    );

    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });
});

describe('Toast', () => {
  function Trigger({ message }: { message: string }) {
    const notify = useToast();
    return <button onClick={() => notify(message)}>Notify</button>;
  }

  it('GIVEN a success WHEN notified THEN a status toast appears and disappears after six seconds', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="Namespace created" />
      </ToastProvider>,
    );

    act(() => screen.getByRole('button', { name: 'Notify' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('Namespace created');

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(TOAST_DURATION_MS).toBe(6000);
  });

  it('GIVEN several toasts WHEN one is dismissed THEN only that one closes', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger message="First" />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    await user.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getAllByRole('status')).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Dismiss notification: First' })[0]!);

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('GIVEN no provider WHEN useToast is called THEN it fails loudly', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Trigger message="x" />)).toThrow(
      'useToast must be used inside a ToastProvider.',
    );
    spy.mockRestore();
  });
});

describe('ErrorBanner and EmptyState', () => {
  it('GIVEN an error with details WHEN shown THEN it is an alert with title, message and each detail', () => {
    render(
      <ErrorBanner
        error={toDisplayError(
          new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', [
            'name must be a string',
          ]),
        )}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(alert).toHaveTextContent('Request validation failed.');
    expect(alert).toHaveTextContent('name must be a string');
  });

  it('GIVEN an error without details WHEN shown THEN no list is rendered', () => {
    render(<ErrorBanner error={{ title: 'T', message: 'M', details: [] }} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('GIVEN a title and hint WHEN shown THEN both render, and the hint is optional', () => {
    const { rerender } = render(<EmptyState title="Nothing here." hint="Add one." />);
    expect(screen.getByText('Add one.')).toBeInTheDocument();

    rerender(<EmptyState title="Nothing here." />);
    expect(screen.queryByText('Add one.')).not.toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('GIVEN headers WHEN loading THEN the real headers show above four placeholder rows', () => {
    const { container } = render(<TableSkeleton headers={['Name', 'Value']} />);

    expect([...container.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
      'Name',
      'Value',
    ]);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(container.querySelectorAll('.skeleton-bar')).toHaveLength(8);
  });
});

describe('Pagination', () => {
  it('GIVEN a middle page WHEN rendered THEN it reports page, pages and total and both buttons work', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} totalItems={25} onPageChange={onPageChange} />);

    expect(screen.getByText('Page 2 of 3 (25 total)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it('GIVEN the first and last pages WHEN rendered THEN the edge buttons are disabled', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={2} totalItems={11} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pagination page={2} totalPages={2} totalItems={11} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('GIVEN no results WHEN rendered THEN it reads page 1 of 1 with both buttons disabled', () => {
    render(<Pagination page={1} totalPages={0} totalItems={0} onPageChange={vi.fn()} />);

    expect(screen.getByText('Page 1 of 1 (0 total)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});

describe('ListControls', () => {
  const start: ListControlsValue = { name: '', sort: 'name', direction: 'asc', pageSize: 10 };
  const options = [
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Created' },
  ];

  it('GIVEN the controls WHEN rendered THEN they use the documented labels and choices', () => {
    render(<ListControls value={start} sortOptions={options} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Filter by name')).toHaveValue('');
    expect(screen.getByLabelText('Order by')).toHaveValue('name');
    expect(screen.getByLabelText('Direction')).toHaveValue('asc');
    expect(screen.getByLabelText('Per page')).toHaveValue('10');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Name',
      'Created',
      'Ascending',
      'Descending',
      '10',
      '50',
      '100',
    ]);
  });

  it('GIVEN any control WHEN it changes THEN the new value is reported immediately without debounce', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ListControls value={start} sortOptions={options} onChange={onChange} />);

    await user.type(screen.getByLabelText('Filter by name'), 'a');
    await user.selectOptions(screen.getByLabelText('Order by'), 'created_at');
    await user.selectOptions(screen.getByLabelText('Direction'), 'desc');
    await user.selectOptions(screen.getByLabelText('Per page'), '50');

    expect(onChange.mock.calls.map((call) => call[0])).toEqual([
      { ...start, name: 'a' },
      { ...start, sort: 'created_at' },
      { ...start, direction: 'desc' },
      { ...start, pageSize: 50 },
    ]);
  });

  it('GIVEN extra controls WHEN passed as children THEN they render in the toolbar', () => {
    render(
      <ListControls value={start} sortOptions={options} onChange={vi.fn()}>
        <span>extra control</span>
      </ListControls>,
    );

    expect(screen.getByRole('group', { name: 'List controls' })).toHaveTextContent('extra control');
  });
});
