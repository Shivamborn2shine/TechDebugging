"use client";

import { useState, useEffect, useCallback } from "react";
import {
    getSettings,
    putSettings,
    getParticipants as fetchParticipantsApi,
    deleteAllParticipants as clearParticipantsApi,
    getQuestions as fetchQuestionsApi,
    createQuestion as createQuestionApi,
    updateQuestion as updateQuestionApi,
    deleteQuestion as deleteQuestionApi,
    batchSeedQuestions,
    batchDeleteQuestions,
    batchRenumberQuestions,
    batchMoveSection,
    batchImportQuestions,
    putMetadata,
} from "@/lib/api";
import { Question, Participant } from "@/types";
import { sampleQuestions } from "@/data/questions";
import {
    Shield,
    Users,
    FileText,
    RefreshCw,
    Download,
    Trash2,
    Plus,
    Database,
    LogOut,
    Lock,
    Edit3,
    Save,
    X,
    Upload,
    Bug,
    Code,
    FileQuestion,
    Star,
    CheckSquare,
    Square,
    SortAsc
} from "lucide-react";
import styles from "./page.module.css";

const ADMIN_PASSWORD = "Velvet1001";

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [activeTab, setActiveTab] = useState<"leaderboard" | "questions">(
        "leaderboard"
    );
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [isQuizActive, setIsQuizActive] = useState(true); // Default to true

    // Question form state
    const [qType, setQType] = useState<"syntax" | "mcq" | "casestudy">("syntax");
    const [qSection, setQSection] = useState<"C" | "Python" | "Other" | "Common">("Python");
    const [qTitle, setQTitle] = useState("");
    const [qDesc, setQDesc] = useState("");
    const [qLang, setQLang] = useState("python");
    const [qBuggyCode, setQBuggyCode] = useState("");
    const [qCorrectCode, setQCorrectCode] = useState("");
    const [qCodeSnippet, setQCodeSnippet] = useState("");
    const [qOptions, setQOptions] = useState(["", "", "", ""]);
    const [qCorrectOption, setQCorrectOption] = useState(0);
    const [qScenario, setQScenario] = useState("");
    const [qAcceptedAnswers, setQAcceptedAnswers] = useState("");
    const [qPoints, setQPoints] = useState("10");
    const [qOrder, setQOrder] = useState("");
    const [addingQuestion, setAddingQuestion] = useState(false);

    // Edit mode
    const [editingId, setEditingId] = useState<string | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    // Bulk import mode
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkType, setBulkType] = useState<"syntax" | "mcq" | "casestudy">("syntax");
    const [bulkSection, setBulkSection] = useState<"C" | "Python" | "Other" | "Common">("Python");
    const [bulkJson, setBulkJson] = useState("");
    const [bulkError, setBulkError] = useState("");
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkSuccess, setBulkSuccess] = useState("");

    // Question type filter for question list
    const [filterType, setFilterType] = useState<"all" | "syntax" | "mcq" | "casestudy">("all");
    const [filterSection, setFilterSection] = useState<"all" | "C" | "Python" | "Other" | "Common">("all");

    // Multi-select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setAuthenticated(true);
            setLoginError("");
        } else {
            setLoginError("Incorrect password");
        }
    };

    const fetchSettingsData = useCallback(async () => {
        try {
            const config = await getSettings("config");
            if (config && "isQuizActive" in config) {
                setIsQuizActive((config.isQuizActive as boolean) ?? true);
            } else {
                // Initialize if not exists
                await putSettings("config", { isQuizActive: true });
            }
        } catch (err) {
            console.error("Error fetching settings:", err);
        }
    }, []);

    const toggleQuizStatus = async () => {
        const newState = !isQuizActive;
        try {
            await putSettings("config", { isQuizActive: newState });
            setIsQuizActive(newState);
        } catch (err) {
            console.error("Error toggling quiz status:", err);
            alert("Failed to update quiz status");
        }
    };

    const fetchParticipants = useCallback(async () => {
        setLoading(true);
        try {
            const data = (await fetchParticipantsApi()) as unknown as Participant[];
            data.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const aTime = a.completedAt ? a.completedAt - a.startedAt : Infinity;
                const bTime = b.completedAt ? b.completedAt - b.startedAt : Infinity;
                return aTime - bTime;
            });
            setParticipants(data);
        } catch (err) {
            console.error("Error fetching participants:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const data = (await fetchQuestionsApi()) as unknown as Question[];
            setQuestions(data);
        } catch (err) {
            console.error("Error fetching questions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const renumberQuestions = async () => {
        if (!confirm("This will re-assign order numbers (1, 2, 3...) to ALL questions based on their current sort order. Continue?")) return;
        setLoading(true);
        try {
            const sorted = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));
            const updates = sorted
                .map((q, index) => ({ id: q.id, order: index + 1 }))
                .filter((u, i) => sorted[i].order !== u.order);

            if (updates.length > 0) {
                await batchRenumberQuestions(updates);
            }
            await fetchQuestions();
            alert("Questions renumbered successfully!");
        } catch (err) {
            console.error("Error renumbering:", err);
            alert("Failed to renumber questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authenticated) {
            fetchParticipants();
            fetchQuestions();
            fetchSettingsData();
        }
    }, [authenticated, fetchParticipants, fetchQuestions, fetchSettingsData]);

    const exportCSV = () => {
        const submitted = participants.filter((p) => p.submitted);
        if (submitted.length === 0) return;
        const headers = ["Rank", "Name", "Student ID", "Score", "Total Points", "Time Taken (s)"];
        const rows = submitted.map((p, i) => {
            const timeTaken = p.completedAt ? Math.floor((p.completedAt - p.startedAt) / 1000) : "N/A";
            return [i + 1, p.name, p.studentId, p.score, p.totalPoints, timeTaken];
        });
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `debugging_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearAllParticipants = async () => {
        if (!confirm("⚠️ This will delete ALL participant data. This cannot be undone. Continue?")) return;
        try {
            await clearParticipantsApi();
            setParticipants([]);
        } catch (err) {
            console.error("Error clearing participants:", err);
        }
    };

    // Helper to update questions metadata timestamp
    const updateQuestionsMetadata = async () => {
        try {
            await putMetadata("questions", { lastUpdated: Date.now() });
        } catch (err) {
            console.error("Error updating metadata:", err);
        }
    };

    const seedQuestions = async () => {
        if (!confirm("This will add 15 sample questions to the database. Continue?")) return;
        try {
            setLoading(true);
            const items = sampleQuestions.map(({ id, ...data }) => data);
            await batchSeedQuestions(items as Record<string, unknown>[]);
            await fetchQuestions();
        } catch (err) {
            console.error("Error seeding questions:", err);
        } finally {
            setLoading(false);
        }
    };

    // ==================== RESET FORM ====================
    const resetForm = () => {
        setQTitle("");
        setQDesc("");
        setQSection("Python");
        setQBuggyCode("");
        setQCorrectCode("");
        setQCodeSnippet("");
        setQOptions(["", "", "", ""]);
        setQCorrectOption(0);
        setQScenario("");
        setQAcceptedAnswers("");
        setQPoints("10");
        setQOrder("");
        setEditingId(null);
    };

    // ==================== LOAD QUESTION INTO FORM (EDIT) ====================
    const loadQuestionForEdit = (q: Question) => {
        setEditingId(q.id);
        setQType(q.type);
        setQSection(q.section || "Python");
        setQTitle(q.title);
        setQDesc(q.description);
        setQPoints(String(q.points));
        setQOrder(String(q.order));

        if (q.type === "syntax") {
            setQLang(q.language);
            setQBuggyCode(q.buggyCode);
            setQCorrectCode(q.correctCode);
        } else if (q.type === "mcq") {
            setQLang(q.language);
            setQCodeSnippet(q.codeSnippet);
            const opts = [...q.options];
            while (opts.length < 4) opts.push("");
            setQOptions(opts);
            setQCorrectOption(q.correctOptionIndex);
        } else if (q.type === "casestudy") {
            setQScenario(q.scenario);
            setQAcceptedAnswers(q.acceptedAnswers.join(", "));
        }

        // Scroll to form
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ==================== ADD OR UPDATE QUESTION ====================
    const saveQuestion = async () => {
        if (!qTitle.trim()) return;
        setAddingQuestion(true);
        setSavingEdit(true);

        try {
            const baseData = {
                title: qTitle.trim(),
                description: qDesc.trim(),
                section: qSection,
                points: parseInt(qPoints) || 10,
                order: parseInt(qOrder) || questions.length + 1,
            };

            let questionData: Record<string, unknown>;

            switch (qType) {
                case "syntax":
                    questionData = {
                        ...baseData,
                        type: "syntax",
                        language: qLang,
                        buggyCode: qBuggyCode,
                        correctCode: qCorrectCode,
                    };
                    break;
                case "mcq":
                    questionData = {
                        ...baseData,
                        type: "mcq",
                        language: qLang,
                        codeSnippet: qCodeSnippet,
                        options: qOptions.filter((o) => o.trim() !== ""),
                        correctOptionIndex: qCorrectOption,
                    };
                    break;
                case "casestudy":
                    questionData = {
                        ...baseData,
                        type: "casestudy",
                        scenario: qScenario,
                        acceptedAnswers: qAcceptedAnswers
                            .split(",")
                            .map((a) => a.trim())
                            .filter(Boolean),
                    };
                    break;
            }

            if (editingId) {
                // UPDATE existing question
                await updateQuestionApi(editingId, questionData!);
            } else {
                // ADD new question
                await createQuestionApi(questionData!);
            }

            await updateQuestionsMetadata();
            await fetchQuestions();
            resetForm();
        } catch (err: any) {
            console.error("Error saving question:", err);
            alert(`Failed to save question: ${err.message}`);
        } finally {
            setAddingQuestion(false);
            setSavingEdit(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Delete this question?")) return;
        try {
            await deleteQuestionApi(id);
            setQuestions((prev) => prev.filter((q) => q.id !== id));
            setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
            if (editingId === id) resetForm();
            await updateQuestionsMetadata();
        } catch (err: any) {
            console.error("Error deleting question:", err);
            alert(`Failed to delete question: ${err.message}`);
        }
    };

    // ==================== MULTI-SELECT ====================
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllFiltered = () => {
        const ids = filteredQuestions.map((q) => q.id);
        const allSelected = ids.every((id) => selectedIds.has(id));
        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.add(id));
                return next;
            });
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected question${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
        try {
            await batchDeleteQuestions(Array.from(selectedIds));
            setQuestions((prev) => prev.filter((q) => !selectedIds.has(q.id)));
            if (editingId && selectedIds.has(editingId)) resetForm();
            await updateQuestionsMetadata();
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Error deleting selected:", err);
        }
    };

    const moveToSection = async (section: "C" | "Python" | "Other" | "Common") => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Move ${selectedIds.size} questions to "${section}"?`)) return;

        try {
            await batchMoveSection(Array.from(selectedIds), section);

            // Update local state
            setQuestions(prev => prev.map(q =>
                selectedIds.has(q.id) ? { ...q, section } : q
            ));

            await updateQuestionsMetadata();
            setSelectedIds(new Set());
        } catch (err) {
            console.error("Error moving questions:", err);
            alert("Failed to move questions");
        }
    };

    // ==================== BULK IMPORT ====================
    const getBulkTemplate = (type: "syntax" | "mcq" | "casestudy"): string => {
        switch (type) {
            case "syntax":
                return `#include <stdio.h>
int main() {
 int num = 121, rev = 0, temp;
 temp = num;
 while(temp > 0) {
 rev = rev * 10 + temp % 10;
 temp = temp / 10;
 }
 if(rev = num)
 printf("Palindrome");
 else
 printf("Not Palindrome");
 return 0;
}
What is the syntax error?
A) while loop wrong
B) Missing ;
C) = should be ==
D) temp variable wrong
Answer: C

#include <stdio.h>
int main() {
 int num = 7, i, flag = 0;
 for(i = 2; i <= num/2; i++) {
 if(num % i == 0) {
 flag = 1;
 break;
 }
 }
 if(flag == 0)
 printf("Prime")
 else
 printf("Not Prime");
 return 0;
}
What is the syntax error?
A) for loop wrong
B) Missing semicolon after printf
C) flag wrong
D) break wrong
Answer: B`;
            case "mcq":
                return `const nums = [1, 2, 3, 4, 5];
_______________
console.log(result);
Which line completes the code to get the sum?
A) const result = nums.map(n => n + n);
B) const result = nums.reduce((a, b) => a + b, 0);
C) const result = nums.filter(n => n > 2);
D) const result = nums.forEach(n => n);
Answer: B

def greet(name):
    _______________
    return message
What should fill the blank?
A) message = "Hello" + name
B) message = f"Hello, {name}!"
C) message = name
D) print("Hello")
Answer: B`;
            case "casestudy":
                return `A web server returns a 3-digit code starting with 4 when the client sends a bad request. What HTTP status code is typically returned?
Answer: 400, 400 Bad Request

A developer notices that their application creates a new database connection for every request, causing performance issues. What design pattern should they use to reuse connections?
Answer: connection pooling, object pool, pool`;
        }
    };

    const parseTextQuestions = (text: string, type: "syntax" | "mcq" | "casestudy") => {
        const results: Record<string, unknown>[] = [];

        if (type === "syntax" || type === "mcq") {
            // Split into question blocks: each block ends with "Answer: X"
            const blocks: string[] = [];
            let current = "";
            const lines = text.split("\n");
            for (const line of lines) {
                current += line + "\n";
                if (/^Answer:\s*[A-Da-d]/i.test(line.trim())) {
                    blocks.push(current.trim());
                    current = "";
                }
            }
            if (current.trim()) blocks.push(current.trim());

            for (const block of blocks) {
                const blines = block.split("\n");

                // Find option lines (A) ... B) ... C) ... D) ...)
                const optionIndices: number[] = [];
                const optionRegex = /^[A-Da-d]\)\s*/;
                for (let i = 0; i < blines.length; i++) {
                    if (optionRegex.test(blines[i].trim())) {
                        optionIndices.push(i);
                    }
                }

                if (optionIndices.length < 2) continue; // not enough options

                // Find question line (the line before first option)
                const questionIdx = optionIndices[0] - 1;
                if (questionIdx < 0) continue;

                // The question title
                const questionLine = blines[questionIdx].trim();

                // Code = everything before the question line
                const codeLines = blines.slice(0, questionIdx);
                const code = codeLines.join("\n").trim();

                // Options
                const options: string[] = [];
                for (const oi of optionIndices) {
                    const optText = blines[oi].trim().replace(optionRegex, "");
                    options.push(optText);
                }

                // Answer line
                const answerLine = blines.find((l) => /^Answer:\s*[A-Da-d]/i.test(l.trim()));
                let correctIndex = 0;
                if (answerLine) {
                    const letter = answerLine.trim().replace(/^Answer:\s*/i, "").charAt(0).toUpperCase();
                    correctIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                }

                if (type === "syntax") {
                    results.push({
                        type: "syntax",
                        title: questionLine,
                        description: questionLine,
                        language: "c",
                        buggyCode: code,
                        correctCode: options[correctIndex] || "",
                        points: 10,
                        order: 0,
                    });
                } else {
                    results.push({
                        type: "mcq",
                        title: questionLine,
                        description: questionLine,
                        language: "c",
                        codeSnippet: code,
                        options,
                        correctOptionIndex: correctIndex,
                        points: 10,
                        order: 0,
                    });
                }
            }
        } else {
            // Case study: "scenario text\nAnswer: ans1, ans2, ans3"
            const blocks: string[] = [];
            let current = "";
            const lines = text.split("\n");
            for (const line of lines) {
                current += line + "\n";
                if (/^Answer:\s*.+/i.test(line.trim())) {
                    blocks.push(current.trim());
                    current = "";
                }
            }
            if (current.trim()) blocks.push(current.trim());

            for (const block of blocks) {
                const blines = block.split("\n");
                const answerLine = blines.find((l) => /^Answer:\s*.+/i.test(l.trim()));
                if (!answerLine) continue;

                const scenarioLines = blines.filter((l) => !(/^Answer:\s*.+/i.test(l.trim())));
                const scenario = scenarioLines.join("\n").trim();
                const answers = answerLine
                    .trim()
                    .replace(/^Answer:\s*/i, "")
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean);

                // First line as title
                const title = scenarioLines[0]?.trim().slice(0, 80) || "Case Study Question";

                results.push({
                    type: "casestudy",
                    title,
                    description: "Read the scenario and answer.",
                    scenario,
                    acceptedAnswers: answers,
                    points: 10,
                    order: 0,
                });
            }
        }

        return results;
    };

    const handleBulkImport = async () => {
        setBulkError("");
        setBulkSuccess("");

        if (!bulkJson.trim()) {
            setBulkError("Please paste your questions.");
            return;
        }

        const parsed = parseTextQuestions(bulkJson, bulkType);

        if (parsed.length === 0) {
            setBulkError("Could not parse any questions. Make sure the format matches the template (code → question → A/B/C/D options → Answer: X).");
            return;
        }

        setBulkImporting(true);

        try {
            const currentMax = questions.length;
            const items = parsed.map((item, i) => ({
                ...item,
                order: currentMax + i + 1,
                section: bulkSection,
            }));

            await batchImportQuestions(items);
            await fetchQuestions();
            setBulkSuccess(`✅ Successfully imported ${items.length} ${bulkType} question${items.length !== 1 ? "s" : ""}!`);
            setBulkJson("");
        } catch (err) {
            console.error("Bulk import error:", err);
            setBulkError("Failed to import some questions. Check console for details.");
        } finally {
            setBulkImporting(false);
        }
    };

    const formatTimeTaken = (p: Participant) => {
        if (!p.completedAt) return "In Progress";
        const secs = Math.floor((p.completedAt - p.startedAt) / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s}s`;
    };

    const filteredQuestions = questions.filter((q) => {
        const typeMatch = filterType === "all" || q.type === filterType;
        const sectionMatch = filterSection === "all" || (q.section || "Other") === filterSection;
        return typeMatch && sectionMatch;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "syntax": return <Bug size={14} />;
            case "mcq": return <Code size={14} />;
            case "casestudy": return <FileQuestion size={14} />;
            default: return null;
        }
    };

    // LOGIN SCREEN
    if (!authenticated) {
        return (
            <div className={styles.loginScreen}>
                <form className={styles.loginCard} onSubmit={handleLogin}>
                    <Lock size={40} className={styles.loginIcon} />
                    <h2 className={styles.loginTitle}>Admin Access</h2>
                    <p className={styles.loginSubtitle}>Enter the admin password to continue</p>
                    <input
                        type="password"
                        className={styles.loginInput}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className={styles.loginBtn}>
                        Authenticate
                    </button>
                    {loginError && <p className={styles.loginError}>{loginError}</p>}
                </form>
            </div>
        );
    }

    return (
        <div className={styles.adminPage}>
            {/* Header */}
            <div className={styles.adminHeader}>
                <h1 className={styles.adminTitle}>
                    <Shield size={24} className={styles.adminTitleIcon} />
                    Admin Panel
                </h1>
                <div className={styles.adminActions}>
                    <button
                        className={`${styles.toggleBtn} ${isQuizActive ? styles.active : styles.inactive}`}
                        onClick={toggleQuizStatus}
                    >
                        {isQuizActive ? "🟢 Event Active" : "🔴 Event Paused"}
                    </button>
                    <button className={styles.logoutBtn} onClick={() => setAuthenticated(false)}>
                        <LogOut size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === "leaderboard" ? styles.active : ""}`}
                    onClick={() => setActiveTab("leaderboard")}
                >
                    <Users size={16} /> Leaderboard
                </button>
                <button
                    className={`${styles.tab} ${activeTab === "questions" ? styles.active : ""}`}
                    onClick={() => setActiveTab("questions")}
                >
                    <FileText size={16} /> Questions ({questions.length})
                </button>
            </div>

            {/* ===== LEADERBOARD TAB ===== */}
            {activeTab === "leaderboard" && (
                <div className={styles.leaderboardSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            Participants ({participants.filter((p) => p.submitted).length} submitted)
                        </h2>
                        <div className={styles.actionBtns}>
                            <button className={styles.iconBtn} onClick={fetchParticipants}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                            <button className={styles.iconBtn} onClick={exportCSV}>
                                <Download size={14} /> Export CSV
                            </button>
                            <button className={styles.dangerBtn} onClick={clearAllParticipants}>
                                <Trash2 size={14} /> Clear All
                            </button>
                        </div>
                    </div>

                    {participants.filter((p) => p.submitted).length === 0 ? (
                        <div className={styles.emptyState}>
                            <Users size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                            <p>No submissions yet</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Name</th>
                                    <th>Student ID</th>
                                    <th>Score</th>
                                    <th>Total</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants
                                    .filter((p) => p.submitted)
                                    .map((p, i) => (
                                        <tr key={p.id}>
                                            <td className={styles.rank}>#{i + 1}</td>
                                            <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                                            <td>{p.studentId}</td>
                                            <td className={styles.scoreTd}>{p.score}</td>
                                            <td>{p.totalPoints}</td>
                                            <td className={styles.timeTd}>{formatTimeTaken(p)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ===== QUESTIONS TAB ===== */}
            {activeTab === "questions" && (
                <div className={styles.questionsSection}>
                    <div className={styles.toolbar}>
                        <button className={styles.secondaryBtn} onClick={seedQuestions}>
                            <Database size={14} /> Seed Samples
                        </button>
                        <button className={styles.secondaryBtn} onClick={renumberQuestions}>
                            <SortAsc size={14} /> Renumber
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => setShowBulkImport(!showBulkImport)}>
                            <Upload size={14} /> Bulk Import
                        </button>
                    </div>

                    {/* ====== ADD / EDIT QUESTION FORM ====== */}
                    <div className={styles.addQuestionForm}>
                        <div className={styles.sectionHeader}>
                            <h3 className={styles.sectionTitle}>
                                {editingId ? (
                                    <>
                                        <Edit3 size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                                        Editing Question
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                                        Add Question
                                    </>
                                )}
                            </h3>
                            <div className={styles.actionBtns}>
                                {editingId && (
                                    <button className={styles.iconBtn} onClick={resetForm}>
                                        <X size={14} /> Cancel Edit
                                    </button>
                                )}
                                <button className={styles.iconBtn} onClick={() => { setShowBulkImport(!showBulkImport); }}>
                                    <Upload size={14} /> Bulk Import
                                </button>
                                <button className={styles.seedBtn} onClick={seedQuestions}>
                                    <Database size={14} /> Seed Samples
                                </button>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formCol}>
                                <label className={styles.formLabel}>Type</label>
                                <select
                                    className={styles.formSelect}
                                    value={qType}
                                    onChange={(e) => setQType(e.target.value as "syntax" | "mcq" | "casestudy")}
                                    disabled={!!editingId}
                                >
                                    <option value="syntax">Syntax Error</option>
                                    <option value="mcq">Missing Line (MCQ)</option>
                                    <option value="casestudy">Case Study</option>
                                </select>
                            </div>
                            <div className={styles.formCol}>
                                <label className={styles.formLabel}>Section</label>
                                <select
                                    className={styles.formSelect}
                                    value={qSection}
                                    onChange={(e) => setQSection(e.target.value as "C" | "Python" | "Other")}
                                >
                                    <option value="Python">Python</option>
                                    <option value="C">C</option>
                                    <option value="Common">Common</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className={styles.formCol}>
                                <label className={styles.formLabel}>Title</label>
                                <input
                                    className={styles.formInput}
                                    value={qTitle}
                                    onChange={(e) => setQTitle(e.target.value)}
                                    placeholder="Question title"
                                />
                            </div>
                            <div style={{ width: 100 }}>
                                <label className={styles.formLabel}>
                                    <Star size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                    Points
                                </label>
                                <input
                                    className={styles.formInput}
                                    value={qPoints}
                                    onChange={(e) => setQPoints(e.target.value)}
                                    type="number"
                                    min="1"
                                />
                            </div>
                            <div style={{ width: 80 }}>
                                <label className={styles.formLabel}>Order</label>
                                <input
                                    className={styles.formInput}
                                    value={qOrder}
                                    onChange={(e) => setQOrder(e.target.value)}
                                    type="number"
                                    placeholder={(questions.length + 1).toString()}
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formCol}>
                                <label className={styles.formLabel}>Description</label>
                                <input
                                    className={styles.formInput}
                                    value={qDesc}
                                    onChange={(e) => setQDesc(e.target.value)}
                                    placeholder="Brief description for the participant"
                                />
                            </div>
                        </div>

                        {/* ---- SYNTAX FIELDS ---- */}
                        {qType === "syntax" && (
                            <>
                                <div className={styles.formRow}>
                                    <div style={{ width: 140 }}>
                                        <label className={styles.formLabel}>Language</label>
                                        <select className={styles.formSelect} value={qLang} onChange={(e) => setQLang(e.target.value)}>
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="java">Java</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="c">C</option>
                                            <option value="cpp">C++</option>
                                            <option value="sql">SQL</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        <label className={styles.formLabel}>Buggy Code (shown to participant)</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={qBuggyCode}
                                            onChange={(e) => setQBuggyCode(e.target.value)}
                                            placeholder="Code with the syntax error..."
                                        />
                                    </div>
                                    <div className={styles.formCol}>
                                        <label className={styles.formLabel}>Correct Code (answer)</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={qCorrectCode}
                                            onChange={(e) => setQCorrectCode(e.target.value)}
                                            placeholder="The fixed version of the code..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ---- MCQ FIELDS ---- */}
                        {qType === "mcq" && (
                            <>
                                <div className={styles.formRow}>
                                    <div style={{ width: 140 }}>
                                        <label className={styles.formLabel}>Language</label>
                                        <select className={styles.formSelect} value={qLang} onChange={(e) => setQLang(e.target.value)}>
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="java">Java</option>
                                            <option value="html">HTML</option>
                                            <option value="css">CSS</option>
                                            <option value="sql">SQL</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        <label className={styles.formLabel}>Code Snippet (use ___ for the blank line)</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={qCodeSnippet}
                                            onChange={(e) => setQCodeSnippet(e.target.value)}
                                            placeholder="Code with a blank line marked as _______________"
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        {qOptions.map((opt, i) => (
                                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                                                <input
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={qCorrectOption === i}
                                                    onChange={() => setQCorrectOption(i)}
                                                />
                                                <input
                                                    className={styles.formInput}
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOpts = [...qOptions];
                                                        newOpts[i] = e.target.value;
                                                        setQOptions(newOpts);
                                                    }}
                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                />
                                            </div>
                                        ))}
                                        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                                            Select the radio button for the correct answer
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ---- CASESTUDY FIELDS ---- */}
                        {qType === "casestudy" && (
                            <>
                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        <label className={styles.formLabel}>Scenario</label>
                                        <textarea
                                            className={styles.formTextarea}
                                            value={qScenario}
                                            onChange={(e) => setQScenario(e.target.value)}
                                            placeholder="Describe the case study scenario..."
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.formCol}>
                                        <label className={styles.formLabel}>Accepted Answers (comma-separated)</label>
                                        <input
                                            className={styles.formInput}
                                            value={qAcceptedAnswers}
                                            onChange={(e) => setQAcceptedAnswers(e.target.value)}
                                            placeholder="answer1, answer2, answer3"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button
                                className={styles.addBtn}
                                onClick={saveQuestion}
                                disabled={!qTitle.trim() || addingQuestion}
                            >
                                {editingId ? (
                                    savingEdit ? (
                                        "Saving..."
                                    ) : (
                                        <>
                                            <Save size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                            Update Question
                                        </>
                                    )
                                ) : addingQuestion ? (
                                    "Adding..."
                                ) : (
                                    "Add Question"
                                )}
                            </button>
                            {editingId && (
                                <button
                                    className={styles.iconBtn}
                                    onClick={resetForm}
                                    style={{ padding: "10px 20px" }}
                                >
                                    <X size={14} /> Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ====== BULK IMPORT PANEL ====== */}
                    {showBulkImport && (
                        <div className={styles.addQuestionForm} style={{ borderColor: "rgba(168, 85, 247, 0.3)" }}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>
                                    <Upload size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                                    Bulk Import Questions
                                </h3>
                                <button className={styles.iconBtn} onClick={() => { setShowBulkImport(false); setBulkError(""); setBulkSuccess(""); }}>
                                    <X size={14} /> Close
                                </button>
                            </div>

                            {/* Bulk type selector tabs */}
                            <div style={{ marginBottom: 15, display: "flex", alignItems: "center", gap: 15 }}>
                                <div className={styles.bulkTypeTabs} style={{ marginBottom: 0 }}>
                                    <button
                                        className={`${styles.bulkTypeTab} ${bulkType === "syntax" ? styles.active : ""}`}
                                        onClick={() => { setBulkType("syntax"); setBulkJson(""); setBulkError(""); setBulkSuccess(""); }}
                                    >
                                        <Bug size={14} /> Syntax Errors
                                    </button>
                                    <button
                                        className={`${styles.bulkTypeTab} ${bulkType === "mcq" ? styles.active : ""}`}
                                        onClick={() => { setBulkType("mcq"); setBulkJson(""); setBulkError(""); setBulkSuccess(""); }}
                                    >
                                        <Code size={14} /> MCQ
                                    </button>
                                    <button
                                        className={`${styles.bulkTypeTab} ${bulkType === "casestudy" ? styles.active : ""}`}
                                        onClick={() => { setBulkType("casestudy"); setBulkJson(""); setBulkError(""); setBulkSuccess(""); }}
                                    >
                                        <FileQuestion size={14} /> Case Studies
                                    </button>
                                </div>
                                <select
                                    className={styles.formSelect}
                                    style={{ width: "auto", minWidth: 120, height: 36 }}
                                    value={bulkSection}
                                    onChange={(e) => setBulkSection(e.target.value as "C" | "Python" | "Other")}
                                >
                                    <option value="Python">Python</option>
                                    <option value="C">C</option>
                                    <option value="Common">Common</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>
                                    Paste your {bulkType === "syntax" ? "syntax error" : bulkType === "mcq" ? "MCQ" : "case study"} questions below in <strong>plain text</strong> format.
                                    Click &quot;Load Template&quot; to see the expected format.
                                </p>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => setBulkJson(getBulkTemplate(bulkType))}
                                    style={{ fontSize: "0.78rem" }}
                                >
                                    📋 Load Template
                                </button>
                            </div>

                            <textarea
                                className={styles.bulkTextarea}
                                value={bulkJson}
                                onChange={(e) => { setBulkJson(e.target.value); setBulkError(""); setBulkSuccess(""); }}
                                placeholder={`Paste ${bulkType} questions here in plain text format...`}
                                spellCheck={false}
                            />

                            {bulkError && (
                                <div className={styles.bulkError}>{bulkError}</div>
                            )}
                            {bulkSuccess && (
                                <div className={styles.bulkSuccess}>{bulkSuccess}</div>
                            )}

                            <button
                                className={styles.addBtn}
                                onClick={handleBulkImport}
                                disabled={bulkImporting || !bulkJson.trim()}
                                style={{ marginTop: 10 }}
                            >
                                {bulkImporting
                                    ? "Importing..."
                                    : `Import ${bulkType === "syntax" ? "Syntax" : bulkType === "mcq" ? "MCQ" : "Case Study"} Questions`}
                            </button>
                        </div>
                    )}

                    {/* ====== QUESTION LIST ====== */}
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>
                            All Questions ({filteredQuestions.length}
                            {filterType !== "all" ? ` ${filterType}` : ""})
                        </h3>
                        <div className={styles.actionBtns}>
                            {/* Filter buttons */}
                            <div className={styles.filterBtns}>
                                <div className={styles.filterGroup}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: 6 }}>Type:</span>
                                    <button
                                        className={`${styles.filterBtn} ${filterType === "all" ? styles.active : ""}`}
                                        onClick={() => setFilterType("all")}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterType === "syntax" ? styles.active : ""}`}
                                        onClick={() => setFilterType("syntax")}
                                    >
                                        <Bug size={12} /> Syntax
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterType === "mcq" ? styles.active : ""}`}
                                        onClick={() => setFilterType("mcq")}
                                    >
                                        <Code size={12} /> MCQ
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterType === "casestudy" ? styles.active : ""}`}
                                        onClick={() => setFilterType("casestudy")}
                                    >
                                        <FileQuestion size={12} /> Case Study
                                    </button>
                                </div>

                                <div className={styles.filterGroup} style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: 12, marginLeft: 6 }}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: 6 }}>Section:</span>
                                    <button
                                        className={`${styles.filterBtn} ${filterSection === "all" ? styles.active : ""}`}
                                        onClick={() => setFilterSection("all")}
                                    >
                                        All
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterSection === "C" ? styles.active : ""}`}
                                        onClick={() => setFilterSection("C")}
                                    >
                                        C
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterSection === "Python" ? styles.active : ""}`}
                                        onClick={() => setFilterSection("Python")}
                                    >
                                        Py
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterSection === "Other" ? styles.active : ""}`}
                                        onClick={() => setFilterSection("Other")}
                                    >
                                        Other
                                    </button>
                                    <button
                                        className={`${styles.filterBtn} ${filterSection === "Common" ? styles.active : ""}`}
                                        onClick={() => setFilterSection("Common")}
                                    >
                                        Common
                                    </button>
                                </div>
                            </div>
                            <button className={styles.iconBtn} onClick={fetchQuestions}>
                                <RefreshCw size={14} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Select actions bar */}
                    {filteredQuestions.length > 0 && (
                        <div className={styles.selectBar}>
                            <button className={styles.selectAllBtn} onClick={selectAllFiltered}>
                                {filteredQuestions.every((q) => selectedIds.has(q.id))
                                    ? <><CheckSquare size={14} /> Deselect All</>
                                    : <><Square size={14} /> Select All</>}
                            </button>
                            {selectedIds.size > 0 && (
                                <>
                                    <span className={styles.selectCount}>{selectedIds.size} selected</span>

                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", marginRight: 10 }}>
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Move to:</span>
                                        <button className={styles.iconBtn} style={{ padding: "6px 12px" }} onClick={() => moveToSection("C")}>C</button>
                                        <button className={styles.iconBtn} style={{ padding: "6px 12px" }} onClick={() => moveToSection("Python")}>Py</button>
                                        <button className={styles.iconBtn} style={{ padding: "6px 12px" }} onClick={() => moveToSection("Other")}>Other</button>
                                        <button className={styles.iconBtn} style={{ padding: "6px 12px" }} onClick={() => moveToSection("Common")}>Common</button>
                                    </div>

                                    <button className={styles.dangerBtn} onClick={deleteSelected}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {filteredQuestions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <FileText size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                            <p>No questions {filterType !== "all" ? `of type "${filterType}"` : "yet"}. Add some or seed sample questions.</p>
                        </div>
                    ) : (
                        <div className={styles.questionCards}>
                            {filteredQuestions.map((q) => (
                                <div
                                    key={q.id}
                                    className={`${styles.qCard} ${editingId === q.id ? styles.qCardEditing : ""} ${selectedIds.has(q.id) ? styles.qCardSelected : ""}`}
                                >
                                    <div className={styles.qCardLeft}>
                                        <input
                                            type="checkbox"
                                            className={styles.qCheckbox}
                                            checked={selectedIds.has(q.id)}
                                            onChange={() => toggleSelect(q.id)}
                                        />
                                        <span className={styles.qCardOrder}>{q.order}</span>
                                        <div className={styles.qCardInfo}>
                                            <span className={styles.qCardTitle}>
                                                {q.title}
                                                <span className={`${styles.qCardType} ${styles[q.type]}`}>
                                                    {getTypeIcon(q.type)}
                                                    {q.type === "casestudy" ? "Case Study" : (q.type || "unknown").toUpperCase()}
                                                </span>
                                                <span className={styles.qCardSection}>
                                                    {q.section || "Other"}
                                                </span>
                                            </span>
                                            <span className={styles.qCardMeta}>
                                                <Star size={11} style={{ verticalAlign: "middle", marginRight: 3 }} />
                                                {q.points} pts
                                                {q.type !== "casestudy" && (
                                                    <> · {"language" in q ? (q as { language: string }).language : ""}</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.qCardActions}>
                                        <button
                                            className={styles.editBtn}
                                            onClick={() => loadQuestionForEdit(q)}
                                            title="Edit question"
                                        >
                                            <Edit3 size={15} />
                                        </button>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDeleteQuestion(q.id)}
                                            title="Delete question"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
