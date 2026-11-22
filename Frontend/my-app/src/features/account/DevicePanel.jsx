import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiDownload, FiTrash2 } from 'react-icons/fi';
import { Alert, Badge, Button, Card } from '../../ui/primitives';
import { deleteLesson, estimateQuota, formatBytes, listDownloads } from '../../utils/offlineLessonStore';
import {
  clearServerPushSubscription,
  getNotificationPermission,
  isIosDevice,
  isStandaloneDisplay,
  pushSupported,
  subscribeUserToPush,
} from '../../utils/webPush';

function Notifications() {
  const supported = pushSupported();
  const [permission, setPermission] = useState(() => (supported ? getNotificationPermission() : 'unsupported'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const needsInstall = isIosDevice() && !isStandaloneDisplay();

  const turnOn = async () => {
    setBusy(true);
    setError('');
    try {
      await subscribeUserToPush();
    } catch (err) {
      setError(err?.message || 'Could not turn notifications on.');
    } finally {
      setPermission(getNotificationPermission());
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    setError('');
    try {
      await clearServerPushSubscription();
      setPermission('off');
    } catch (err) {
      setError(err?.message || 'Could not turn notifications off.');
    } finally {
      setBusy(false);
    }
  };

  let status = { tone: 'neutral', label: 'Off' };
  let help = 'Get new signals, replies and live session reminders on this device.';
  if (!supported) {
    status = { tone: 'neutral', label: 'Not supported' };
    help = 'This browser cannot show notifications.';
  } else if (needsInstall) {
    status = { tone: 'warn', label: 'Install first' };
    help = 'On iPhone, add QuickX to your Home Screen (Share → Add to Home Screen), then open it from there to turn notifications on.';
  } else if (permission === 'granted') {
    status = { tone: 'up', label: 'On' };
  } else if (permission === 'denied') {
    status = { tone: 'down', label: 'Blocked' };
    help = 'Notifications are blocked for this site. Allow them in your browser settings, then come back.';
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
          <FiBell className="h-5 w-5" />
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-fg">Notifications on this device</h3>
      <p className="mt-1 text-sm text-fg-muted">{help}</p>
      {error ? <Alert className="mt-3">{error}</Alert> : null}
      {supported && !needsInstall && permission !== 'denied' ? (
        <div className="mt-4">
          {permission === 'granted' ? (
            <Button size="sm" variant="secondary" loading={busy} onClick={turnOff}>
              Turn off
            </Button>
          ) : (
            <Button size="sm" loading={busy} onClick={turnOn}>
              Turn on
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function Downloads() {
  const [rows, setRows] = useState(null);
  const [quota, setQuota] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, q] = await Promise.all([listDownloads(), estimateQuota()]);
      setRows(list);
      setQuota(q);
    } catch {
      setRows([]);
      setError('Offline downloads are not available in this browser.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Remove "${row.lessonTitle || 'this lesson'}" from this device?`)) return;
    try {
      await deleteLesson(row.courseId, row.lessonId);
      await load();
    } catch {
      setError('Could not remove that download.');
    }
  };

  const total = (rows || []).reduce((sum, r) => sum + (r.size || 0), 0);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
          <FiDownload className="h-5 w-5" />
        </div>
        {rows?.length ? (
          <Badge>
            {rows.length} {rows.length === 1 ? 'lesson' : 'lessons'} · {formatBytes(total)}
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-fg">Offline downloads</h3>
      <p className="mt-1 text-sm text-fg-muted">
        Lessons saved on this device play without using data. Download a lesson from the player.
        {quota?.quota ? ` ${formatBytes(quota.usage || 0)} of ${formatBytes(quota.quota)} used.` : ''}
      </p>
      {error ? <Alert tone="warn" className="mt-3">{error}</Alert> : null}
      {rows?.length ? (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {rows.map((row) => (
            <li key={`${row.courseId}-${row.lessonId}`} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link to={`/school/course/${row.courseId}?lesson=${encodeURIComponent(row.lessonId)}`} className="min-w-0 hover:underline">
                <span className="block truncate text-sm font-medium text-fg">{row.lessonTitle || 'Lesson'}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  {row.courseTitle || 'Course'} · {formatBytes(row.size || 0)}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(row)}
                className="shrink-0 rounded-full p-2 text-fg-subtle transition hover:bg-fg/[0.06] hover:text-down"
                aria-label="Remove download"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/** Things that belong to this device rather than the account: saved lessons and push notifications. */
export default function DevicePanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Downloads />
      <Notifications />
    </div>
  );
}
