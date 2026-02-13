export type QuestionType = "syntax" | "mcq" | "casestudy";

export type QuestionSection = "C" | "Python" | "Other" | "Common";

export interface SyntaxQuestion {
    id: string;
    type: "syntax";
    section: QuestionSection;
    title: string;
    description: string;
    language: string;
    buggyCode: string;
    correctCode: string;
    points: number;
    order: number;
}

export interface MCQQuestion {
    id: string;
    type: "mcq";
    section: QuestionSection;
    title: string;
    description: string;
    language: string;
    codeSnippet: string; // code with a blank/placeholder
    options: string[];
    correctOptionIndex: number;
    points: number;
    order: number;
}

export interface CaseStudyQuestion {
    id: string;
    type: "casestudy";
    section: QuestionSection;
    title: string;
    description: string;
    scenario: string;
    acceptedAnswers: string[]; // multiple accepted answers (case-insensitive)
    points: number;
    order: number;
}

export type Question = SyntaxQuestion | MCQQuestion | CaseStudyQuestion;

export interface Participant {
    id: string;
    name: string;
    studentId: string;
    startedAt: number;
    completedAt?: number;
    score: number;
    totalPoints: number;
    answers: Answer[];
    section: QuestionSection; // The section chosen by the participant
    submitted: boolean;
}

export interface Answer {
    questionId: string;
    questionType: QuestionType;
    userAnswer: string; // for syntax: corrected code, for mcq: selected index, for casestudy: text
    isCorrect?: boolean;
    pointsAwarded: number;
}
