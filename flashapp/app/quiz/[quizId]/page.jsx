'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '../../components/Api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    Trophy,
    AlertTriangle,
    Loader2,
    CheckCircle,
    XCircle,
    Play,
    Home,
    RotateCcw
} from 'lucide-react';

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
    }; if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                            <p className="text-gray-300 text-lg">Loading quiz...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm max-w-md w-full">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <CardTitle className="text-red-400">Error Loading Quiz</CardTitle>
                        <CardDescription className="text-gray-400">{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => router.push('/quiz')}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                        >
                            Back to Quiz Generator
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }    // Quiz results page
    if (quizFinished && results) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
                <div className="max-w-4xl mx-auto">
                    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <div className="flex flex-col items-center space-y-4">
                                <Trophy className="h-16 w-16 text-purple-400" />
                                <CardTitle className="text-3xl bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                    Quiz Complete!
                                </CardTitle>
                                <div className="space-y-2">
                                    <div className="text-2xl text-gray-100">
                                        Score: {results.correct} / {results.total}
                                    </div>
                                    <div className="text-lg text-gray-400">
                                        {Math.round((results.correct / results.total) * 100)}% Correct
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Separator className="bg-gray-700" />

                            <div>
                                <h3 className="text-xl font-semibold text-gray-100 mb-4">Question Review</h3>
                                <div className="space-y-4">
                                    {quiz.questions.map((question, index) => {
                                        const result = results.items.find(item => item.id === question.id);
                                        const isCorrect = result?.score === 1;

                                        return (
                                            <Card key={question.id} className={`border ${isCorrect ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
                                                <CardContent className="pt-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                                                            {isCorrect ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                        </div>
                                                        <div className="flex-1 space-y-2">
                                                            <p className="text-gray-100 font-medium">
                                                                {index + 1}. {question.prompt}
                                                            </p>
                                                            <div className="text-sm space-y-1">
                                                                <p className="text-gray-300">
                                                                    Your answer: <span className={isCorrect ? 'text-green-300' : 'text-red-300'}>
                                                                        {answers[question.id] || 'No answer'}
                                                                    </span>
                                                                </p>
                                                                {!isCorrect && result?.correct && (
                                                                    <p className="text-gray-300">
                                                                        Correct answer: <span className="text-green-300">{result.correct}</span>
                                                                    </p>
                                                                )}
                                                                {result?.feedback && (
                                                                    <p className="text-gray-400 text-xs">
                                                                        {result.feedback}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>

                            <Separator className="bg-gray-700" />

                            <div className="flex gap-4 justify-center">
                                <Button
                                    onClick={() => router.push('/quiz')}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Take Another Quiz
                                </Button>
                                <Button
                                    onClick={() => router.push('/')}
                                    variant="outline"
                                    className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }    // Pre-quiz start page
    if (!quizStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] flex items-center justify-center p-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm max-w-lg w-full">
                    <CardHeader className="text-center">
                        <div className="flex flex-col items-center space-y-4">
                            <Play className="h-12 w-12 text-purple-400" />
                            <CardTitle className="text-2xl bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                Ready to Start?
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-2">
                                <p className="text-gray-400 text-sm">Questions</p>
                                <p className="text-2xl font-bold text-gray-100">{quiz?.questions?.length || 0}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-gray-400 text-sm">Time Limit</p>
                                <p className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-1">
                                    <Clock className="h-5 w-5" />
                                    {formatTime(quiz?.time_limit || 0)}
                                </p>
                            </div>
                        </div>

                        <Separator className="bg-gray-700" />

                        <div className="text-center">
                            <p className="text-gray-400 text-sm mb-4">
                                Once you start, the timer will begin counting down. Make sure you're ready!
                            </p>
                            <Button
                                onClick={handleStartQuiz}
                                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3"
                            >
                                <Play className="mr-2 h-4 w-4" />
                                Start Quiz
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }    // Main quiz interface
    const currentQ = quiz?.questions?.[currentQuestion];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B0D17] via-[#0F1629] to-[#1A1B3A] p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Timer and Progress Card */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="text-gray-300">
                                Question {currentQuestion + 1} of {quiz.questions.length}
                            </div>
                            <div className={`flex items-center gap-2 text-lg font-mono ${timeLeft <= 60 ? 'text-red-400' : 'text-gray-100'}`}>
                                <Clock className="h-5 w-5" />
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-purple-600 to-purple-700 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Question Card */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-100">
                            {currentQ?.prompt}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {/* Multiple Choice */}
                        {currentQ?.type === 'mcq' && currentQ.options && (
                            <div className="space-y-3">
                                {currentQ.options.map((option, index) => {
                                    const optionLetter = String.fromCharCode(65 + index);
                                    const isSelected = answers[currentQ.id] === optionLetter;

                                    return (
                                        <div
                                            key={index}
                                            onClick={() => handleAnswerChange(currentQ.id, optionLetter)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                                    ? 'border-purple-500 bg-purple-900/20'
                                                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                        ? 'border-purple-500 bg-purple-500'
                                                        : 'border-gray-500'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <span className="text-gray-300">
                                                    <span className="font-semibold text-purple-400">{optionLetter}.</span> {option}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* True/False */}
                        {currentQ?.type === 'tf' && (
                            <div className="space-y-3">
                                {['True', 'False'].map((option) => {
                                    const isSelected = answers[currentQ.id] === option;

                                    return (
                                        <div
                                            key={option}
                                            onClick={() => handleAnswerChange(currentQ.id, option)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                                                    ? 'border-purple-500 bg-purple-900/20'
                                                    : 'border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                                                        ? 'border-purple-500 bg-purple-500'
                                                        : 'border-gray-500'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <span className="text-gray-300">{option}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Short/Long Answer */}
                        {(currentQ?.type === 'short' || currentQ?.type === 'long') && (
                            <Textarea
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                                placeholder="Type your answer here..."
                                className={`border-gray-700 bg-gray-800/30 text-gray-100 placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 ${currentQ.type === 'long' ? 'min-h-[120px]' : 'min-h-[80px]'
                                    }`}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Navigation Card */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                            <Button
                                onClick={handlePreviousQuestion}
                                disabled={currentQuestion === 0}
                                variant="outline"
                                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 disabled:opacity-50"
                            >
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Previous
                            </Button>

                            <div className="flex gap-3">
                                {currentQuestion === quiz.questions.length - 1 ? (
                                    <Button
                                        onClick={handleSubmitQuiz}
                                        disabled={submitting}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Submit Quiz
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleNextQuestion}
                                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                                    >
                                        Next
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Navigation Card */}
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            <p className="text-gray-400 text-sm">Quick Navigation:</p>
                            <div className="flex flex-wrap gap-2">
                                {quiz.questions.map((_, index) => (
                                    <Button
                                        key={index}
                                        onClick={() => setCurrentQuestion(index)}
                                        variant="ghost"
                                        size="sm"
                                        className={`w-10 h-10 p-0 ${index === currentQuestion
                                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                : answers[quiz.questions[index].id]
                                                    ? 'bg-green-700 text-white hover:bg-green-600'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                    >
                                        {index + 1}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
