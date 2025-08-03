'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '../../components/Api';
import { Button } from '@/components/ui/button';

export default function QuizPage() {
    const { quizId } = useParams();
    const router = useRouter();
    const { makeRequest } = useApi();

    // Quiz state
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Quiz taking state
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [quizStarted, setQuizStarted] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [results, setResults] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Load quiz data
    useEffect(() => {
        const loadQuiz = async () => {
            try {
                setLoading(true);
                const quizData = await makeRequest(`quiz/${quizId}`);
                setQuiz(quizData);
                setTimeLeft(quizData.time_limit);
            } catch (err) {
                setError('Failed to load quiz: ' + err.message);
            } finally {
                setLoading(false);
            }
        };

        if (quizId) {
            loadQuiz();
        }
    }, [quizId]);

    // Timer effect
    useEffect(() => {
        if (!quizStarted || quizFinished || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleSubmitQuiz();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quizStarted, quizFinished, timeLeft]);

    const handleStartQuiz = () => {
        setQuizStarted(true);
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(prev => prev + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(prev => prev - 1);
        }
    };

    const handleSubmitQuiz = async () => {
        setSubmitting(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([id, answer]) => ({
                id,
                answer: String(answer)
            }));

            const results = await makeRequest('quiz/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quiz_id: quizId,
                    answers: formattedAnswers
                })
            });

            setResults(results);
            setQuizFinished(true);
        } catch (err) {
            setError('Failed to submit quiz: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center h-screen bg-gray-950'>
                <div className='flex flex-col items-center'>
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                    <div className='text-xl text-gray-300'>Loading quiz...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex items-center justify-center h-screen bg-gray-950'>
                <div className='flex flex-col items-center max-w-md text-center'>
                    <div className='text-red-400 text-6xl mb-4'>⚠️</div>
                    <div className='text-xl text-red-400 mb-2'>Error Loading Quiz</div>
                    <div className='text-gray-400 mb-4'>{error}</div>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
                        onClick={() => router.push('/quiz')}
                    >
                        Back to Quiz Generator
                    </Button>
                </div>
            </div>
        );
    }

    // Quiz results page
    if (quizFinished && results) {
        return (
            <div className='min-h-screen bg-gray-950 p-6'>
                <div className='max-w-4xl mx-auto'>
                    <div className='bg-gray-900 rounded-xl shadow-2xl p-8'>
                        <div className='text-center mb-8'>
                            <h1 className='text-4xl font-bold text-white mb-4'>Quiz Complete!</h1>
                            <div className='text-6xl mb-4'>
                                {results.correct === results.total ? '🎉' : results.correct >= results.total * 0.7 ? '👏' : '📚'}
                            </div>
                            <div className='text-2xl text-gray-300 mb-2'>
                                Your Score: {results.correct} / {results.total}
                            </div>
                            <div className='text-lg text-gray-400'>
                                {Math.round((results.correct / results.total) * 100)}%
                            </div>
                        </div>

                        {/* Detailed Results */}
                        <div className='space-y-4 mb-8'>
                            <h2 className='text-xl font-semibold text-white'>Question Review:</h2>
                            {quiz.questions.map((question, index) => {
                                const result = results.items.find(item => item.id === question.id);
                                const isCorrect = result?.score === 1;

                                return (
                                    <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-900 border-green-700' : 'bg-red-900 border-red-700'}`}>
                                        <div className='flex items-start gap-3'>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                                                {isCorrect ? '✓' : '✗'}
                                            </div>
                                            <div className='flex-1'>
                                                <div className='text-white font-medium mb-2'>
                                                    {index + 1}. {question.prompt}
                                                </div>
                                                <div className='text-sm space-y-1'>
                                                    <div className='text-gray-300'>
                                                        Your answer: <span className={isCorrect ? 'text-green-300' : 'text-red-300'}>
                                                            {answers[question.id] || 'No answer'}
                                                        </span>
                                                    </div>
                                                    {!isCorrect && result?.correct && (
                                                        <div className='text-gray-300'>
                                                            Correct answer: <span className='text-green-300'>{result.correct}</span>
                                                        </div>
                                                    )}
                                                    {result?.feedback && (
                                                        <div className='text-gray-400 text-xs'>
                                                            {result.feedback}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className='flex gap-4 justify-center'>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3"
                                onClick={() => router.push('/quiz')}
                            >
                                Take Another Quiz
                            </Button>
                            <Button
                                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3"
                                onClick={() => router.push('/')}
                            >
                                Home
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Pre-quiz start page
    if (!quizStarted) {
        return (
            <div className='min-h-screen bg-gray-950 p-6'>
                <div className='max-w-2xl mx-auto'>
                    <div className='bg-gray-900 rounded-xl shadow-2xl p-8 text-center'>
                        <h1 className='text-3xl font-bold text-white mb-6'>Ready to Start?</h1>
                        <div className='space-y-4 mb-8'>
                            <div className='text-gray-300'>
                                <span className='font-semibold'>Questions:</span> {quiz?.questions?.length || 0}
                            </div>
                            <div className='text-gray-300'>
                                <span className='font-semibold'>Time Limit:</span> {formatTime(quiz?.time_limit || 0)}
                            </div>
                            <div className='text-gray-400 text-sm'>
                                Once you start, the timer will begin counting down. Make sure you're ready!
                            </div>
                        </div>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg"
                            onClick={handleStartQuiz}
                        >
                            Start Quiz
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Main quiz interface
    const currentQ = quiz?.questions?.[currentQuestion];

    return (
        <div className='min-h-screen bg-gray-950 p-6'>
            <div className='max-w-4xl mx-auto'>
                {/* Timer and Progress */}
                <div className='bg-gray-900 rounded-xl shadow-lg p-4 mb-6'>
                    <div className='flex justify-between items-center'>
                        <div className='text-gray-300'>
                            Question {currentQuestion + 1} of {quiz.questions.length}
                        </div>
                        <div className={`text-lg font-mono ${timeLeft <= 60 ? 'text-red-400' : 'text-white'}`}>
                            ⏰ {formatTime(timeLeft)}
                        </div>
                    </div>
                    <div className='w-full bg-gray-700 rounded-full h-2 mt-2'>
                        <div
                            className='bg-indigo-600 h-2 rounded-full transition-all duration-300'
                            style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Question */}
                <div className='bg-gray-900 rounded-xl shadow-lg p-8 mb-6'>
                    <h2 className='text-2xl font-semibold text-white mb-6'>
                        {currentQ?.prompt}
                    </h2>

                    {/* Multiple Choice */}
                    {currentQ?.type === 'mcq' && currentQ.options && (
                        <div className='space-y-3'>
                            {currentQ.options.map((option, index) => {
                                const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                                return (
                                    <label key={index} className='flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors'>
                                        <input
                                            type="radio"
                                            name={currentQ.id}
                                            value={optionLetter}
                                            checked={answers[currentQ.id] === optionLetter}
                                            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                            className='mr-3'
                                        />
                                        <span className='text-gray-300'>
                                            <span className='font-semibold text-indigo-400'>{optionLetter}.</span> {option}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {/* True/False */}
                    {currentQ?.type === 'tf' && (
                        <div className='space-y-3'>
                            {['True', 'False'].map((option) => (
                                <label key={option} className='flex items-center p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors'>
                                    <input
                                        type="radio"
                                        name={currentQ.id}
                                        value={option}
                                        checked={answers[currentQ.id] === option}
                                        onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                        className='mr-3'
                                    />
                                    <span className='text-gray-300'>{option}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Short Answer */}
                    {(currentQ?.type === 'short' || currentQ?.type === 'long') && (
                        <textarea
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                            placeholder="Type your answer here..."
                            className={`w-full bg-gray-800 border border-gray-600 rounded-lg p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical ${currentQ.type === 'long' ? 'min-h-[120px]' : 'min-h-[60px]'
                                }`}
                        />
                    )}
                </div>

                {/* Navigation */}
                <div className='flex justify-between items-center'>
                    <Button
                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestion === 0}
                    >
                        Previous
                    </Button>

                    <div className='flex gap-3'>
                        {currentQuestion === quiz.questions.length - 1 ? (
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                                onClick={handleSubmitQuiz}
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Quiz'}
                            </Button>
                        ) : (
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3"
                                onClick={handleNextQuestion}
                            >
                                Next
                            </Button>
                        )}
                    </div>
                </div>

                {/* Quick Navigation */}
                <div className='mt-6 bg-gray-900 rounded-xl p-4'>
                    <div className='text-gray-400 text-sm mb-3'>Quick Navigation:</div>
                    <div className='flex flex-wrap gap-2'>
                        {quiz.questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentQuestion(index)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${index === currentQuestion
                                        ? 'bg-indigo-600 text-white'
                                        : answers[quiz.questions[index].id]
                                            ? 'bg-green-700 text-white'
                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
