'use client';
import { useState, useEffect } from "react";
import React from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useParams, useRouter } from "next/navigation";
import { useApi } from "C:\\Users\\kingh\\Documents\\GitHub\\FlashCardsApp\\flashapp\\app\\components\\Api.js";
import {
    Save,
    Plus,
    Trash2,
    Bot,
    Send,
    ArrowLeft,
    Loader2,
    AlertTriangle,
    Edit,
    Eye,
    Check,
    X,
    RotateCcw,
    Sparkles
} from 'lucide-react';

export default function EditDeckPage() {
    const { deckId } = useParams();
    const router = useRouter();
    const { makeRequest } = useApi();

    // Main state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [loadError, setLoadError] = useState(null);

    // Chat state
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', content: 'Hello! How can I help you with your flashcards?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [appliedChanges, setAppliedChanges] = useState({}); // Track applied changes by proposalId

    const loadDeckData = async () => {
        try {
            setLoading(true);
            setLoadError(null); // Clear previous errors
            const deck = await makeRequest(`decks/${deckId}`);
            setName(deck.name || '');
            setDescription(deck.description || '');
            setCards(deck.cards || []);
        } catch (error) {
            console.error('Load deck error:', error);
            setLoadError('Failed to load deck data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (deckId) {
            loadDeckData();
        }
    }, [deckId]);

    const handleCardChange = (index, field, value) => {
        const updatedCards = [...cards];
        updatedCards[index] = { ...updatedCards[index], [field]: value };
        setCards(updatedCards);
    };

    const addNewCard = () => {
        setCards(prevCards => [...prevCards, { question: '', answer: '' }]);
    };

    const removeCard = (index) => {
        setCards(prevCards => prevCards.filter((_, i) => i !== index));
    };

    const saveDeck = async () => {
        try {
            setSaving(true);
            setError(null); // Clear previous errors

            const deckData = {
                id: parseInt(deckId),
                name: name.trim(),
                description: description.trim(),
                cards: cards.filter(card => card.question.trim() || card.answer.trim()) // Remove empty cards
            };

            await makeRequest(`decks/${deckId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deckData),
            });

            // Navigate after successful save
            setTimeout(() => {
                router.push(`/decks/${deckId}`);
            }, 500);

        } catch (error) {
            console.error('Save deck error:', error);
            setError('Failed to save deck: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || chatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');

        // Add user message to chat
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatLoading(true);

        try {
            // Prepare deck snapshot with current state
            const deckSnapshot = {
                cards: cards.map((card, index) => ({
                    id: (index + 1).toString(),
                    front: card.question || '',
                    back: card.answer || ''
                }))
            };

            // Send chat request to backend
            const response = await makeRequest('flashcards/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    deckSnapshot: deckSnapshot
                })
            });

            // Add AI response to chat
            if (response.humanSummary && response.humanSummary.length > 0) {
                const summary = response.humanSummary.join('\n');
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `I can help you with that! Here's what I propose:\n\n${summary}`,
                    proposalId: response.proposalId,
                    commands: response.commands,
                    showButtons: true,
                    isApplied: false
                }]);
            } else {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'I understand your request, but I don\'t have any specific changes to suggest right now.'
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            let errorMessage = 'Sorry, I encountered an error processing your request.';
            if (error.message.includes('AI couldn\'t understand')) {
                errorMessage = error.message;
            } else if (error.message.includes('Try being more specific')) {
                errorMessage = 'I need more specific instructions. Try saying things like:\n• "Make card 1 more challenging"\n• "Add harder questions to all cards"\n• "Update the definitions to be more detailed"';
            }

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleApplyChanges = async (proposalId, commands) => {
        try {
            // Prepare current deck snapshot
            const deckSnapshot = {
                cards: cards.map((card, index) => ({
                    id: (index + 1).toString(),
                    front: card.question || '',
                    back: card.answer || ''
                }))
            };

            // Store original state for potential reversal
            const originalCards = [...cards];

            // Send apply request
            const response = await makeRequest('flashcards/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposalId: proposalId,
                    acceptedIndexes: [0], // Accept the first command
                    deckSnapshot: deckSnapshot
                })
            });

            // Apply changes to the editing page
            if (response.newDeck && response.newDeck.cards) {
                const updatedCards = response.newDeck.cards.map(card => ({
                    question: card.front || '',
                    answer: card.back || ''
                }));
                setCards(updatedCards);

                // Store the original state for reversal
                setAppliedChanges(prev => ({
                    ...prev,
                    [proposalId]: originalCards
                }));

                // Update the message to show applied state
                setChatMessages(prev => prev.map(msg =>
                    msg.proposalId === proposalId
                        ? { ...msg, showButtons: false, isApplied: true }
                        : msg
                ));

                // Add success message to chat
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Changes applied successfully! Your flashcards have been updated.'
                }]);
            }
        } catch (error) {
            console.error('Apply error:', error);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error applying the changes. Please try again.'
            }]);
        }
    };

    const handleReverseChanges = (proposalId) => {
        const originalCards = appliedChanges[proposalId];
        if (originalCards) {
            setCards(originalCards);

            // Remove from applied changes
            setAppliedChanges(prev => {
                const newState = { ...prev };
                delete newState[proposalId];
                return newState;
            });

            // Update the message to show reverted state
            setChatMessages(prev => prev.map(msg =>
                msg.proposalId === proposalId
                    ? { ...msg, isApplied: false, showButtons: true }
                    : msg
            ));

            // Add confirmation message
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Changes have been reversed. Your flashcards are back to their previous state.'
            }]);
        }
    };

    const handleDenyChanges = (proposalId) => {
        // Hide the buttons for this message
        setChatMessages(prev => prev.map(msg =>
            msg.proposalId === proposalId
                ? { ...msg, showButtons: false }
                : msg
        ));

        setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: 'No problem! Feel free to ask for other suggestions or modifications.'
        }]);
    }; if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                            <p className="text-gray-300 text-lg">Loading deck...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm max-w-md w-full">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <CardTitle className="text-red-400">Error Loading Deck</CardTitle>
                        <CardDescription className="text-gray-400">{loadError}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={loadDeckData}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                        >
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    } return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">

                {/* Main Edit Panel */}
                <div className="lg:col-span-3 ">
                    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm h-screen overflow-y-scroll">
                        {/* Header */}
                        <CardHeader className="bg-gradient-to-r from-purple-600/20 to-purple-700/20 border-b border-gray-800">
                            <div className="flex justify-between items-center">
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
                                        <Edit className="h-6 w-6 text-purple-400" />
                                        <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                            Edit Deck
                                        </CardTitle>
                                    </div>
                                </div>
                                <Button
                                    onClick={saveDeck}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 ">
                            {/* Error Display */}
                            {error && (
                                <Card className="bg-red-900/20 border-red-800 mb-6">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-red-400">
                                                <AlertTriangle className="h-4 w-4" />
                                                <p className="text-sm">{error}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setError(null)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Deck Info */}
                            <Card className="bg-gray-800/30 border-gray-700 mb-6">
                                <CardHeader>
                                    <CardTitle className="text-gray-100">Deck Information</CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Edit your deck's basic information
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Deck Name</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter deck name..."
                                            className="border-gray-700 bg-gray-800/30 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                                        <Textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Describe your deck..."
                                            rows={3}
                                            className="border-gray-700 bg-gray-800/30 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Cards */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-100">Flashcards</h3>
                                    <Button
                                        onClick={addNewCard}
                                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Card
                                    </Button>
                                </div>

                                {cards.map((card, index) => (
                                    <Card key={index} className="bg-gray-800/30 border-gray-700 hover:border-purple-500/50 transition-all duration-200">
                                        <CardHeader className="pb-4">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                                        {index + 1}
                                                    </div>
                                                    <CardTitle className="text-gray-100">Card {index + 1}</CardTitle>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => removeCard(index)}
                                                    className="border-red-700 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Question</label>
                                                <Textarea
                                                    value={card.question || ''}
                                                    onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                                                    placeholder="Enter the question..."
                                                    rows={2}
                                                    className="border-gray-700 bg-gray-800/30 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-300 mb-2">Answer</label>
                                                <Textarea
                                                    value={card.answer || ''}
                                                    onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                                                    placeholder="Enter the answer..."
                                                    rows={2}
                                                    className="border-gray-700 bg-gray-800/30 text-gray-100 focus:border-purple-500 focus:ring-purple-500/20"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* AI Chat Panel */}
                <div className="lg:col-span-1">
                    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm h-full flex flex-col">
                        {/* Chat Header */}
                        <CardHeader className="bg-gradient-to-r from-purple-600/20 to-purple-700/20 border-b border-gray-800 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                                <Bot className="h-5 w-5 text-purple-400" />
                                <CardTitle className="text-lg text-gray-100">AI Assistant</CardTitle>
                            </div>
                            <CardDescription className="text-gray-400">
                                Ask me to improve your flashcards
                            </CardDescription>
                        </CardHeader>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map((message, index) => (
                                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`px-3 py-2 rounded-lg max-w-[90%] ${message.role === 'user'
                                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                                        : 'bg-gray-800/50 text-gray-200 border border-gray-700'
                                        }`}>
                                        <div className="whitespace-pre-wrap text-xs">{message.content}</div>

                                        {/* Preview and Action Buttons */}
                                        {message.showButtons && !message.isApplied && message.commands && (
                                            <div className="mt-3 space-y-2">
                                                {/* Preview section */}
                                                <Card className="bg-gray-700/50 border-gray-600">
                                                    <CardContent className="p-3">
                                                        <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                                                            <Eye className="h-3 w-3" />
                                                            Preview Changes
                                                        </div>
                                                        {message.commands.map((command, cmdIndex) => {
                                                            if (command.name === 'update_card') {
                                                                const cardId = command.arguments.id;
                                                                const currentCard = cards.find((_, idx) => (idx + 1).toString() === cardId);

                                                                return (
                                                                    <div key={cmdIndex} className="bg-gray-800/50 rounded p-2 mb-2 text-xs">
                                                                        <div className="font-medium text-gray-300 mb-1">Card {cardId}:</div>

                                                                        {command.arguments.front && (
                                                                            <div className="mb-2">
                                                                                <div className="text-gray-400 text-xs">Question:</div>
                                                                                <div className="space-y-1">
                                                                                    <div className="bg-red-900/30 p-1 rounded text-red-200 text-xs">
                                                                                        <span className="text-red-400">- </span>
                                                                                        {currentCard?.question || 'Empty'}
                                                                                    </div>
                                                                                    <div className="bg-green-900/30 p-1 rounded text-green-200 text-xs">
                                                                                        <span className="text-green-400">+ </span>
                                                                                        {command.arguments.front}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {command.arguments.back && (
                                                                            <div>
                                                                                <div className="text-gray-400 text-xs">Answer:</div>
                                                                                <div className="space-y-1">
                                                                                    <div className="bg-red-900/30 p-1 rounded text-red-200 text-xs">
                                                                                        <span className="text-red-400">- </span>
                                                                                        {currentCard?.answer || 'Empty'}
                                                                                    </div>
                                                                                    <div className="bg-green-900/30 p-1 rounded text-green-200 text-xs">
                                                                                        <span className="text-green-400">+ </span>
                                                                                        {command.arguments.back}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            } else if (command.name === 'add_card') {
                                                                return (
                                                                    <div key={cmdIndex} className="bg-gray-800/50 rounded p-2 mb-2 text-xs">
                                                                        <div className="font-medium text-green-300 mb-1 flex items-center gap-1">
                                                                            <Plus className="h-3 w-3" />
                                                                            New Card:
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <div>
                                                                                <span className="text-gray-400">Question: </span>
                                                                                <span className="text-green-200">{command.arguments.front}</span>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-400">Answer: </span>
                                                                                <span className="text-green-200">{command.arguments.back}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } else if (command.name === 'delete_card') {
                                                                const cardId = command.arguments.id;
                                                                const currentCard = cards.find((_, idx) => (idx + 1).toString() === cardId);

                                                                return (
                                                                    <div key={cmdIndex} className="bg-gray-800/50 rounded p-2 mb-2 text-xs">
                                                                        <div className="font-medium text-red-300 mb-1 flex items-center gap-1">
                                                                            <Trash2 className="h-3 w-3" />
                                                                            Delete Card {cardId}:
                                                                        </div>
                                                                        <div className="bg-red-900/30 p-1 rounded text-red-200">
                                                                            <div><span className="text-gray-400">Question: </span>{currentCard?.question || 'Empty'}</div>
                                                                            <div><span className="text-gray-400">Answer: </span>{currentCard?.answer || 'Empty'}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </CardContent>
                                                </Card>

                                                {/* Action buttons */}
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApplyChanges(message.proposalId, message.commands)}
                                                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                                    >
                                                        <Check className="mr-1 h-3 w-3" />
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDenyChanges(message.proposalId)}
                                                        className="border-red-700 text-red-400 hover:bg-red-900/20 text-xs"
                                                    >
                                                        <X className="mr-1 h-3 w-3" />
                                                        Deny
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {message.isApplied && (
                                            <div className="mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReverseChanges(message.proposalId)}
                                                    className="border-orange-700 text-orange-400 hover:bg-orange-900/20 text-xs"
                                                >
                                                    <RotateCcw className="mr-1 h-3 w-3" />
                                                    Reverse
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-800/50 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
                                        <span className="text-xs">AI is thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-gray-800">
                            <form onSubmit={handleChatSubmit} className="flex gap-2">
                                <Input
                                    type="text"
                                    placeholder="Ask me to improve your flashcards..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={chatLoading}
                                    className="flex-1 border-gray-700 bg-gray-800/30 text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 text-sm"
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={chatLoading || !chatInput.trim()}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                >
                                    {chatLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </form>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}