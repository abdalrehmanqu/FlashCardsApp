'use client';
import { useState } from 'react';
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useApi } from '../components/Api';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Link as LinkIcon, Sparkles, BookOpen } from 'lucide-react';

export default function NotesGenerator() {
    const [activeTab, setActiveTab] = useState('text');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const charLimit = 5000;
    const [file, setFile] = useState([]);
    const [link, setLink] = useState('');

    const router = useRouter();
    const { makeRequest } = useApi();

    const generateNotes = async () => {
        setIsLoading(true);
        const links = link.split('\n').filter(l => l.trim() !== '');
        const formData = new FormData();
        formData.append('prompt', prompt);
        file.forEach((f) => formData.append('files', f))
        links.forEach((l) => formData.append('links', l))

        try {
            const note = await makeRequest("generateNotes", {
                method: "POST",
                body: formData,
            });
            router.push(`/notes/${note.id}`);
        } catch (error) {
            console.error('Error generating notes:', error);
            setError('Failed to generate notes. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    const handleFileChange = async (files) => {
        if (files) {
            const newFiles = [...file, ...files];
            setFile(newFiles);
        }
    }

    const quickPrompts = [
        "Summarize the key concepts of machine learning and artificial intelligence.",
        "Create study notes on photosynthesis and cellular respiration.",
        "Generate notes on the causes and effects of World War II.",
        "Make detailed notes about JavaScript fundamentals and ES6 features."
    ];

    const isGenerateDisabled =
        (prompt.trim() === '') &&
        (link.trim() === '') &&
        ((!file || file.length === 0));

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="mx-auto max-w-4xl">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="mb-3 text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                        Generate Study Notes
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Transform your content into comprehensive study materials
                    </p>
                </div>

                {/* Main Content Card */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-purple-400" />
                            <CardTitle className="text-gray-100">Content Source</CardTitle>
                        </div>
                        <CardDescription className="text-gray-500">
                            Choose how you want to create your study notes
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Content Source Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border border-gray-700">
                                <TabsTrigger
                                    value="text"
                                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Text
                                </TabsTrigger>
                                <TabsTrigger
                                    value="upload"
                                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </TabsTrigger>
                                <TabsTrigger
                                    value="link"
                                    className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400"
                                >
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Link
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="text" className="space-y-4">
                                <div className="relative">
                                    <Textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        maxLength={charLimit}
                                        placeholder="Input or paste text to generate comprehensive study notes..."
                                        className="min-h-[160px] resize-y border-gray-700 bg-gray-800/30 text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                                    />
                                    <span className="absolute bottom-3 right-3 text-xs text-gray-500">
                                        {prompt.length}/{charLimit}
                                    </span>
                                </div>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4">
                                <div className="relative">
                                    <label
                                        htmlFor="file-upload"
                                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-gray-800/20 hover:border-purple-500 hover:bg-gray-800/30 transition-all duration-200"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-3 text-gray-500" />
                                            <p className="mb-2 text-sm text-gray-400">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-gray-500">PDF files (MAX. 10MB)</p>
                                        </div>
                                        <input
                                            id="file-upload"
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e.target.files)}
                                        />
                                    </label>
                                    {file && file.length > 0 && (
                                        <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                                            <p className="text-sm text-gray-300 font-medium mb-1">Selected files:</p>
                                            <p className="text-xs text-gray-500">
                                                {Array.from(file).map(f => f.name).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="link" className="space-y-4">
                                <div className="relative">
                                    <Textarea
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        maxLength={charLimit}
                                        placeholder="Input URLs to generate notes from web content. YouTube links are supported..."
                                        className="min-h-[160px] resize-y border-gray-700 bg-gray-800/30 text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                                    />
                                    <span className="absolute bottom-3 right-3 text-xs text-gray-500">
                                        {link.length}/{charLimit}
                                    </span>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <Separator className="bg-gray-700" />

                        {/* Generate Button */}
                        <Button
                            onClick={() => {
                                if (!isGenerateDisabled) generateNotes();
                            }}
                            disabled={isGenerateDisabled || isLoading}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                        >
                            {isLoading ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Generating Notes...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Study Notes
                                </>
                            )}
                        </Button>

                        {error && (
                            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Prompts */}
                {activeTab === 'text' && (
                    <Card className="mt-6 bg-gray-900/30 border-gray-800 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-gray-100 text-lg">Quick Start Prompts</CardTitle>
                            <CardDescription className="text-gray-500">
                                Click any prompt to get started quickly
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3 justify-center">
                                {quickPrompts.map((promptText, index) => (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        onClick={() => setPrompt(promptText)}
                                        className="h-auto p-4 text-left justify-start border-gray-700 bg-gray-800/20 hover:bg-gray-800/40 hover:border-purple-500/50 text-gray-300 hover:text-gray-100 transition-all duration-200"
                                    >
                                        <div className="text-sm leading-relaxed">
                                            {promptText}
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
