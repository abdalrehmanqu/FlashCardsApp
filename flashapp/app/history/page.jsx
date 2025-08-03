'use client'
import React, { useEffect, useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useRouter } from 'next/navigation'
import { useApi } from "../components/Api"
import { useAuth } from "@clerk/nextjs"
import {
    History,
    Plus,
    Grid3X3,
    List,
    FileText,
    BookOpen,
    Zap,
    Edit,
    Eye,
    Play,
    Loader2,
    Calendar,
    Hash
} from 'lucide-react'

export default function page() {
    const { makeRequest } = useApi()
    const [decks, setDecks] = useState([])
    const [notes, setNotes] = useState([])
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const { isSignedIn, getToken } = useAuth()
    const [activeTab, setActiveTab] = useState('tiles');
    const [contentType, setContentType] = useState('flashcards'); // 'flashcards', 'notes', or 'quizzes'
    const router = useRouter();

    useEffect(() => {
        fetchHistory()
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            console.log('Is signed in:', isSignedIn)
            if (isSignedIn) {
                const token = await getToken()
                console.log('Token exists:', !!token)
                console.log('Token preview:', token?.substring(0, 20) + '...')
            }
        }
        checkAuth()
    }, [isSignedIn])

    const fetchHistory = async () => {
        try {
            setLoading(true)
            const [decksData, notesData, quizzesData] = await Promise.all([
                makeRequest("decks/me"),
                makeRequest("notes/me"),
                makeRequest("quizzes/me")
            ])
            setDecks(decksData)
            setNotes(notesData)
            setQuizzes(quizzesData)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <History className="h-8 w-8 text-purple-400" />
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                Your History
                            </h1>
                        </div>

                        {/* Content Type Selector */}
                        <div className="flex gap-2">
                            <Button
                                variant={contentType === 'flashcards' ? 'default' : 'outline'}
                                onClick={() => setContentType('flashcards')}
                                className={contentType === 'flashcards'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                                    : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                                }
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Flashcards
                            </Button>
                            <Button
                                variant={contentType === 'notes' ? 'default' : 'outline'}
                                onClick={() => setContentType('notes')}
                                className={contentType === 'notes'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                                    : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                                }
                            >
                                <BookOpen className="mr-2 h-4 w-4" />
                                Notes
                            </Button>
                            <Button
                                variant={contentType === 'quizzes' ? 'default' : 'outline'}
                                onClick={() => setContentType('quizzes')}
                                className={contentType === 'quizzes'
                                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                                    : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                                }
                            >
                                <Zap className="mr-2 h-4 w-4" />
                                Quizzes
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Controls Bar */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm mb-6">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                            <Button
                                onClick={() => router.push(
                                    contentType === 'flashcards' ? '/' :
                                        contentType === 'notes' ? '/notes' : '/quiz'
                                )}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create New
                            </Button>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                                <TabsList className="bg-gray-800/50 border border-gray-700">
                                    <TabsTrigger
                                        value="tiles"
                                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
                                    >
                                        <List className="mr-2 h-4 w-4" />
                                        Table
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="cards"
                                        className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
                                    >
                                        <Grid3X3 className="mr-2 h-4 w-4" />
                                        Cards
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading State */}
                {loading ? (
                    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-4" />
                                <p className="text-gray-300">Loading your content...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Cards View */}
                        {activeTab === 'cards' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {contentType === 'flashcards' ? (
                                    decks.map((item) => (
                                        <Card
                                            key={item.id}
                                            className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
                                            onClick={() => router.push(`/decks/${item.id}`)}
                                        >
                                            <CardHeader>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                                    <span className="text-xs text-gray-400 uppercase tracking-wide">Flashcard Deck</span>
                                                </div>
                                                <CardTitle className="text-gray-100 group-hover:text-purple-400 transition-colors">
                                                    {item.name}
                                                </CardTitle>
                                                <CardDescription className="text-gray-400">
                                                    {item.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="h-3 w-3" />
                                                        {item.cards?.length || 0} cards
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <div className="flex gap-2 w-full">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/decks/${item.id}/edit`);
                                                        }}
                                                        className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                                                    >
                                                        <Edit className="mr-1 h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/decks/${item.id}`);
                                                        }}
                                                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                    >
                                                        <Play className="mr-1 h-3 w-3" />
                                                        Study
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ))
                                ) : contentType === 'notes' ? (
                                    notes.map((item) => (
                                        <Card
                                            key={item.id}
                                            className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
                                            onClick={() => router.push(`/notes/${item.id}`)}
                                        >
                                            <CardHeader>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                                    <span className="text-xs text-gray-400 uppercase tracking-wide">Study Notes</span>
                                                </div>
                                                <CardTitle className="text-gray-100 group-hover:text-purple-400 transition-colors">
                                                    {item.title}
                                                </CardTitle>
                                                <CardDescription className="text-gray-400 line-clamp-2">
                                                    {item.content?.substring(0, 120)}...
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {item.source_type || 'Text'}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <div className="flex gap-2 w-full">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/notes/${item.id}`);
                                                        }}
                                                        className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                                                    >
                                                        <Edit className="mr-1 h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/notes/${item.id}`);
                                                        }}
                                                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                    >
                                                        <Eye className="mr-1 h-3 w-3" />
                                                        View
                                                    </Button>
                                                </div>
                                            </CardFooter>
                                        </Card>
                                    ))
                                ) : (
                                    quizzes.map((item) => (
                                        <Card
                                            key={item.id}
                                            className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200 cursor-pointer group"
                                            onClick={() => router.push(`/quiz/${item.id}`)}
                                        >
                                            <CardHeader>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                                                    <span className="text-xs text-gray-400 uppercase tracking-wide">Quiz</span>
                                                </div>
                                                <CardTitle className="text-gray-100 group-hover:text-purple-400 transition-colors">
                                                    {item.title}
                                                </CardTitle>
                                                <CardDescription className="text-gray-400">
                                                    {item.description || 'Interactive Quiz'}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Hash className="h-3 w-3" />
                                                        {item.questions ? JSON.parse(item.questions).length : 0} questions
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <CardFooter>
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/quiz/${item.id}`);
                                                    }}
                                                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                >
                                                    <Play className="mr-2 h-4 w-4" />
                                                    Take Quiz
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Table View */}
                        {activeTab === 'tiles' && (
                            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-800">
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Title</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                                                    {contentType === 'flashcards' ? 'Cards' : contentType === 'notes' ? 'Source' : 'Questions'}
                                                </th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Updated</th>
                                                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800">
                                            {contentType === 'flashcards' ? (
                                                decks.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 group"
                                                        onClick={() => router.push(`/decks/${item.id}`)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors">
                                                                        {item.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mt-1">{item.description}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-300">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                                                                {item.cards?.length || 0} cards
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/decks/${item.id}/edit`);
                                                                    }}
                                                                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                                                                >
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/decks/${item.id}`);
                                                                    }}
                                                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                                >
                                                                    <Play className="mr-1 h-3 w-3" />
                                                                    Study
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : contentType === 'notes' ? (
                                                notes.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 group"
                                                        onClick={() => router.push(`/notes/${item.id}`)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors">
                                                                        {item.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        {item.content?.substring(0, 100)}...
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-300">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                                                                {item.source_type || 'Text'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex gap-2 justify-end">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/notes/${item.id}`);
                                                                    }}
                                                                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                                                                >
                                                                    <Edit className="mr-1 h-3 w-3" />
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        router.push(`/notes/${item.id}`);
                                                                    }}
                                                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                                >
                                                                    <Eye className="mr-1 h-3 w-3" />
                                                                    View
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                quizzes.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 group"
                                                        onClick={() => router.push(`/quiz/${item.id}`)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-200 group-hover:text-purple-400 transition-colors">
                                                                        {item.title}
                                                                    </div>
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        {item.description || 'Quiz'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-300">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                                                                {item.questions ? JSON.parse(item.questions).length : 0} questions
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-400">
                                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    router.push(`/quiz/${item.id}`);
                                                                }}
                                                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                                            >
                                                                <Play className="mr-1 h-3 w-3" />
                                                                Take Quiz
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
