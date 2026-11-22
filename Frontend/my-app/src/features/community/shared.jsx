import { createContext, useContext, useRef, useState } from 'react';
import { FiImage, FiX } from 'react-icons/fi';
import { session } from '../../lib/api';
import { cx } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { Avatar, Badge, Spinner } from '../../ui/primitives';

/** All community endpoints live under this path ("main" is the one community). */
export const BASE = '/api/community/main';

/** { about, me, members, openProfile, startChat }, provided by <Community>. */
export const CommunityContext = createContext(null);
export function useCommunity() {
  return useContext(CommunityContext);
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Upload one image and return its public URL. Throws with a readable message. */
export async function uploadImage(file, onProgress) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Images must be smaller than 8 MB.');
  return uploadFileToS3({ file, token: session.token(), type: 'image', onProgress });
}

export async function uploadDocument(file, onProgress) {
  if (file.size > 50 * 1024 * 1024) throw new Error('Files must be smaller than 50 MB.');
  return uploadFileToS3({ file, token: session.token(), type: 'file', onProgress });
}

/** Button + hidden input that uploads images and reports each URL. */
export function ImagePicker({ onUploaded, onError, disabled, max = 4, count = 0 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, max - count));
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        onUploaded({ url, type: 'image', name: file.name });
      }
    } catch (err) {
      onError?.(err.message || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handle} />
      <button
        type="button"
        disabled={disabled || busy || count >= max}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-fg/[0.06] hover:text-fg disabled:opacity-50"
      >
        {busy ? <Spinner className="h-4 w-4" /> : <FiImage className="h-4 w-4" />}
        {busy ? 'Uploading' : 'Image'}
      </button>
    </>
  );
}

export function MediaThumbs({ media, onRemove }) {
  if (!media.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {media.map((m, i) => (
        <div key={m.url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
          <img src={publicAssetUrl(m.url)} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
            aria-label="Remove image"
          >
            <FiX className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Author line used on posts, comments, questions and answers. */
export function Author({ user, when, size = 40, extra }) {
  const community = useCommunity();
  const id = user?._id || user?.id;
  const isMentor = id && String(id) === String(community?.about?.owner?.id);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" onClick={() => id && community?.openProfile(id)} className="shrink-0 rounded-full" aria-label={`View ${user?.fullName || 'member'}`}>
        <Avatar src={publicAssetUrl(user?.profilePicture)} name={user?.fullName} size={size} />
      </button>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => id && community?.openProfile(id)} className="truncate text-sm font-semibold text-fg hover:underline">
            {user?.fullName || 'Former member'}
          </button>
          {isMentor ? <Badge tone="brand">Mentor</Badge> : null}
          {extra}
        </p>
        {when ? <p className="text-xs text-fg-subtle">{when}</p> : null}
      </div>
    </div>
  );
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]}'"])/g;

/** Plain text with clickable links and highlighted @mentions. Never renders HTML from members. */
export function RichText({ text, className }) {
  const parts = String(text || '').split(URL_RE);
  return (
    <p className={cx('whitespace-pre-line break-words text-[15px] leading-relaxed text-fg', className)}>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-400 hover:underline">
              {part}
            </a>
          );
        }
        return part.split(/(@"[^"]+"|@[A-Za-z][A-Za-z0-9._-]{1,40})/g).map((piece, j) =>
          piece.startsWith('@') ? (
            <span key={`${i}-${j}`} className="font-medium text-brand-300">
              {piece}
            </span>
          ) : (
            piece
          )
        );
      })}
    </p>
  );
}

/** Small dropdown for per-item actions (delete, pin, report …). */
export function ActionMenu({ items, label = 'More actions', icon: Icon }) {
  const [open, setOpen] = useState(false);
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="rounded-full p-2 text-fg-subtle transition hover:bg-fg/[0.06] hover:text-fg"
        aria-label={label}
        aria-expanded={open}
      >
        <Icon className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-ink-800 py-1 shadow-card" role="menu">
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cx(
                'block w-full px-4 py-2 text-left text-sm transition hover:bg-fg/[0.06]',
                item.danger ? 'text-down' : 'text-fg'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
