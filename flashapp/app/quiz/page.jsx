'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route } from 'react-router-dom';
import { Textarea } from "@/components/ui/textarea"
import { useApi } from '../components/Api';
import { useRouter } from 'next/navigation';
export default function QuizGenerator() {
    const [activeTab, setActiveTab] = useState('text');
    const [count, setCount] = useState(10);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const charLimit = 5000;
    const API_URL = "http://127.0.0.1:8000"; const [file, setFile] = useState([]);
    const [link, setLink] = useState('');
    const [timeLimit, setTimeLimit] = useState(300); // 5 minutes default

    const [status, setStatus] = useState('idle');
    const router = useRouter();
    const { makeRequest } = useApi(); const generateQuizzes = async () => {
        setIsLoading(true);
        setStatus('generating');
        const links = link.split('\n').filter(l => l.trim() !== '');
        const formData = new FormData();
        formData.append('prompt', prompt);
        formData.append('count', String(count));
        formData.append('mix_config', JSON.stringify({})); // Empty mix config for now
        formData.append('time_limit', String(timeLimit));
        file.forEach((f) => formData.append('files', f))
        links.forEach((l) => formData.append('links', l))

        try {
            const response = await makeRequest("quiz/generate", {
                method: "POST",
                body: formData,
            });
            router.push(`/quiz/${response.quiz_id}`);

        } catch (error) {
            console.error('Error generating quiz:', error);
            setError('Failed to generate quiz. Please try again.');
        } finally {
            setIsLoading(false);
            setStatus('idle');
        }
    }

    const handleFileChange = async (files) => {
        if (files) {
            const newFiles = [...file, ...files];
            setFile(newFiles);
        }
    }

    const isYouTubeLink = (url) => {
        try {
            const videoId = new URL(url).searchParams.get("v");
            return videoId !== null;
        } catch (e) {
            return false;
        }
    }

    const isGenerateDisabled =
        (prompt.trim() === '') &&
        (link.trim() === '') &&
        ((!file || file.length === 0));

    return (<div className="mx-auto mt-10 max-w-2xl bg-gray-950 p-6 shadow-lg rounded-xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Quiz Generator</h1>

        <div className="mb-3 flex gap-2">
            {['Text', 'Upload', 'Link'].map((label) => {
                const isActive = activeTab === label.toLowerCase();
                return (
                    <button
                        key={label}
                        onClick={() => setActiveTab(label.toLowerCase())}
                        className={`rounded-md border px-4 py-2 text-sm transition
              ${isActive
                                ? 'rounded-md border-2 border-gray-700 bg-gray-800 p-3 text-white text-left text-sm hover:bg-gray-800'
                                : 'rounded-md border-2 border-gray-800 bg-gray-950 p-3 text-white text-left text-sm hover:bg-gray-800'}`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>            <div className="mb-3 flex gap-4">
            <div className="mb-3 flex gap-4">
                <p className="text-sm flex items-center text-gray-400">Time Limit (minutes):</p>
                <input
                    type="number"
                    min={1}
                    max={60}
                    value={timeLimit / 60}
                    onChange={(e) => setTimeLimit(+e.target.value * 60)}
                    className="h-10 w-24 rounded-md border border-gray-700 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
            </div>
            <div className="mb-3 flex gap-4">
                <p className="text-sm flex items-center text-gray-400">Number of Questions:</p>
                <input
                    type="number"
                    min={1}
                    max={25}
                    value={count}
                    onChange={(e) => setCount(+e.target.value)}
                    className="h-10 w-24 rounded-md border border-gray-700 px-3 text-sm focus:border-blue-500 focus:outline-none"
                />
            </div>
        </div>
        {activeTab === 'text' && (
            <div className="relative mb-4">
                <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={charLimit}
                    placeholder="Input or paste text to generate a quiz."
                    className="min-h-[160px] w-full resize-y rounded-md border border-gray-700 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-500">
                    {prompt.length}/{charLimit}
                </span>
            </div>
        )}
        {activeTab === 'link' && (
            <div className="relative mb-4">
                <Textarea
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    maxLength={charLimit}
                    placeholder="Input some links (URLs) to generate a quiz. You can also upload youtube links."
                    className="min-h-[160px] w-full resize-y rounded-md border border-gray-700 p-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute bottom-2 right-3 text-xs text-gray-500">
                    {link.length}/{charLimit}
                </span>
            </div>
        )}
        {activeTab === 'upload' && (
            <div className="relative mb-4 flex flex-col items-center">
                <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-md cursor-pointer bg-gray-900 hover:border-blue-500 transition"
                >
                    <span className="text-gray-400 text-sm">Click to upload PDF</span>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                    />
                </label>
                {file && file.length > 0 && (
                    <div className="mt-2 text-xs text-gray-300">
                        Selected: {Array.from(file).map(f => f.name).join(', ')}
                    </div>
                )}
            </div>
        )}            <button
            onClick={() => {
                if (!isGenerateDisabled) generateQuizzes();
            }}
            disabled={isGenerateDisabled || isLoading}
            className={`mb-6 w-full rounded-md bg-gradient-to-r from-gray-900 to-gray-700 px-4 py-3 text-sm font-semibold uppercase text-white transition-colors 
          ${isGenerateDisabled || isLoading ? 'opacity-50 hover:bg-gradient-to-r' : 'hover:cursor-pointer hover:scale-102'}
        `}
        >
            {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
        </button>

        {error && (
            <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
                <p className="text-red-200">{error}</p>
            </div>
        )}

    </div>
    );
}

