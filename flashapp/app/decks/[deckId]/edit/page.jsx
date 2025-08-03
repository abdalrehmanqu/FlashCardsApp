'use client';
'use client';
import { useState, useEffect } from "react";
import React from 'react'
import { Button } from "@/components/ui/button"
import { useParams, useRouter } from "next/navigation";
import { useApi } from "C:\\Users\\kingh\\Documents\\GitHub\\FlashCardsApp\\flashapp\\app\\components\\Api.js";

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
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen bg-gray-950'>
                <div className='flex flex-col items-center'>
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <div className='text-xl text-gray-300'>Loading deck...</div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className='flex items-center justify-center h-screen bg-gray-950'>
                <div className='flex flex-col items-center max-w-md text-center'>
                    <div className='text-red-400 text-6xl mb-4'>⚠️</div>
                    <div className='text-xl text-red-400 mb-2'>Error Loading Deck</div>
                    <div className='text-gray-400 mb-4'>{loadError}</div>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                        onClick={loadDeckData}
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (

        <div className='h-screen bg-gray-950 p-4'>

            <div className='grid grid-cols-4 gap-6 h-full max-w-full mx-auto w-[1300px]'>
                <div className='col-span-3  overflow-auto'>
                    <div className='bg-gray-900 rounded-xl shadow-2xl h-full flex flex-col'>
                        {/* Header */}
                        <div className='bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex-shrink-0'>
                            <div className='flex justify-between items-center'>
                                <h1 className='text-3xl font-bold text-white'>Edit Deck</h1>
                                <Button
                                    className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-lg text-white hover:bg-opacity-30 transition-all duration-300 px-6 py-2"
                                    onClick={saveDeck}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </div>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className='flex-1 p-6 overflow-y-scroll'>
                            {error && (
                                <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <p className="text-red-200">{error}</p>
                                        <Button
                                            className="ml-4 bg-red-700 hover:bg-red-600 text-white text-sm px-3 py-1"
                                            onClick={() => setError(null)}
                                        >
                                            ✕
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Deck Info */}
                            <div className="rounded-xl bg-gray-800 p-6 shadow-lg mb-6 border border-gray-700">
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">Deck Name</label>
                                        <input
                                            className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter deck name..."
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                                        <textarea
                                            className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-vertical"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Describe your deck..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="space-y-4">
                                {cards.map((card, index) => (
                                    <div key={index} className="rounded-xl bg-gray-800 border border-gray-700 shadow-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.01]">
                                        <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 flex justify-between items-center">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">
                                                    {index + 1}
                                                </span>
                                                Card {index + 1}
                                            </h3>
                                            <Button
                                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm rounded-lg transition-colors duration-200"
                                                onClick={() => removeCard(index)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-2">Question</label>
                                                <textarea
                                                    className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-vertical"
                                                    value={card.question || ''}
                                                    onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                                                    placeholder="Enter the question..."
                                                    rows={2}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-300 mb-2">Answer</label>
                                                <textarea
                                                    className="w-full rounded-lg bg-gray-700 border border-gray-600 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-vertical"
                                                    value={card.answer || ''}
                                                    onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                                                    placeholder="Enter the answer..."
                                                    rows={2}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add New Card Button */}
                            <div className="mt-6">
                                <Button
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02]"
                                    onClick={addNewCard}
                                >
                                    + Add New Card
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Chat Panel */}
                <div className='col-span-1'>
                    <div className='bg-gray-900 rounded-xl shadow-2xl h-full flex flex-col'>
                        {/* Chat Header */}
                        <div className='bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex-shrink-0'>
                            <div className='flex items-center gap-2'>
                                <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
                                <h2 className='text-lg font-semibold text-white'>AI Assistant</h2>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className='flex-1 overflow-y-auto p-4 space-y-3'>
                            {chatMessages.map((message, index) => (
                                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                    <div className={`px-3 py-2 rounded-2xl max-w-[90%] transition-all duration-300 shadow-lg ${message.role === 'user'
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                                        }`}>
                                        <div className="whitespace-pre-wrap text-xs">{message.content}</div>

                                        {message.showButtons && !message.isApplied && message.commands && (
                                            <div className="mt-3 space-y-2">
                                                {/* Preview section */}
                                                <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
                                                    <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                                                        👁️ Preview Changes
                                                    </div>
                                                    {message.commands.map((command, cmdIndex) => {
                                                        if (command.name === 'update_card') {
                                                            const cardId = command.arguments.id;
                                                            const currentCard = cards.find((_, idx) => (idx + 1).toString() === cardId);

                                                            return (
                                                                <div key={cmdIndex} className="bg-gray-800 rounded p-2 mb-2 text-xs">
                                                                    <div className="font-medium text-gray-300 mb-1">Card {cardId}:</div>

                                                                    {/* Front/Question changes */}
                                                                    {command.arguments.front && (
                                                                        <div className="mb-2">
                                                                            <div className="text-gray-400 text-xs">Question:</div>
                                                                            <div className="flex flex-col gap-1">
                                                                                <div className="bg-red-900 bg-opacity-30 p-1 rounded text-red-200 text-xs">
                                                                                    <span className="text-red-400">- </span>
                                                                                    {currentCard?.question || 'Empty'}
                                                                                </div>
                                                                                <div className="bg-green-900 bg-opacity-30 p-1 rounded text-green-200 text-xs">
                                                                                    <span className="text-green-400">+ </span>
                                                                                    {command.arguments.front}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Back/Answer changes */}
                                                                    {command.arguments.back && (
                                                                        <div>
                                                                            <div className="text-gray-400 text-xs">Answer:</div>
                                                                            <div className="flex flex-col gap-1">
                                                                                <div className="bg-red-900 bg-opacity-30 p-1 rounded text-red-200 text-xs">
                                                                                    <span className="text-red-400">- </span>
                                                                                    {currentCard?.answer || 'Empty'}
                                                                                </div>
                                                                                <div className="bg-green-900 bg-opacity-30 p-1 rounded text-green-200 text-xs">
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
                                                                <div key={cmdIndex} className="bg-gray-800 rounded p-2 mb-2 text-xs">
                                                                    <div className="font-medium text-green-300 mb-1">➕ New Card:</div>
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
                                                                <div key={cmdIndex} className="bg-gray-800 rounded p-2 mb-2 text-xs">
                                                                    <div className="font-medium text-red-300 mb-1">🗑️ Delete Card {cardId}:</div>
                                                                    <div className="bg-red-900 bg-opacity-30 p-1 rounded text-red-200">
                                                                        <div><span className="text-gray-400">Question: </span>{currentCard?.question || 'Empty'}</div>
                                                                        <div><span className="text-gray-400">Answer: </span>{currentCard?.answer || 'Empty'}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex gap-1">
                                                    <Button
                                                        className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded-lg transition-all duration-200 transform hover:scale-105"
                                                        onClick={() => handleApplyChanges(message.proposalId, message.commands)}
                                                    >
                                                        ✓ Accept Changes
                                                    </Button>
                                                    <Button
                                                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded-lg transition-all duration-200 transform hover:scale-105"
                                                        onClick={() => handleDenyChanges(message.proposalId)}
                                                    >
                                                        ✗ Deny
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {message.isApplied && (
                                            <div className="flex gap-1 mt-2">
                                                <Button
                                                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-2 py-1 rounded-lg transition-all duration-200 transform hover:scale-105"
                                                    onClick={() => handleReverseChanges(message.proposalId)}
                                                >
                                                    ↺ Reverse
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-2xl max-w-[90%] flex items-center gap-2 shadow-lg">
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-xs">AI is thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-700 bg-gray-800 flex-shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 rounded-lg bg-gray-700 border border-gray-600 px-3 py-2 text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 text-sm"
                                    placeholder="Ask me to improve your flashcards..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={chatLoading}
                                />
                                <Button
                                    type="submit"
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={chatLoading || !chatInput.trim()}
                                >
                                    {chatLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        '→'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}