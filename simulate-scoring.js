
const questions = [
    {
        "buggyCode": "",
        "correctCode": "",
        "section": "Python",
        "points": 10,
        "order": 1,
        "description": "",
        "id": "4307a909-ea2d-48d8-8607-e34bccad0978",
        "language": "python",
        "title": "dv",
        "type": "syntax"
    },
    {
        "buggyCode": "asdf",
        "correctCode": "sdf",
        "section": "Python",
        "points": 10,
        "order": 2,
        "description": "sdf",
        "id": "9644971e-268b-455b-888f-3a74105bde35",
        "language": "python",
        "title": "sdf",
        "type": "syntax"
    },
    {
        "correctOptionIndex": 1,
        "section": "Python",
        "points": 10,
        "options": ["A", "B", "C"],
        "order": 3,
        "codeSnippet": "sdfa",
        "description": "gsaf",
        "id": "90cd4e3f-d9cd-4bc0-8521-9ea39bfdbb10",
        "language": "python",
        "title": "sdf",
        "type": "mcq"
    }
];

const answers = {
    "4307a909-ea2d-48d8-8607-e34bccad0978": "",
    "9644971e-268b-455b-888f-3a74105bde35": "sdf",
    "90cd4e3f-d9cd-4bc0-8521-9ea39bfdbb10": "0"
};

function evaluateAnswers() {
    return questions.map((q) => {
        const userAnswer = answers[q.id] || "";
        let isCorrect = false;
        let pointsAwarded = 0;

        switch (q.type) {
            case "syntax": {
                const normalize = (s) =>
                    s.replace(/\s+/g, " ").trim().toLowerCase();
                isCorrect = normalize(userAnswer || "") === normalize(q.correctCode || "");
                break;
            }
            case "mcq": {
                isCorrect = String(userAnswer) === String(q.correctOptionIndex);
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
}

const evaluatedAnswers = evaluateAnswers();
const totalScore = evaluatedAnswers.reduce(
    (sum, a) => sum + (Number(a.pointsAwarded) || 0),
    0
);

console.log("Evaluated:", JSON.stringify(evaluatedAnswers, null, 2));
console.log("Total Score:", totalScore);
