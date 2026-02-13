import { Question } from "@/types";

export const sampleQuestions: Question[] = [
    // ===== SYNTAX ERROR QUESTIONS =====
    {
        id: "syn-1",
        type: "syntax",
        section: "Python",
        title: "Fix the Python Loop",
        description: "The following Python code has a syntax error. Find and fix it so the code prints numbers 1 to 5.",
        language: "python",
        buggyCode: `for i in range(1, 6)
    print(i)`,
        correctCode: `for i in range(1, 6):
    print(i)`,
        points: 10,
        order: 1,
    },
    {
        id: "syn-2",
        type: "syntax",
        section: "Other",
        title: "Fix the JavaScript Function",
        description: "This JavaScript function should return the sum of two numbers, but it has a syntax error.",
        language: "javascript",
        buggyCode: `function add(a, b) {
  retrun a + b;
}`,
        correctCode: `function add(a, b) {
  return a + b;
}`,
        points: 10,
        order: 2,
    },
    {
        id: "syn-3",
        type: "syntax",
        section: "Other",
        title: "Fix the HTML Tag",
        description: "This HTML code has a syntax error preventing it from rendering properly. Fix it.",
        language: "html",
        buggyCode: `<div class="container">
  <h1>Hello World<h1>
  <p>Welcome to debugging!</p>
</div>`,
        correctCode: `<div class="container">
  <h1>Hello World</h1>
  <p>Welcome to debugging!</p>
</div>`,
        points: 10,
        order: 3,
    },
    {
        id: "syn-4",
        type: "syntax",
        section: "C",
        title: "Fix the Java Class",
        description: "This Java class has a syntax error. Fix it so the code compiles correctly.",
        language: "java",
        buggyCode: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello World")
  }
}`,
        correctCode: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello World");
  }
}`,
        points: 10,
        order: 4,
    },
    {
        id: "syn-5",
        type: "syntax",
        section: "Other",
        title: "Fix the CSS Selector",
        description: "This CSS code has a syntax error. Fix it so the styles apply correctly.",
        language: "css",
        buggyCode: `.container {
  background-color: #333
  color: white;
  padding: 20px;
}`,
        correctCode: `.container {
  background-color: #333;
  color: white;
  padding: 20px;
}`,
        points: 10,
        order: 5,
    },

    // ===== MCQ (MISSING LINE) QUESTIONS =====
    {
        id: "mcq-1",
        type: "mcq",
        section: "Python",
        title: "Complete the Python List Comprehension",
        description: "Which line correctly completes this Python code to create a list of squares from 1 to 10?",
        language: "python",
        codeSnippet: `# Create a list of squares from 1 to 10
_______________
print(squares)  # Output: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]`,
        options: [
            "squares = [x * 2 for x in range(1, 11)]",
            "squares = [x ** 2 for x in range(1, 11)]",
            "squares = [x ^ 2 for x in range(1, 11)]",
            "squares = [x * x for x in range(10)]",
        ],
        correctOptionIndex: 1,
        points: 10,
        order: 6,
    },
    {
        id: "mcq-2",
        type: "mcq",
        section: "Other",
        title: "Complete the JavaScript Array Method",
        description: "Which line correctly filters out even numbers from the array?",
        language: "javascript",
        codeSnippet: `const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
_______________
console.log(oddNumbers); // Output: [1, 3, 5, 7, 9]`,
        options: [
            "const oddNumbers = numbers.map(n => n % 2 !== 0);",
            "const oddNumbers = numbers.filter(n => n % 2 === 0);",
            "const oddNumbers = numbers.filter(n => n % 2 !== 0);",
            "const oddNumbers = numbers.reduce(n => n % 2 !== 0);",
        ],
        correctOptionIndex: 2,
        points: 10,
        order: 7,
    },
    {
        id: "mcq-3",
        type: "mcq",
        section: "Other",
        title: "Complete the SQL Query",
        description: "Which line correctly retrieves all users older than 25, ordered by name?",
        language: "sql",
        codeSnippet: `SELECT name, age
FROM users
_______________
ORDER BY name ASC;`,
        options: [
            "HAVING age > 25",
            "WHERE age > 25",
            "FILTER age > 25",
            "WHEN age > 25",
        ],
        correctOptionIndex: 1,
        points: 10,
        order: 8,
    },
    {
        id: "mcq-4",
        type: "mcq",
        section: "Other",
        title: "Complete the React Component",
        description: "Which line correctly sets up state in this React functional component?",
        language: "javascript",
        codeSnippet: `import React from 'react';
_______________

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}`,
        options: [
            "import { useState } from 'react';",
            "import useState from 'react';",
            "const { useState } = React;",
            "import { state } from 'react';",
        ],
        correctOptionIndex: 0,
        points: 10,
        order: 9,
    },
    {
        id: "mcq-5",
        type: "mcq",
        section: "Python",
        title: "Complete the Python Exception Handling",
        description: "Which line correctly catches the specific exception when dividing by zero?",
        language: "python",
        codeSnippet: `try:
    result = 10 / 0
_______________
    print("Cannot divide by zero!")`,
        options: [
            "catch ZeroDivisionError:",
            "except ZeroDivisionError as e:",
            "handle ZeroDivisionError:",
            "on ZeroDivisionError:",
        ],
        correctOptionIndex: 1,
        points: 10,
        order: 10,
    },

    // ===== CASE STUDY QUESTIONS =====
    {
        id: "cs-1",
        type: "casestudy",
        section: "Other",
        title: "Identify the Design Pattern",
        description: "Read the scenario and answer in a few words.",
        scenario:
            "A developer creates a class that ensures only one instance of a database connection exists throughout the application. Every time a new connection is requested, the same instance is returned. What design pattern is this?",
        acceptedAnswers: ["singleton", "singleton pattern"],
        points: 10,
        order: 11,
    },
    {
        id: "cs-2",
        type: "casestudy",
        section: "Other",
        title: "Name the HTTP Status Code",
        description: "Read the scenario and answer with the status code number.",
        scenario:
            "A client sends a request to an API endpoint that requires authentication, but the request doesn't include any credentials or tokens. The server responds with a status code indicating the client must authenticate. What is this HTTP status code?",
        acceptedAnswers: ["401", "401 unauthorized"],
        points: 10,
        order: 12,
    },
    {
        id: "cs-3",
        type: "casestudy",
        section: "Other",
        title: "Identify the Data Structure",
        description: "Read the scenario and name the data structure.",
        scenario:
            "In a print queue system, documents are processed in the order they arrive. The first document added to the queue is the first one to be printed. New documents are added to the back. What data structure best describes this behavior?",
        acceptedAnswers: ["queue", "fifo", "fifo queue"],
        points: 10,
        order: 13,
    },
    {
        id: "cs-4",
        type: "casestudy",
        section: "Other",
        title: "Identify the Sorting Algorithm",
        description: "Read the scenario and name the algorithm.",
        scenario:
            "An algorithm works by repeatedly selecting the minimum element from the unsorted portion of the array and placing it at the beginning of the sorted portion. It has a time complexity of O(n²) in all cases. What sorting algorithm is this?",
        acceptedAnswers: ["selection sort", "selectionsort"],
        points: 10,
        order: 14,
    },
    {
        id: "cs-5",
        type: "casestudy",
        section: "Other",
        title: "Identify the Network Protocol",
        description: "Read the scenario and name the protocol.",
        scenario:
            "A protocol operates at the transport layer and provides reliable, ordered delivery of data between applications. It uses a three-way handshake to establish connections and ensures all packets arrive at the destination. What protocol is this?",
        acceptedAnswers: ["tcp", "tcp/ip", "transmission control protocol"],
        points: 10,
        order: 15,
    },
];
