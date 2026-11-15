import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import { api, errorMessage, session } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { uploadFileToS3 } from '../../utils/uploadToS3';
import { Alert, Avatar, Button, Card, Container, Field, Input, Spinner } from '../../ui/primitives';
import { Reveal } from '../../ui/motion';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function Profile() {
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    country: user?.country || '',
    profilePicture: user?.profilePicture || '',
  });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage({ tone: 'down', text: 'Please choose an image file.' });
    if (file.size > MAX_PHOTO_BYTES) return setMessage({ tone: 'down', text: 'Photos must be smaller than 5 MB.' });
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadFileToS3({ file, token: session.token(), type: 'image' });
      setForm((f) => ({ ...f, profilePicture: url }));
    } catch {
      setMessage({ tone: 'down', text: 'Could not upload that photo. Please try again.' });
    } finally {
      setUploading(false);
    }
    return undefined;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setMessage({ tone: 'down', text: 'Your name cannot be empty.' });
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api.patch('/api/users/me/account', { ...form, avatar: form.profilePicture });
      session.setUser({ ...user, ...data.user });
      setMessage({ tone: 'up', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ tone: 'down', text: errorMessage(err, 'Could not save your profile.') });
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <Helmet>
        <title>Edit profile — QuickX</title>
      </Helmet>
      <Container className="max-w-2xl py-10 sm:py-14">
        <Link to="/account" className="inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg">
          <FiArrowLeft className="h-4 w-4" />
          My account
        </Link>
        <Reveal>
          <Card className="mt-6 p-7 sm:p-9">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Edit profile</h1>
            <form onSubmit={save} className="mt-6 space-y-5">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar src={publicAssetUrl(form.profilePicture)} name={form.fullName} size={84} />
                  {uploading ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white">
                      <Spinner />
                    </span>
                  ) : null}
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
                  <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    <FiCamera className="h-4 w-4" />
                    Change photo
                  </Button>
                  {form.profilePicture ? (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, profilePicture: '' }))} className="ml-3 text-sm text-fg-subtle hover:text-down">
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <Field label="Full name" htmlFor="profile-name">
                <Input id="profile-name" autoComplete="name" value={form.fullName} onChange={set('fullName')} maxLength={80} required />
              </Field>
              <Field label="Email" htmlFor="profile-email" hint="Your email cannot be changed here.">
                <Input id="profile-email" value={user?.email || ''} disabled readOnly />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Phone number" htmlFor="profile-phone">
                  <Input id="profile-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} maxLength={20} />
                </Field>
                <Field label="Country" htmlFor="profile-country">
                  <Input id="profile-country" autoComplete="country-name" value={form.country} onChange={set('country')} maxLength={60} />
                </Field>
              </div>

              {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
              <div className="flex items-center justify-between gap-3">
                <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:underline">
                  Change password
                </Link>
                <Button type="submit" loading={busy} disabled={uploading}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        </Reveal>
      </Container>
    </>
  );
}
