import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiPlayCircle, FiSearch } from 'react-icons/fi';
import { useApi } from '../../lib/useApi';
import { Alert, Container, EmptyState, Input, PageHeader, Skeleton } from '../../ui/primitives';
import { Tabs } from '../../ui/overlays';
import { Stagger, StaggerItem } from '../../ui/motion';
import CourseCard from './CourseCard';

const LEVEL_TABS = [
  { value: 'all', label: 'All' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function Courses() {
  const { data, loading, error } = useApi('/api/courses', { params: { courseType: 'forex' } });
  const [level, setLevel] = useState('all');
  const [query, setQuery] = useState('');

  const courses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (Array.isArray(data) ? data : [])
      .filter((c) => c.listingStatus !== 'archived' && c.listingStatus !== 'draft')
      .filter((c) => level === 'all' || c.level === level)
      .filter((c) => !q || `${c.title} ${c.shortDescription || ''}`.toLowerCase().includes(q));
  }, [data, level, query]);

  return (
    <>
      <Helmet>
        <title>Courses — QuickX</title>
      </Helmet>
      <Container className="py-10 sm:py-14">
        <PageHeader
          eyebrow="Courses"
          title="Learn to trade, step by step"
          description="Structured video lessons from the basics to advanced strategy. Start with the free previews."
        />

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={LEVEL_TABS} value={level} onChange={setLevel} />
          <div className="relative sm:w-72">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses"
              className="pl-10"
              aria-label="Search courses"
            />
          </div>
        </div>

        <div className="mt-8">
          {error ? <Alert>{error.message}</Alert> : null}
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : null}
          {!loading && !error && !courses.length ? (
            <EmptyState icon={FiPlayCircle} title="No courses match" description="Try a different level or search term." />
          ) : null}
          {courses.length ? (
            <Stagger key={`${level}-${query}`} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <StaggerItem key={course._id}>
                  <CourseCard course={course} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : null}
        </div>
      </Container>
    </>
  );
}
