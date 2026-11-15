import { Link } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { Badge, Card } from '../../ui/primitives';
import { publicAssetUrl } from '../../utils/publicAssetUrl';

const LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function isImage(url) {
  return typeof url === 'string' && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url);
}

export default function CourseCard({ course }) {
  const thumb = isImage(course.thumbnail) ? publicAssetUrl(course.thumbnail) : null;
  return (
    <Card as={Link} to={`/courses/${course._id}`} interactive className="group flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-ink-700">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 ease-out-quint group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-700/40 to-ink-800" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-950">
            <FiPlay className="ml-0.5 h-5 w-5" />
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{LEVELS[course.level] || 'All levels'}</Badge>
          {course.totalLessons ? <Badge>{course.totalLessons} lessons</Badge> : null}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-fg">{course.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-fg-muted">
          {course.shortDescription || course.subtitle || course.description}
        </p>
      </div>
    </Card>
  );
}
