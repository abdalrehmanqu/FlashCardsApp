'use client';
import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '../../components/Api'

export default function NotePage() {
    const { noteId } = useParams();
    const router = useRouter();
    const { makeRequest } = useApi();

    const [isEditing, setIsEditing] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [savedContent, setSavedContent] = useState('');
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [note, setNote] = useState(null);

    const defaultNotes = `# Newton's Laws of Motion Study Guide: Understanding Inertia and Acceleration in Physics 101

Newton's Laws of Motion Study Sheet: Key Principles Explained

Or simply:

Newton's Laws Study Sheet

## Key Points

1. Newton's First Law states that an object remains at rest or maintains constant motion unless acted upon by an external force.
2. Newton's Second Law defines force (F) as the product of mass (m) and acceleration (a), represented by the formula F=ma.
3. Inertia refers to the resistance of an object to changing its state of motion due to its mass.
4. Force is a push or pull capable of causing an object's motion to change.
5. Mass quantifies the amount of matter within an object, impacting its inertia.
6. Acceleration describes how quickly the velocity of an object changes over time.
7. The Third Law asserts that for every action, there exists an equal and opposite reaction.
8. Understanding these laws helps explain various phenomena such as car crashes and rocket launches.
9. Key elements like inertia, force, mass, and acceleration play crucial roles in daily experiences involving motion.
10. These foundational principles form the basis for classical mechanics studies in Physics 101 courses.

## Definitions

**1. Inertia**: The resistance of any physical object to any change in its velocity, including changes to the object's direction or speed.

**2. Force**: A push or pull exerted on an object, resulting from the interaction between two or more bodies. This force can cause an object to be accelerated, decelerated, changed direction, or start moving if previously stationary.

**3. Mass**: The quantity of matter contained within an object; it determines how much inertia the object has. Therefore, greater mass means greater resistance to a change in motion.

**4. Acceleration**: The rate at which an object changes its velocity over time. It can be measured as velocity per unit time.

**5. Net Force**: The overall force acting on an object after all individual forces have been considered together. If several forces act upon an object simultaneously, the net force is calculated by summing these forces vectorially (considering both magnitude and direction).

**6. Unbalanced Force**: A non-zero resultant of multiple forces acting on an object leading to a change in its state of rest or uniform motion along a straight line according to Newton’s first law.

**7. Action Reaction Pair**: According to Newton's third law, for every action there is an equal but opposite reaction - that is, when one body exerts a force on another body, then the second body also simultaneously exerts a force back on the first body of identical magnitude but opposite direction.

## Formulas

\`\`\`
Second Law: F = ma
\`\`\`

*Where:*

- F: Force
- m: Mass
- a: Acceleration

## Summary

In Physics 101, we explored Newton's Laws of Motion, outlining the first law as inertia stating objects remain unchanged unless acted upon by external forces; the second law describing how forces cause acceleration proportionate to an object's mass (F=ma); and the third law highlighting that for every action, there exists an equal and opposite reaction. This session also emphasized key concepts such as inertia, force, mass, and acceleration, with practical applications ranging from understanding accidents in vehicles to the science behind rocket launches and everyday motions.
`;

    // Load note from backend on component mount
    useEffect(() => {
        const loadNote = async () => {
            try {
                setLoading(true);
                const noteData = await makeRequest(`notes/${noteId}`);
                setNote(noteData);
                setSavedContent(noteData.content);
                setEditContent(noteData.content);
            } catch (err) {
                setError('Failed to load note: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (noteId) {
            loadNote();
        }
    }, [noteId]);

    // Auto-save functionality
    useEffect(() => {
        if (!autoSaveEnabled || !isEditing || !hasUnsavedChanges) return;

        const autoSaveTimer = setTimeout(() => {
            handleSave();
        }, 5000); // Auto-save after 5 seconds of inactivity

        return () => clearTimeout(autoSaveTimer);
    }, [editContent, autoSaveEnabled, isEditing, hasUnsavedChanges]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (isEditing && hasUnsavedChanges) {
                    handleSave();
                }
            }
            // Ctrl+E to toggle edit mode
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                toggleEditMode();
            }
            // Escape to exit edit mode
            if (e.key === 'Escape' && isEditing) {
                toggleEditMode();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isEditing, hasUnsavedChanges]);

    // Handle content changes in edit mode
    const handleContentChange = (e) => {
        setEditContent(e.target.value);
        setHasUnsavedChanges(e.target.value !== savedContent);
    };    // Save notes to backend
    const handleSave = async () => {
        try {
            await makeRequest(`notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: note.title,
                    content: editContent,
                    source_type: note.source_type,
                    source_info: note.source_info
                })
            });
            setSavedContent(editContent);
            setHasUnsavedChanges(false);

            // Show save confirmation
            const button = document.querySelector('[data-save-btn]');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'Saved!';
                button.classList.add('bg-green-600');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('bg-green-600');
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving note:', error);
            // Optionally show an error message to the user
        }
    };

    // Discard changes and revert to saved content
    const handleDiscard = () => {
        setEditContent(savedContent);
        setHasUnsavedChanges(false);
    };    // Toggle between edit and preview modes
    const toggleEditMode = () => {
        if (isEditing && hasUnsavedChanges) {
            const confirmDiscard = window.confirm('You have unsaved changes. Do you want to discard them?');
            if (!confirmDiscard) return;
            handleDiscard();
        }
        setIsEditing(!isEditing);
    };    // Export notes as markdown file
    const handleExport = () => {
        const filename = note?.title ? `${note.title.replace(/[^a-zA-Z0-9]/g, '-')}.md` : 'my-notes.md';
        const blob = new Blob([savedContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Import notes from file
    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            setEditContent(content);
            setSavedContent(content);
            localStorage.setItem('userNotes', content);
            setHasUnsavedChanges(false);
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const displayContent = isEditing ? editContent : savedContent;

    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen bg-[#0B0D17]'>
                <div className='flex flex-col items-center'>
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <div className='text-xl text-gray-300'>Loading note...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex items-center justify-center h-screen bg-[#0B0D17]'>
                <div className='flex flex-col items-center max-w-md text-center'>
                    <div className='text-red-400 text-6xl mb-4'>⚠️</div>
                    <div className='text-xl text-red-400 mb-2'>Error Loading Note</div>
                    <div className='text-gray-400 mb-4'>{error}</div>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                        onClick={() => router.push('/notes')}
                    >
                        Back to Notes
                    </Button>
                </div>
            </div>
        );
    } return (
        <div className="min-h-screen bg-[#0B0D17] p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header with controls */}
                <div className="flex justify-between items-center mb-6 p-4 bg-gray-900 rounded-lg">                    <div>
                    <h1 className="text-2xl font-bold text-white">{note?.title || 'My Notes'}</h1><p className="text-gray-400 text-sm">
                        {isEditing ? 'Edit your markdown notes' : 'Preview your notes'}
                        {hasUnsavedChanges && <span className="text-yellow-400 ml-2">• Unsaved changes</span>}
                        {autoSaveEnabled && isEditing && <span className="text-green-400 ml-2">• Auto-save on</span>}
                    </p>
                </div>                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <Button
                                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                                    className={`px-3 py-2 text-sm ${autoSaveEnabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'} text-white`}
                                    title="Toggle auto-save"
                                >
                                    {autoSaveEnabled ? '⚡' : '💾'}
                                </Button>
                                <Button
                                    onClick={handleDiscard}
                                    disabled={!hasUnsavedChanges}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2"
                                >
                                    Discard
                                </Button>
                                <Button
                                    data-save-btn
                                    onClick={handleSave}
                                    disabled={!hasUnsavedChanges}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    onClick={toggleEditMode}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                                >
                                    Preview
                                </Button>
                            </>) : (
                            <>
                                <input
                                    type="file"
                                    accept=".md,.txt"
                                    onChange={handleImport}
                                    className="hidden"
                                    id="import-file"
                                />
                                <Button
                                    onClick={() => document.getElementById('import-file').click()}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2"
                                >
                                    Import
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2"
                                >
                                    Export
                                </Button>
                                <Button
                                    onClick={toggleEditMode}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2"
                                >
                                    Edit Notes
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content area */}
                <div className="bg-gray-900 rounded-lg">
                    {isEditing ? (
                        /* Edit Mode */
                        <div className="p-6">
                            <div className="mb-4 flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Markdown Editor</span>
                                <span className="text-gray-400 text-xs">
                                    {editContent.length} characters
                                </span>
                            </div>
                            <Textarea
                                value={editContent}
                                onChange={handleContentChange}
                                placeholder="Write your notes in Markdown..."
                                className="min-h-[600px] w-full bg-gray-800 border border-gray-600 text-white placeholder-gray-400 font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
                            />                            <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                                <p className="text-gray-400 text-xs mb-2">Markdown Tips & Shortcuts:</p>
                                <div className="text-gray-500 text-xs space-y-1">
                                    <div># Heading 1, ## Heading 2, ### Heading 3</div>
                                    <div>**bold**, *italic*, `code`</div>
                                    <div>- Bullet list, 1. Numbered list</div>
                                    <div>[Link](url), ![Image](url)</div>
                                    <div className="border-t border-gray-700 pt-2 mt-2">
                                        <strong className="text-gray-400">Keyboard Shortcuts:</strong>
                                    </div>
                                    <div>Ctrl+S: Save • Ctrl+E: Toggle Edit • Esc: Exit Edit</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Preview Mode */
                        <div className="p-6">
                            <div className="prose prose-indigo dark:prose-invert prose-lg max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-100" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-200" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-200" {...props} />,
                                        h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mt-3 mb-2 text-gray-300" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 text-gray-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 text-gray-300" {...props} />,
                                        li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-gray-200 font-semibold" {...props} />,
                                        em: ({ node, ...props }) => <em className="text-gray-300 italic" {...props} />,
                                        code: ({ node, ...props }) => (
                                            <code className="bg-gray-800 text-indigo-300 px-2 py-1 rounded text-sm font-mono" {...props} />
                                        ),
                                        pre: ({ node, ...props }) => (
                                            <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 overflow-x-auto my-4" {...props} />
                                        ),
                                        p: ({ node, ...props }) => <p className="mb-4 text-gray-300 leading-relaxed" {...props} />,
                                        blockquote: ({ node, ...props }) => (
                                            <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 my-4 bg-gray-800 py-2" {...props} />
                                        ),
                                        a: ({ node, ...props }) => (
                                            <a className="text-indigo-400 hover:text-indigo-300 underline" {...props} />
                                        ),
                                        table: ({ node, ...props }) => (
                                            <table className="min-w-full bg-gray-800 border border-gray-600 rounded-lg my-4" {...props} />
                                        ),
                                        th: ({ node, ...props }) => (
                                            <th className="px-4 py-2 bg-gray-700 text-gray-200 font-semibold border-b border-gray-600" {...props} />
                                        ),
                                        td: ({ node, ...props }) => (
                                            <td className="px-4 py-2 text-gray-300 border-b border-gray-700" {...props} />
                                        ),
                                    }}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Auto-save indicator */}
                {hasUnsavedChanges && (
                    <div className="mt-4 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
                        <p className="text-yellow-200 text-sm">
                            💾 You have unsaved changes. Don't forget to save your work!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
