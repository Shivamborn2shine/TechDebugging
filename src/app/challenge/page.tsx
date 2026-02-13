"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getQuestions as fetchQuestionsApi, getMetadata, updateParticipant } from "@/lib/api";
import { Question, Answer } from "@/types";
import {
    Terminal,
    Clock,
    ChevronLeft,
    ChevronRight,
    Send,
    AlertTriangle,
    Trophy,
    Bug,
    Code,
    FileQuestion,
    RefreshCw,
} from "lucide-react";
import styles from "./page.module.css";

const CHALLENGE_DURATION = 30 * 60; // 30 minutes in seconds

export default function ChallengePage() {
    const router = useRouter();
    const [participantId, setParticipantId] = useState<string | null>(null);
    const [participantName, setParticipantName] = useState<string>("");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION);
    const [loading, setLoading] = useState(true);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const startTimeRef = useRef<number>(Date.now());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load participant and questions
    const loadQuestions = useCallback(async (forceRefresh = false) => {
        const pid = sessionStorage.getItem("participantId");
        const pSection = sessionStorage.getItem("participantSection") || "Other";

        if (!pid) {
            return;
        }

        if (forceRefresh) setIsRefreshing(true);

        try {
            // Helper to filter questions by section
            const filterQuestions = (allQuestions: Question[]) => {
                return allQuestions.filter(q => {
                    const qs = q.section || "Other";
                    return qs === pSection || qs === "Common";
                });
            };

            // Helper to renumber for display (1, 2, 3...)
            const applyRenumbering = (qs: Question[]) => {
                return qs
                    .sort((a, b) => a.order - b.order)
                    .map((q, i) => ({ ...q, order: i + 1 }));
            };

            // 1. Try to fetch metadata
            let serverLastUpdated: number | null = null;
            try {
                const meta = await getMetadata("questions");
                if (meta && "lastUpdated" in meta) {
                    serverLastUpdated = (meta.lastUpdated as number) || 0;
                }
            } catch (err) {
                console.warn("Metadata fetch failed, skipping cache check:", err);
            }

            // 2. Check local storage cache (only if not forcing refresh AND we have valid server timestamp)
            if (!forceRefresh) {
                const cached = localStorage.getItem("cached_questions_v3");
                if (cached && serverLastUpdated !== null) {
                    const { data, timestamp } = JSON.parse(cached);
                    // Use cache ONLY if server timestamp matches or is older (meaning cache is fresh)
                    if (serverLastUpdated <= timestamp) {
                        const filtered = filterQuestions(data);
                        setQuestions(applyRenumbering(filtered));
                        setLoading(false);
                        return;
                    }
                }
            }

            // 3. Fetch fresh questions from API (if cache invalid, missing, or forceRefresh)
            const loaded = (await fetchQuestionsApi()) as unknown as Question[];

            // Update cache
            localStorage.setItem("cached_questions_v3", JSON.stringify({
                data: loaded,
                timestamp: Date.now()
            }));

            const filtered = filterQuestions(loaded);
            setQuestions(applyRenumbering(filtered));
        } catch (error) {
            console.error("Error loading questions:", error);
            // Fallback to cache if API fails
            const cached = localStorage.getItem("cached_questions_v3");
            const renumberLocal = (qs: Question[]) => qs.sort((a, b) => a.order - b.order).map((q, i) => ({ ...q, order: i + 1 }));

            if (cached) {
                const { data } = JSON.parse(cached);
                const filtered = data.filter((q: Question) => {
                    const qs = q.section || "Other";
                    return qs === pSection || qs === "Common";
                });
                setQuestions(renumberLocal(filtered));
                if (forceRefresh) alert("Could not fetch new questions. Using cached version.");
            }
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const pid = sessionStorage.getItem("participantId");
        const pname = sessionStorage.getItem("participantName");

        if (!pid) {
            router.push("/");
            return;
        }

        setParticipantId(pid);
        setParticipantName(pname || "Participant");

        loadQuestions();
        startTimeRef.current = Date.now();
    }, [router, loadQuestions]);

    // Timer with background tab handling
    useEffect(() => {
        if (loading) return;

        const updateTimer = () => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const remaining = Math.max(0, CHALLENGE_DURATION - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0) {
                handleAutoSubmit();
            }
        };

        timerRef.current = setInterval(updateTimer, 1000);

        // Handle visibility change for accurate timer
        const handleVisibility = () => {
            if (!document.hidden) {
                updateTimer();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [loading]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const getTimerClass = () => {
        if (timeLeft <= 60) return `${styles.timer} ${styles.danger}`;
        if (timeLeft <= 300) return `${styles.timer} ${styles.warning}`;
        return styles.timer;
    };

    const setAnswer = (questionId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const evaluateAnswers = useCallback((): Answer[] => {
        return questions.map((q) => {
            const userAnswer = answers[q.id] || "";
            let isCorrect = false;
            let pointsAwarded = 0;

            switch (q.type) {
                case "syntax": {
                    // Normalize whitespace for comparison
                    const normalize = (s: string) =>
                        s.replace(/\s+/g, " ").trim().toLowerCase();
                    isCorrect = normalize(userAnswer) === normalize(q.correctCode);
                    break;
                }
                case "mcq": {
                    const strUser = String(userAnswer).trim();
                    const strCorrect = String(q.correctOptionIndex).trim();
                    console.log(`DEBUG MCQ [${q.id}]: user='${strUser}', correct='${strCorrect}'`);
                    isCorrect = strUser === strCorrect;
                    break;
                }
                case "casestudy": {
                    const normalizedAnswer = userAnswer.trim().toLowerCase();
                    isCorrect = q.acceptedAnswers.some(
                        (a) => a.toLowerCase() === normalizedAnswer
                    );
                    break;
                }
            }

            if (isCorrect) pointsAwarded = Number(q.points) || 0;

            return {
                questionId: q.id,
                questionType: q.type,
                userAnswer,
                isCorrect,
                pointsAwarded,
            };
        });
    }, [questions, answers]);

    const handleSubmit = async () => {
        if (!participantId || submitting) return;
        setSubmitting(true);

        try {
            const evaluatedAnswers = evaluateAnswers();
            const totalScore = evaluatedAnswers.reduce(
                (sum, a) => sum + (Number(a.pointsAwarded) || 0),
                0
            );

            console.log("DEBUG: Submission", {
                evaluatedAnswers,
                totalScore,
                breakdown: evaluatedAnswers.map(a => `${a.questionId}: ${a.isCorrect} -> ${a.pointsAwarded}`)
            });

            const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
            const timeTaken = CHALLENGE_DURATION - timeLeft;

            await updateParticipant(participantId, {
                answers: evaluatedAnswers,
                score: totalScore,
                totalPoints,
                completedAt: Date.now(),
                timeTaken,
                submitted: true,
            });

            // Store results for results page
            sessionStorage.setItem(
                "results",
                JSON.stringify({
                    answers: evaluatedAnswers,
                    score: totalScore,
                    totalPoints,
                    timeTaken,
                    name: participantName,
                })
            );

            router.push("/results");
        } catch (error) {
            console.error("Submit error:", error);
            alert("Submission failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAutoSubmit = useCallback(() => {
        // Auto submit when time runs out
        handleSubmit();
    }, []);

    // Fix: bind handleAutoSubmit to latest state
    useEffect(() => {
        if (timeLeft <= 0 && !submitting && participantId) {
            handleSubmit();
        }
    }, [timeLeft]);

    const currentQuestion = questions[currentIndex];
    const answeredCount = Object.keys(answers).filter(
        (k) => answers[k] && answers[k].trim() !== ""
    ).length;

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p className={styles.loadingText}>Loading challenge...</p>
            </div>
        );
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "syntax": return <Bug size={14} />;
            case "mcq": return <Code size={14} />;
            case "casestudy": return <FileQuestion size={14} />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "syntax": return "Fix the Bug";
            case "mcq": return "Missing Line";
            case "casestudy": return "Case Study";
            default: return type;
        }
    };

    return (
        <div className={styles.challengePage}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.logo}>
                        <Terminal size={20} />
                        Debug
                    </div>
                    <span className={styles.playerName}>{participantName}</span>
                </div>

                <div className={styles.headerCenter}>
                    <div className={getTimerClass()}>
                        <Clock size={16} className={styles.timerIcon} />
                        {formatTime(timeLeft)}
                    </div>
                    <span className={styles.progress}>
                        {answeredCount}/{questions.length} answered
                    </span>
                </div>

                <div className={styles.headerRight}>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => loadQuestions(true)}
                        disabled={isRefreshing}
                        title="Force refresh questions"
                    >
                        <RefreshCw size={16} className={isRefreshing ? styles.spin : ""} />
                    </button>
                    <div className={styles.scoreDisplay}>
                        <Trophy size={14} />
                        {answeredCount * 10} pts
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.questionList}>
                        <div className={styles.questionListTitle}>Questions</div>
                        {questions.map((q, i) => {
                            const currentSection = q.section || "Other";
                            const prevSection = i > 0 ? questions[i - 1].section || "Other" : null;
                            const showHeader = currentSection !== prevSection;
                            const isAnswered = answers[q.id] && answers[q.id].trim() !== "";

                            return (
                                <div key={q.id}>
                                    {showHeader && (
                                        <div className={styles.sidebarSectionHeader}>
                                            {currentSection}
                                        </div>
                                    )}
                                    <button
                                        className={`${styles.qItem} ${i === currentIndex ? styles.active : ""} ${isAnswered ? styles.answered : ""}`}
                                        onClick={() => setCurrentIndex(i)}
                                    >
                                        <span className={styles.qNumber}>{q.order}</span>
                                        <span className={styles.qItemTitle}>
                                            {q.title}
                                        </span>
                                        <span className={`${styles.qTypeBadge} ${styles[q.type]}`}>
                                            {q.type === "casestudy" ? "CS" : (q.type || "?").toUpperCase()}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Question Area */}
                <main className={styles.questionArea}>
                    {currentQuestion && (
                        <div className={styles.questionCard} key={currentQuestion.id}>
                            {/* Question Header */}
                            <div className={styles.questionHeader}>
                                <div>
                                    <div className={styles.questionMeta}>
                                        <span className={`${styles.typePill} ${styles[currentQuestion.type]}`}>
                                            {getTypeIcon(currentQuestion.type)}
                                            {getTypeLabel(currentQuestion.type)}
                                        </span>
                                        <span className={styles.pointsBadge}>
                                            {currentQuestion.points} pts
                                        </span>
                                    </div>
                                    <h2 className={styles.questionTitle}>
                                        {currentQuestion.title}
                                    </h2>
                                    <p className={styles.questionDesc}>
                                        {currentQuestion.description}
                                    </p>
                                </div>
                            </div>

                            {/* Syntax Error Question */}
                            {currentQuestion.type === "syntax" && (
                                <div className={styles.codeEditorWrap}>
                                    <div className={styles.codeEditorHeader}>
                                        <div className={styles.editorDots}>
                                            <span className={styles.dot} />
                                            <span className={styles.dot} />
                                            <span className={styles.dot} />
                                        </div>
                                        <span className={styles.langBadge}>
                                            {currentQuestion.language}
                                        </span>
                                    </div>
                                    <textarea
                                        className={styles.codeEditor}
                                        value={
                                            answers[currentQuestion.id] !== undefined
                                                ? answers[currentQuestion.id]
                                                : currentQuestion.buggyCode
                                        }
                                        onChange={(e) =>
                                            setAnswer(currentQuestion.id, e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Tab") {
                                                e.preventDefault();
                                                const target = e.target as HTMLTextAreaElement;
                                                const start = target.selectionStart;
                                                const end = target.selectionEnd;
                                                const value = target.value;
                                                const newValue =
                                                    value.substring(0, start) +
                                                    "    " +
                                                    value.substring(end);
                                                setAnswer(currentQuestion.id, newValue);
                                                setTimeout(() => {
                                                    target.selectionStart = target.selectionEnd =
                                                        start + 4;
                                                }, 0);
                                            }
                                        }}
                                        spellCheck={false}
                                    />
                                </div>
                            )}

                            {/* MCQ Question */}
                            {currentQuestion.type === "mcq" && (
                                <>
                                    <div className={styles.codeSnippetWrap}>
                                        <div className={styles.codeEditorWrap}>
                                            <div className={styles.codeEditorHeader}>
                                                <div className={styles.editorDots}>
                                                    <span className={styles.dot} />
                                                    <span className={styles.dot} />
                                                    <span className={styles.dot} />
                                                </div>
                                                <span className={styles.langBadge}>
                                                    {currentQuestion.language}
                                                </span>
                                            </div>
                                            <pre className={styles.codeSnippet}>
                                                {currentQuestion.codeSnippet
                                                    .split("\n")
                                                    .map((line, i) => (
                                                        <div key={i}>
                                                            {line.includes("___") ? (
                                                                <span className={styles.blankLine}>
                                                                    {line}
                                                                </span>
                                                            ) : (
                                                                line
                                                            )}
                                                        </div>
                                                    ))}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className={styles.optionsList}>
                                        {currentQuestion.options.map((opt, i) => (
                                            <button
                                                key={i}
                                                className={`${styles.optionBtn} ${answers[currentQuestion.id] === String(i) ? styles.selected : ""}`}
                                                onClick={() =>
                                                    setAnswer(currentQuestion.id, String(i))
                                                }
                                            >
                                                <span className={styles.optionLetter}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span className={styles.optionText}>{opt}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Case Study Question */}
                            {currentQuestion.type === "casestudy" && (
                                <>
                                    <div className={styles.scenarioBox}>
                                        {currentQuestion.scenario}
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.answerInput}
                                        placeholder="Type your answer here..."
                                        value={answers[currentQuestion.id] || ""}
                                        onChange={(e) =>
                                            setAnswer(currentQuestion.id, e.target.value)
                                        }
                                    />
                                </>
                            )}

                            {/* Navigation */}
                            <div className={styles.navBar}>
                                <button
                                    className={styles.navBtn}
                                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                                    disabled={currentIndex === 0}
                                >
                                    <ChevronLeft size={18} /> Previous
                                </button>

                                {currentIndex < questions.length - 1 ? (
                                    <button
                                        className={styles.navBtn}
                                        onClick={() =>
                                            setCurrentIndex((i) =>
                                                Math.min(questions.length - 1, i + 1)
                                            )
                                        }
                                    >
                                        Next <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        className={styles.submitAllBtn}
                                        onClick={() => setShowSubmitModal(true)}
                                    >
                                        <Send size={16} /> Submit All
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Submit Confirmation Modal */}
            {showSubmitModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <AlertTriangle size={48} className={styles.modalIcon} />
                        <h3 className={styles.modalTitle}>Submit Challenge?</h3>
                        <p className={styles.modalText}>
                            You have answered{" "}
                            <strong>
                                {answeredCount} of {questions.length}
                            </strong>{" "}
                            questions. Once submitted, you cannot change your answers.
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalCancelBtn}
                                onClick={() => setShowSubmitModal(false)}
                            >
                                Go Back
                            </button>
                            <button
                                className={styles.modalConfirmBtn}
                                onClick={() => {
                                    setShowSubmitModal(false);
                                    handleSubmit();
                                }}
                                disabled={submitting}
                            >
                                {submitting ? "Submitting..." : "Confirm Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
