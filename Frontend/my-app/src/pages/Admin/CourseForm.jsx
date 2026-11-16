import React, { useState, useEffect } from 'react';
import { FiUpload, FiPlus, FiX } from 'react-icons/fi';

const defaultFormData = {
    title: '',
    description: '',
    shortDescription: '',
    thumbnail: null,
    level: 'beginner',
    price: 0,
    tags: [],
    startDate: '',
    endDate: '',
    modules: []
};

const CourseForm = ({ initialValues = {}, onSubmit, mode = 'add', loading = false, error = '' }) => {
    const [formData, setFormData] = useState({ ...defaultFormData, ...initialValues });
    const [newTag, setNewTag] = useState('');
    const [newModule, setNewModule] = useState({ title: '', description: '', sections: [] });
    const [newSection, setNewSection] = useState({ title: '', description: '', lessons: [] });
    const [newLesson, setNewLesson] = useState({ title: '', type: 'video', duration: '', description: '', free: false, videoFile: null });
    const [selectedModuleIndex, setSelectedModuleIndex] = useState(null);
    const [selectedSectionIndex, setSelectedSectionIndex] = useState(null);

    useEffect(() => {
        setFormData({ ...defaultFormData, ...initialValues });
    }, [initialValues]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTagAdd = () => {
        if (newTag && !formData.tags.includes(newTag)) {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
            setNewTag('');
        }
    };
    const handleTagRemove = (tag) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };
    const handleModuleAdd = () => {
        if (newModule.title) {
            setFormData(prev => ({ ...prev, modules: [...prev.modules, { ...newModule, id: Date.now(), sections: [] }] }));
            setNewModule({ title: '', description: '', sections: [] });
        }
    };
    const handleModuleRemove = (id) => {
        setFormData(prev => ({ ...prev, modules: prev.modules.filter(m => m.id !== id) }));
    };
    const handleSectionAdd = (moduleIndex) => {
        if (newSection.title) {
            const updatedModules = [...formData.modules];
            updatedModules[moduleIndex].sections = [...updatedModules[moduleIndex].sections, { ...newSection, id: Date.now() }];
            setFormData(prev => ({ ...prev, modules: updatedModules }));
            setNewSection({ title: '', description: '', lessons: [] });
            setSelectedModuleIndex(null);
        }
    };
    const handleSectionRemove = (moduleIndex, sectionId) => {
        const updatedModules = [...formData.modules];
        updatedModules[moduleIndex].sections = updatedModules[moduleIndex].sections.filter(s => s.id !== sectionId);
        setFormData(prev => ({ ...prev, modules: updatedModules }));
    };
    const handleVideoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewLesson(prev => ({ ...prev, videoFile: file }));
        }
    };
    // Lessons logic (no upload in this base form)
    const handleLessonAdd = (moduleIndex, sectionIndex) => {
        if (newLesson.title) {
            const updatedModules = [...formData.modules];
            updatedModules[moduleIndex].sections[sectionIndex].lessons = [
                ...updatedModules[moduleIndex].sections[sectionIndex].lessons,
                { ...newLesson, id: Date.now() }
            ];
            setFormData(prev => ({ ...prev, modules: updatedModules }));
            setNewLesson({ title: '', type: 'video', duration: '', description: '', free: false, videoFile: null });
        }
    };
    const handleLessonRemove = (moduleIndex, sectionIndex, lessonId) => {
        const updatedModules = [...formData.modules];
        updatedModules[moduleIndex].sections[sectionIndex].lessons = updatedModules[moduleIndex].sections[sectionIndex].lessons.filter(l => l.id !== lessonId);
        setFormData(prev => ({ ...prev, modules: updatedModules }));
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Course Title</label>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Short Description</label>
                        <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} rows="2" className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Full Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Thumbnail Image</label>
                        <div className="mt-1 flex items-center">
                            <input type="file" accept="image/*" onChange={e => setFormData(prev => ({ ...prev, thumbnail: e.target.files[0] }))} className="hidden" id="thumbnail" />
                            <label htmlFor="thumbnail" className="cursor-pointer flex items-center px-4 py-2 border border-line rounded-md shadow-sm text-sm font-medium text-fg-muted hover:bg-ink-900">
                                <FiUpload className="mr-2" /> Upload Image
                            </label>
                            {formData.thumbnail && (
                                <span className="ml-3 text-sm text-fg-subtle">{formData.thumbnail instanceof File ? formData.thumbnail.name : 'Current image'}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Course Details */}
            <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Course Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Skill Level</label>
                        <select name="level" value={formData.level} onChange={handleChange} className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500">
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Price</label>
                        <input type="number" name="price" value={formData.price} onChange={handleChange} min="0" className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">Start Date (Optional)</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-fg-muted">End Date (Optional)</label>
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="mt-1 block w-full rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                    </div>
                </div>
            </div>
            {/* Tags */}
            <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                    {formData.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-500/10 text-brand-300">
                            {tag}
                            <button type="button" onClick={() => handleTagRemove(tag)} className="ml-2 text-brand-400 hover:text-brand-300"><FiX size={16} /></button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add new tag" className="flex-1 rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                    <button type="button" onClick={handleTagAdd} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add</button>
                </div>
            </div>
            {/* Modules */}
            <div className="bg-ink-850 rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Course Modules</h2>
                <div className="space-y-6">
                    {formData.modules.map((module, moduleIndex) => (
                        <div key={module.id} className="border border-line rounded-lg overflow-hidden">
                            <div className="flex items-start justify-between p-4 bg-ink-900">
                                <div>
                                    <h3 className="font-medium">Module {moduleIndex + 1}: {module.title}</h3>
                                    <p className="text-sm text-fg-muted">{module.description}</p>
                                </div>
                                <button type="button" onClick={() => handleModuleRemove(module.id)} className="text-down hover:text-down"><FiX size={20} /></button>
                            </div>
                            {/* Sections within this module */}
                            <div className="p-4 space-y-4">
                                <h4 className="font-medium text-sm text-fg-muted">Sections</h4>
                                {module.sections.map((section, sectionIndex) => (
                                    <div key={section.id} className="pl-4 border-l-2 border-line">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h5 className="font-medium">Section {sectionIndex + 1}: {section.title}</h5>
                                                <p className="text-xs text-fg-muted">{section.description}</p>
                                            </div>
                                            <div className="flex">
                                                <button type="button" onClick={() => { setSelectedModuleIndex(moduleIndex); setSelectedSectionIndex(sectionIndex); }} className="text-brand-400 hover:text-brand-300 mr-2"><FiPlus size={16} /></button>
                                                <button type="button" onClick={() => handleSectionRemove(moduleIndex, section.id)} className="text-down hover:text-down"><FiX size={16} /></button>
                                            </div>
                                        </div>
                                        {/* Lessons within this section */}
                                        <div className="pl-4 space-y-2 mb-3">
                                            {section.lessons.map((lesson, lessonIndex) => (
                                                <div key={lesson.id} className="flex items-center justify-between bg-ink-900 p-2 rounded text-sm">
                                                    <div>
                                                        <span className="font-medium">{lessonIndex + 1}. {lesson.title}</span>
                                                        <span className="ml-2 text-xs text-fg-subtle">({lesson.type})</span>
                                                        {lesson.free && <span className="ml-2 bg-up/10 text-up text-xs px-2 py-0.5 rounded">Free</span>}
                                                    </div>
                                                    <button type="button" onClick={() => handleLessonRemove(moduleIndex, sectionIndex, lesson.id)} className="text-down hover:text-down"><FiX size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Add lesson form (conditionally rendered) */}
                                        {selectedModuleIndex === moduleIndex && selectedSectionIndex === sectionIndex && (
                                            <div className="bg-brand-500/10 p-3 rounded-lg mb-3">
                                                <h6 className="font-medium text-sm mb-2">Add New Lesson</h6>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                    <input type="text" value={newLesson.title} onChange={e => setNewLesson(prev => ({ ...prev, title: e.target.value }))} placeholder="Lesson title" className="rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                                                    <select value={newLesson.type} onChange={e => setNewLesson(prev => ({ ...prev, type: e.target.value }))} className="rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500">
                                                        <option value="video">Video</option>
                                                        <option value="ebook">E-Book</option>
                                                        <option value="quiz">Quiz</option>
                                                        <option value="workshop">Workshop</option>
                                                    </select>
                                                </div>
                                                {newLesson.type === 'video' && (
                                                    <div className="mb-2">
                                                        <label className="block text-sm font-medium text-fg-muted mb-1">Video File</label>
                                                        <div className="flex items-center">
                                                            <input type="file" accept="video/*" onChange={handleVideoFileChange} className="hidden" id="videoFile" />
                                                            <label htmlFor="videoFile" className="cursor-pointer flex items-center px-3 py-1 border border-line rounded-md shadow-sm text-sm font-medium text-fg-muted hover:bg-ink-900">
                                                                <FiUpload className="mr-1" />
                                                                {newLesson.videoFile ? newLesson.videoFile.name : 'Select Video'}
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                                                    <input type="text" value={newLesson.duration} onChange={e => setNewLesson(prev => ({ ...prev, duration: e.target.value }))} placeholder="Duration (e.g. 10:30)" className="rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                                                    <div className="flex items-center">
                                                        <input type="checkbox" id="lessonFree" checked={newLesson.free} onChange={e => setNewLesson(prev => ({ ...prev, free: e.target.checked }))} className="rounded border-line text-brand-400 shadow-sm focus:border-brand-500 focus:ring-brand-500 mr-2" />
                                                        <label htmlFor="lessonFree" className="text-sm">Free Preview</label>
                                                    </div>
                                                </div>
                                                <textarea value={newLesson.description} onChange={e => setNewLesson(prev => ({ ...prev, description: e.target.value }))} placeholder="Lesson description" rows="2" className="w-full rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500 mb-2"></textarea>
                                                <div className="flex justify-end gap-2">
                                                    <button type="button" onClick={() => setSelectedSectionIndex(null)} className="px-3 py-1 text-sm border border-line rounded-lg text-fg-muted hover:bg-ink-900">Cancel</button>
                                                    <button type="button" onClick={() => handleLessonAdd(moduleIndex, sectionIndex)} className="px-3 py-1 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add Lesson</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* Add section form */}
                                {selectedModuleIndex === moduleIndex && selectedSectionIndex === null && (
                                    <div className="border-l-2 border-brand-400/30 pl-4 mb-3">
                                        <div className="bg-brand-500/10 p-3 rounded-lg">
                                            <h5 className="font-medium text-sm mb-2">Add New Section</h5>
                                            <input type="text" value={newSection.title} onChange={e => setNewSection(prev => ({ ...prev, title: e.target.value }))} placeholder="Section title" className="w-full rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500 mb-2" />
                                            <textarea value={newSection.description} onChange={e => setNewSection(prev => ({ ...prev, description: e.target.value }))} placeholder="Section description" rows="2" className="w-full rounded-md text-sm border-line shadow-sm focus:border-brand-500 focus:ring-brand-500 mb-2"></textarea>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setSelectedModuleIndex(null)} className="px-3 py-1 text-sm border border-line rounded-lg text-fg-muted hover:bg-ink-900">Cancel</button>
                                                <button type="button" onClick={() => handleSectionAdd(moduleIndex)} className="px-3 py-1 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add Section</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <button type="button" onClick={() => { setSelectedModuleIndex(moduleIndex); setSelectedSectionIndex(null); }} className="text-brand-400 hover:text-brand-300 flex items-center text-sm font-medium"><FiPlus size={16} className="mr-1" /> Add Section</button>
                            </div>
                        </div>
                    ))}
                    {/* Add new module */}
                    <div className="flex gap-2">
                        <input type="text" value={newModule.title} onChange={e => setNewModule(prev => ({ ...prev, title: e.target.value }))} placeholder="Module title" className="flex-1 rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                        <input type="text" value={newModule.description} onChange={e => setNewModule(prev => ({ ...prev, description: e.target.value }))} placeholder="Module description" className="flex-1 rounded-md border-line shadow-sm focus:border-brand-500 focus:ring-brand-500" />
                        <button type="button" onClick={handleModuleAdd} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Add Module</button>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                    {loading ? (mode === 'edit' ? 'Updating...' : 'Creating...') : (mode === 'edit' ? 'Update Course' : 'Create Course')}
                </button>
            </div>
            {error && <div className="mt-4 p-4 bg-down/10 text-down rounded-lg">{error}</div>}
        </form>
    );
};

export default CourseForm; 