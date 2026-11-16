/**
 * Single source of truth for "can anyone watch this lesson without paying?".
 *
 * `isPreview` is the only flag that opens a lesson. The older `free` and
 * `isLocked` fields are still stored for compatibility but are always derived
 * from `isPreview` on save, never read them to decide access.
 */
function isLessonPreview(lesson) {
    return Boolean(lesson) && lesson.isPreview === true;
}

/** Accepts the flag from any editor payload (`isPreview`, or legacy `free` when isPreview is absent). */
function readPreviewFlagFromPayload(lesson) {
    if (!lesson) return false;
    if (lesson.isPreview !== undefined && lesson.isPreview !== null) {
        return lesson.isPreview === true || lesson.isPreview === 'true';
    }
    return lesson.free === true || lesson.free === 'true';
}

/** Returns the three stored flags, all derived from one decision. */
function previewFlags(isPreview) {
    const open = Boolean(isPreview);
    return { isPreview: open, free: open, isLocked: !open };
}

/** Rewrite preview flags on every lesson of a modules array coming from an editor. Mutates and returns it. */
function normalizeModulesPreviewFlags(modules) {
    if (!Array.isArray(modules)) return modules;
    for (const mod of modules) {
        for (const sec of mod?.sections || []) {
            for (const lesson of sec?.lessons || []) {
                Object.assign(lesson, previewFlags(readPreviewFlagFromPayload(lesson)));
            }
        }
    }
    return modules;
}

module.exports = {
    isLessonPreview,
    readPreviewFlagFromPayload,
    previewFlags,
    normalizeModulesPreviewFlags,
};
