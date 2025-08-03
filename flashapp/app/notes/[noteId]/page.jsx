'use client';
import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '../../components/Api'
import {
    Save,
    Edit,
    Eye,
    Download,
    Upload,
    Zap,
    RotateCcw,
    ArrowLeft,
    FileText,
    AlertTriangle,
    Loader2
} from 'lucide-react'

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

    const displayContent = isEditing ? editContent : savedContent; if (loading) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center'>
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center p-8">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
                        <div className='text-xl text-gray-300'>Loading note...</div>
                        <div className='text-sm text-gray-500 mt-2'>Please wait while we fetch your content</div>
                    </CardContent>
                </Card>
            </div>
        );
    } if (error) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center'>
                <Card className="bg-gray-900/50 border-red-800/50 backdrop-blur-sm max-w-md">
                    <CardContent className="flex flex-col items-center text-center p-8">
                        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                        <CardTitle className="text-xl text-red-400 mb-2">Error Loading Note</CardTitle>
                        <CardDescription className="text-gray-400 mb-6">{error}</CardDescription>
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                            onClick={() => router.push('/notes')}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Notes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    } return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-5 w-5 text-purple-400" />
                                        <CardTitle className="text-2xl text-gray-100">
                                            {note?.title || 'My Notes'}
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-gray-400">
                                        {isEditing ? 'Edit your markdown notes' : 'Preview your notes'}
                                        {hasUnsavedChanges && (
                                            <span className="text-yellow-400 ml-2 font-medium">• Unsaved changes</span>
                                        )}
                                        {autoSaveEnabled && isEditing && (
                                            <span className="text-green-400 ml-2 font-medium">• Auto-save enabled</span>
                                        )}
                                    </CardDescription>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                                                variant="outline"
                                                size="sm"
                                                className={`border-gray-700 ${autoSaveEnabled
                                                    ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                    : 'bg-gray-800/30 text-gray-400 hover:bg-gray-800/50'
                                                    }`}
                                                title="Toggle auto-save"
                                            >
                                                {autoSaveEnabled ? <Zap className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                onClick={handleDiscard}
                                                disabled={!hasUnsavedChanges}
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-700 text-gray-400 hover:bg-gray-800/50 disabled:opacity-50"
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Discard
                                            </Button>
                                            <Button
                                                data-save-btn
                                                onClick={handleSave}
                                                disabled={!hasUnsavedChanges}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Changes
                                            </Button>
                                            <Button
                                                onClick={toggleEditMode}
                                                size="sm"
                                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview
                                            </Button>
                                        </>
                                    ) : (
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
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-700 text-gray-400 hover:bg-gray-800/50"
                                            >
                                                <Upload className="mr-2 h-4 w-4" />
                                                Import
                                            </Button>
                                            <Button
                                                onClick={handleExport}
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-700 text-gray-400 hover:bg-gray-800/50"
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Export
                                            </Button>
                                            <Button
                                                onClick={toggleEditMode}
                                                size="sm"
                                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Notes
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                {/* Content Area */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <Tabs value={isEditing ? "edit" : "preview"} className="w-full">
                            <TabsList className="hidden" />

                            <TabsContent value="edit" className="m-0">
                                <div className="p-6">
                                    <div className="mb-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Edit className="h-4 w-4 text-purple-400" />
                                            <span className="text-gray-300 font-medium">Markdown Editor</span>
                                        </div>
                                        <span className="text-gray-500 text-sm">
                                            {editContent.length} characters
                                        </span>
                                    </div>

                                    <Textarea
                                        value={editContent}
                                        onChange={handleContentChange}
                                        placeholder="Write your notes in Markdown..."
                                        className="min-h-[600px] w-full bg-gray-800/30 border-gray-700 text-gray-100 placeholder:text-gray-500 font-mono text-sm leading-relaxed resize-none focus:border-purple-500 focus:ring-purple-500/20"
                                        style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
                                    />

                                    <Separator className="my-4 bg-gray-700" />

                                    <Card className="bg-gray-800/30 border-gray-700">
                                        <CardContent className="p-4">
                                            <CardTitle className="text-sm text-gray-300 mb-3">
                                                Markdown Reference & Shortcuts
                                            </CardTitle>
                                            <div className="text-gray-500 text-xs space-y-2">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <div># Heading 1, ## Heading 2, ### Heading 3</div>
                                                    <div>**bold**, *italic*, `code`</div>
                                                    <div>- Bullet list, 1. Numbered list</div>
                                                    <div>[Link](url), ![Image](url)</div>
                                                </div>
                                                <Separator className="my-2 bg-gray-600" />
                                                <div>
                                                    <strong className="text-gray-400">Keyboard Shortcuts:</strong>
                                                    <span className="ml-2">Ctrl+S: Save • Ctrl+E: Toggle Edit • Esc: Exit Edit</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="preview" className="m-0">
                                <div className="p-6">
                                    <div className="prose prose-gray dark:prose-invert prose-lg max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-6 mb-3 text-gray-200" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-200" {...props} />,
                                                h4: ({ node, ...props }) => <h4 className="text-lg font-semibold mt-3 mb-2 text-gray-300" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 text-gray-300" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 text-gray-300" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="text-gray-200 font-semibold" {...props} />,
                                                em: ({ node, ...props }) => <em className="text-gray-300 italic" {...props} />,
                                                code: ({ node, ...props }) => (
                                                    <code className="bg-gray-800/50 text-purple-300 px-2 py-1 rounded text-sm font-mono border border-gray-700" {...props} />
                                                ),
                                                pre: ({ node, ...props }) => (
                                                    <pre className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 overflow-x-auto my-4" {...props} />
                                                ),
                                                p: ({ node, ...props }) => <p className="mb-4 text-gray-300 leading-relaxed" {...props} />,
                                                blockquote: ({ node, ...props }) => (
                                                    <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4 bg-gray-800/30 py-3 rounded-r" {...props} />
                                                ),
                                                a: ({ node, ...props }) => (
                                                    <a className="text-purple-400 hover:text-purple-300 underline transition-colors" {...props} />
                                                ),
                                                table: ({ node, ...props }) => (
                                                    <table className="min-w-full bg-gray-800/30 border border-gray-700 rounded-lg my-4 overflow-hidden" {...props} />
                                                ),
                                                th: ({ node, ...props }) => (
                                                    <th className="px-4 py-3 bg-gray-700/50 text-gray-200 font-semibold border-b border-gray-600 text-left" {...props} />
                                                ),
                                                td: ({ node, ...props }) => (
                                                    <td className="px-4 py-3 text-gray-300 border-b border-gray-700/50" {...props} />
                                                ),
                                            }}
                                        >
                                            {displayContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Unsaved Changes Indicator */}
                {hasUnsavedChanges && (
                    <Card className="mt-4 bg-yellow-900/20 border-yellow-700/50 backdrop-blur-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <Save className="h-4 w-4 text-yellow-400" />
                                <p className="text-yellow-200 text-sm">
                                    You have unsaved changes. Don't forget to save your work!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
