"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSettings, createParticipant } from "@/lib/api";
import { Bug, Code, FileQuestion, Terminal } from "lucide-react";
import styles from "./page.module.css";

const sections = [
  { id: "Python", icon: Terminal, label: "Python", description: "Standard Library & Syntax" },
  { id: "C", icon: Code, label: "C Language", description: "Pointers & Memory" },
  { id: "Other", icon: FileQuestion, label: "General", description: "Logic & Concepts" }
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [section, setSection] = useState<"C" | "Python" | "Other" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isQuizActive, setIsQuizActive] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const config = await getSettings("config");
        if (config && "isQuizActive" in config) {
          setIsQuizActive((config.isQuizActive as boolean) ?? true);
        }
      } catch (err) {
        console.error("Error checking status:", err);
      }
    };
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !studentId.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await createParticipant({
        name: name.trim(),
        studentId: studentId.trim(),
        section,
        startedAt: Date.now(),
        score: 0,
        totalPoints: 0,
        answers: [],
        submitted: false,
      });

      // Store participant ID and section in session storage
      sessionStorage.setItem("participantId", result.id);
      sessionStorage.setItem("participantName", name.trim());
      sessionStorage.setItem("participantSection", section || "Other");
      router.push("/challenge");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.landing}>
      {/* Floating particles */}
      <div className={styles.particles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.particle} />
        ))}
      </div>

      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          LogiXcape 2026
        </div>
        <h1 className={styles.title}>Tech Debugging Challenge</h1>
        <p className={styles.subtitle}>
          Find the bugs. Fix the code. Crack the case studies.
          Test your debugging prowess across three challenging rounds.
        </p>
      </div>

      {/* Registration Steps */}
      <div className={styles.registrationContainer}>
        {!section ? (
          // STEP 1: SELECT SECTION
          <div className={styles.stepContainer}>
            <h2 className={styles.stepTitle}>Choose Your Weapon</h2>
            <p className={styles.stepSubtitle}>Select a language to begin your debugging mission</p>

            <div className={styles.bigSectionGrid}>
              {sections.map((s) => (
                <button
                  key={s.id}
                  className={styles.bigSectionCard}
                  onClick={() => setSection(s.id as "C" | "Python" | "Other")}
                  disabled={loading}
                >
                  <div className={styles.bigCardIcon}>
                    <s.icon size={48} />
                  </div>
                  <h3 className={styles.bigCardTitle}>{s.label}</h3>
                  <p className={styles.bigCardDesc}>{s.description}</p>
                </button>
              ))}
            </div>

            {isQuizActive === false && (
              <div className={styles.eventPausedBanner}>
                Event is currently paused by admin.
              </div>
            )}
          </div>
        ) : (
          // STEP 2: ENTER DETAILS
          <form className={styles.regCard} onSubmit={handleSubmit}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSection(null)} // Go back to step 1
            >
              ← Change Language
            </button>

            <div className={styles.selectedSectionHeader}>
              <span className={styles.selectedBadge}>
                Selected: <strong>{section}</strong>
              </span>
            </div>

            <h2 className={styles.regTitle}>Identify Yourself</h2>
            <p className={styles.regSubtitle}>Enter your details to enter the arena</p>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="name">Full Name</label>
              <input
                id="name"
                className={styles.input}
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="studentId">Student ID</label>
              <input
                id="studentId"
                className={styles.input}
                type="text"
                placeholder="Enter your student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || isQuizActive === false}
            >
              Start Challenge →
            </button>
          </form>
        )}
      </div>

      {/* Feature highlights */}
      <div className={styles.features}>
        <div className={styles.featureCard}>
          <Bug size={20} className={styles.featureIcon} />
          <span className={styles.featureText}>Fix Syntax Errors</span>
        </div>
        <div className={styles.featureCard}>
          <Code size={20} className={styles.featureIcon} />
          <span className={styles.featureText}>Complete Missing Code</span>
        </div>
        <div className={styles.featureCard}>
          <FileQuestion size={20} className={styles.featureIcon} />
          <span className={styles.featureText}>Solve Case Studies</span>
        </div>
      </div>
    </main >
  );
}
