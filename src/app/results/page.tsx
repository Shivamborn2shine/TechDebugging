"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, CheckCircle, XCircle, MinusCircle, Home } from "lucide-react";
import { Answer } from "@/types";
import styles from "./page.module.css";

interface ResultsData {
    answers: Answer[];
    score: number;
    totalPoints: number;
    timeTaken: number;
    name: string;
}

export default function ResultsPage() {
    const router = useRouter();
    const [results, setResults] = useState<ResultsData | null>(null);

    useEffect(() => {
        const data = sessionStorage.getItem("results");
        if (!data) {
            router.push("/");
            return;
        }
        setResults(JSON.parse(data));
    }, [router]);

    if (!results) {
        return (
            <div className={styles.resultsPage}>
                <p style={{ color: "var(--text-muted)" }}>Loading results...</p>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const correctCount = results.answers.filter((a) => a.isCorrect).length;
    const incorrectCount = results.answers.filter(
        (a) => !a.isCorrect && a.userAnswer && a.userAnswer.trim() !== ""
    ).length;
    const skippedCount = results.answers.filter(
        (a) => !a.userAnswer || a.userAnswer.trim() === ""
    ).length;

    const percentage = Math.round((results.score / results.totalPoints) * 100);

    return (
        <main className={styles.resultsPage}>
            <div className={styles.resultsCard}>
                <Trophy size={56} className={styles.trophyIcon} />
                <h1 className={styles.congratsTitle}>Challenge Complete!</h1>
                <p className={styles.congratsSubtitle}>
                    Great job, {results.name}! Here&apos;s how you did.
                </p>

                <div className={styles.scoreCircle}>
                    <span className={styles.scoreValue}>{results.score}</span>
                    <span className={styles.scoreLabel}>
                        / {results.totalPoints} pts
                    </span>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statBox}>
                        <div className={styles.statValue}>{percentage}%</div>
                        <div className={styles.statLabel}>Accuracy</div>
                    </div>
                    <div className={styles.statBox}>
                        <div className={styles.statValue}>{formatTime(results.timeTaken)}</div>
                        <div className={styles.statLabel}>Time Taken</div>
                    </div>
                    <div className={styles.statBox}>
                        <div className={styles.statValue}>
                            {correctCount}/{results.answers.length}
                        </div>
                        <div className={styles.statLabel}>Correct</div>
                    </div>
                </div>

                <div className={styles.breakdown}>
                    <div className={styles.breakdownTitle}>Question Breakdown</div>
                    <div className={styles.breakdownList}>
                        {results.answers.map((a, i) => {
                            const skipped = !a.userAnswer || a.userAnswer.trim() === "";
                            return (
                                <div key={a.questionId} className={styles.breakdownItem}>
                                    <span className="qNum" style={{ color: 'var(--text-muted)', fontWeight: 700, marginRight: 10, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                                        Q{i + 1}
                                    </span>
                                    <span className="qTitle" style={{ flex: 1, color: 'var(--text-secondary)' }}>
                                        {a.questionType === "syntax"
                                            ? "Syntax Error"
                                            : a.questionType === "mcq"
                                                ? "Missing Line"
                                                : "Case Study"}
                                    </span>
                                    {skipped ? (
                                        <span className={styles.skippedBadge}>Skipped</span>
                                    ) : a.isCorrect ? (
                                        <span className={styles.correctBadge}>
                                            +{a.pointsAwarded} pts
                                        </span>
                                    ) : (
                                        <span className={styles.incorrectBadge}>0 pts</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button className={styles.homeBtn} onClick={() => router.push("/")}>
                    <Home size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Back to Home
                </button>
            </div>
        </main>
    );
}
