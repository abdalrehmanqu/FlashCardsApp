'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from 'C:/Users/kingh/Documents/GitHub/FlashCardsApp/flashapp/app/components/Api.js';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    ChevronLeft,
    ChevronRight,
    RotateCw,
    BookOpen,
    ArrowLeft,
    Loader2,
    GraduationCap
} from 'lucide-react';

export default function FlashcardStudyPage() {
    const params = useParams();
    const router = useRouter();
    const deckId = params?.deckId;
    const { makeRequest } = useApi();

    const [deck, setDeck] = useState(null);
    const [cards, setCards] = useState([]);
    const [index, setIndex] = useState(0);
    const [showBack, setShowBack] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);    // fetch deck once
    useEffect(() => {
        const loadDeck = async () => {
            try {
                setLoading(true);
                const deckData = await makeRequest(`decks/${deckId}`);
                setDeck(deckData);
                setCards(deckData.cards || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load deck');
            } finally {
                setLoading(false);
            }
        };

        if (deckId) {
            loadDeck();
        }
    }, [deckId]); const handlePrevious = () => {
        setShowBack(false);
        setIndex(Math.max(0, index - 1));
    };

    const handleNext = () => {
        setShowBack(false);
        setIndex(Math.min(cards.length - 1, index + 1));
    };

    const handleFlip = () => {
        setShowBack(!showBack);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                            <p className="text-gray-300 text-lg">Loading flashcards...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || cards.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm max-w-md w-full">
                    <CardHeader className="text-center">
                        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <CardTitle className="text-gray-200">
                            {error || 'No flashcards found'}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                            {error ? 'Please try again later.' : 'This deck appears to be empty.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => router.push('/history')}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to History
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    } const current = cards[index];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push('/history')}
                                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            <div className="flex items-center gap-2">
                                <GraduationCap className="h-8 w-8 text-purple-400" />
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                        {deck?.name || `Deck Study`}
                                    </h1>
                                    {deck?.description && (
                                        <p className="text-gray-400">{deck.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-gray-300 text-lg font-semibold">
                                {index + 1} / {cards.length}
                            </p>
                            <p className="text-gray-500 text-sm">
                                Click card to flip
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Flashcard Area */}
                <div className="flex items-center justify-center gap-6 mb-8">
                    {/* Previous Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        disabled={index === 0}
                        onClick={handlePrevious}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-30 h-12 w-12 p-0"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    {/* Flashcard */}
                    <div
                        className="relative w-full max-w-4xl h-96 cursor-pointer"
                        style={{ perspective: '1000px' }}
                        onClick={handleFlip}
                    >
                        <div
                            className="relative w-full h-full transition-transform duration-700"
                            style={{
                                transformStyle: 'preserve-3d',
                                transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
                            }}
                        >
                            {/* Front of card */}
                            <Card
                                className="absolute inset-0 bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200"
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <CardHeader className="h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                                            <span className="text-xs text-gray-400 uppercase tracking-wide">Question</span>
                                        </div>
                                        <RotateCw className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-2xl md:text-4xl text-center font-semibold text-gray-100 leading-relaxed">
                                            {current.question}
                                        </p>
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Back of card */}
                            <Card
                                className="absolute inset-0 bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-200"
                                style={{
                                    transform: 'rotateY(180deg)',
                                    backfaceVisibility: 'hidden',
                                }}
                            >
                                <CardHeader className="h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-purple-500 rounded-full" />
                                            <span className="text-xs text-gray-400 uppercase tracking-wide">Answer</span>
                                        </div>
                                        <RotateCw className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <div className="flex-1 flex items-center justify-center">
                                        <p className="text-2xl md:text-4xl text-center font-semibold text-gray-100 leading-relaxed">
                                            {current.answer}
                                        </p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    {/* Next Button */}
                    <Button
                        variant="outline"
                        size="lg"
                        disabled={index === cards.length - 1}
                        onClick={handleNext}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-30 h-12 w-12 p-0"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>

                {/* Controls */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handlePrevious}
                                    disabled={index === 0}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Previous
                                </Button>
                                <Button
                                    onClick={handleFlip}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                >
                                    <RotateCw className="mr-2 h-4 w-4" />
                                    Flip Card
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleNext}
                                    disabled={index === cards.length - 1}
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>

                            <div className="text-sm text-gray-400">
                                Progress: {Math.round(((index + 1) / cards.length) * 100)}%
                            </div>
                        </div>

                        <Separator className="bg-gray-700 my-4" />

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>Card {index + 1}</span>
                                <span>{cards.length} total</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((index + 1) / cards.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
