import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiBookOpen, FiDownload, FiLogOut, FiPlayCircle } from 'react-icons/fi';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { FEATURE_LIST } from '../../lib/features';
import { cx, daysLeft, formatDate } from '../../lib/format';
import { publicAssetUrl } from '../../utils/publicAssetUrl';
import { clearServerPushSubscription } from '../../utils/webPush';
import { Avatar, Badge, Button, Card, Container, EmptyState, Skeleton } from '../../ui/primitives';
import { Reveal, Stagger, StaggerItem } from '../../ui/motion';
import { Link } from 'react-router-dom';
import WalletPanel from './WalletPanel';
import DevicePanel from './DevicePanel';

function AccessCard({ feature }) {
  const { has, expiryOf, isOwner } = useAuth();
  const active = has(feature.key);
  const endsAt = expiryOf(feature.key);
  const left = daysLeft(endsAt);
  const Icon = feature.icon;

  return (
    <Card interactive className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cx(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            active ? 'bg-brand-500/15 text-brand-300' : 'bg-white/[0.05] text-fg-subtle'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {active ? (
          <Badge tone={!isOwner && left <= 5 ? 'warn' : 'up'}>{isOwner ? 'Owner' : `${left} days left`}</Badge>
        ) : (
          <Badge>Not active</Badge>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-fg">{feature.label}</h3>
      <p className="mt-1 flex-1 text-sm text-fg-muted">
        {active && endsAt ? `Active until ${formatDate(endsAt)}.` : feature.blurb}
      </p>
      <div className="mt-4 flex gap-2">
        {active ? (
          <>
            <Button to={feature.path} size="sm" className="flex-1">
              Open
            </Button>
            {!isOwner ? (
              <Button to={`/checkout/plan/${feature.productKey}`} size="sm" variant="secondary">
                Renew
              </Button>
            ) : null}
          </>
        ) : (
          <Button to={`/checkout/plan/${feature.productKey}`} size="sm" variant="secondary" className="flex-1">
            Get {feature.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

function CourseRow({ course }) {
  return (
    <Link
      to={`/school/course/${course.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-ink-850 p-3 transition hover:border-line-strong"
    >
      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-700">
        {course.thumbnail ? (
          <img src={publicAssetUrl(course.thumbnail)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-fg">{course.title}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(course.progress || 0)}%` }} />
          </div>
          <span className="tabular text-xs text-fg-subtle">{Math.round(course.progress || 0)}%</span>
        </div>
      </div>
      <FiArrowRight className="h-5 w-5 shrink-0 text-fg-subtle transition group-hover:translate-x-1 group-hover:text-fg" />
    </Link>
  );
}

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const courses = useApi('/api/courses/user/purchased');
  const profile = useApi('/api/users/me');
  const books = profile.data?.purchasedBooks || [];

  const handleSignOut = () => {
    clearServerPushSubscription()
      .catch(() => {})
      .finally(() => {
        signOut();
        navigate('/');
      });
  };

  return (
    <>
      <Helmet>
        <title>My account | QuickX</title>
      </Helmet>
      <Container className="space-y-12 py-10 sm:py-14">
        <Reveal className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={user?.profilePicture} name={user?.fullName} size={60} />
            <div>
              <p className="text-sm text-fg-muted">Welcome back</p>
              <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{user?.fullName}</h1>
              <p className="text-sm text-fg-subtle">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button to="/profile" variant="secondary" size="sm">
              Edit profile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <FiLogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </Reveal>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-fg">Your access</h2>
            <Link to="/pricing" className="text-sm font-semibold text-brand-400 hover:underline">
              All plans
            </Link>
          </div>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_LIST.map((feature) => (
              <StaggerItem key={feature.key}>
                <AccessCard feature={feature} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section id="wallet" className="scroll-mt-24">
          <h2 className="mb-5 text-xl font-bold text-fg">Wallet and referrals</h2>
          <WalletPanel />
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-fg">Continue learning</h2>
            <Link to="/courses" className="text-sm font-semibold text-brand-400 hover:underline">
              All courses
            </Link>
          </div>
          {courses.loading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : courses.data?.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {courses.data.map((course) => (
                <CourseRow key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiPlayCircle}
              title="No courses yet"
              description="Browse the lessons and start with a free preview."
              action={<Button to="/courses">Browse courses</Button>}
            />
          )}
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-fg">Your books</h2>
            <Link to="/store" className="text-sm font-semibold text-brand-400 hover:underline">
              Book store
            </Link>
          </div>
          {profile.loading ? (
            <Skeleton className="h-24" />
          ) : books.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <Card key={book._id} className="flex items-center gap-4 p-3">
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                    {book.thumbnail ? (
                      <img src={publicAssetUrl(book.thumbnail)} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{book.title}</p>
                    {book.author ? <p className="truncate text-sm text-fg-subtle">{book.author}</p> : null}
                    {book.fileUrl ? (
                      <a
                        href={publicAssetUrl(book.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:underline"
                      >
                        <FiDownload className="h-3.5 w-3.5" />
                        Open
                      </a>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiBookOpen}
              title="No books yet"
              description="Trading books you buy will be kept here."
              action={
                <Button to="/store" variant="secondary">
                  Visit the store
                </Button>
              }
            />
          )}
        </section>
        <section>
          <h2 className="mb-5 text-xl font-bold text-fg">This device</h2>
          <DevicePanel />
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            Read our{' '}
            <Link to="/privacy" className="text-fg-muted underline hover:text-fg">
              privacy policy
            </Link>
            .
          </p>
          <Link to="/delete-account" className="font-semibold text-down hover:underline">
            Delete my account
          </Link>
        </section>
      </Container>
    </>
  );
}
