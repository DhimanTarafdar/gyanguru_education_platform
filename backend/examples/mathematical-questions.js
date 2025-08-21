// Test Mathematical Question Generation
// This file demonstrates how to generate mathematical questions with proper formatting

const testMathematicalQuestions = {
  // Sample AI generation request for Physics
  physics_example: {
    type: "mcq",
    subject: "পদার্থবিজ্ঞান",
    chapter: "আলো",
    topic: "আলোর গতি",
    class: 9,
    difficulty: "medium",
    count: 3,
    language: "bengali",
    saveToDatabase: false
  },

  // Sample AI generation request for Mathematics
  math_example: {
    type: "mcq",
    subject: "গণিত",
    chapter: "বীজগণিত",
    topic: "সূচক ও লগারিদম",
    class: 10,
    difficulty: "medium",
    count: 3,
    language: "bengali",
    saveToDatabase: false
  },

  // Expected AI Response Format for Physics Question
  expected_physics_response: {
    "questions": [
      {
        "question": "আলোর বেগ কত?",
        "options": [
          { "text": "3×10⁸ m/s", "isCorrect": true },
          { "text": "3×10⁶ m/s", "isCorrect": false },
          { "text": "3×10¹⁰ m/s", "isCorrect": false },
          { "text": "3×10⁷ m/s", "isCorrect": false }
        ],
        "explanation": "আলোর বেগ শূন্যস্থানে 3×10⁸ মিটার/সেকেন্ড। এটি একটি মৌলিক ভৌত ধ্রুবক।"
      }
    ]
  },

  // Expected AI Response Format for Math Question
  expected_math_response: {
    "questions": [
      {
        "question": "যদি 2^x = 8 হয়, তাহলে x এর মান কত?",
        "options": [
          { "text": "x = 2", "isCorrect": false },
          { "text": "x = 3", "isCorrect": true },
          { "text": "x = 4", "isCorrect": false },
          { "text": "x = 5", "isCorrect": false }
        ],
        "explanation": "2^x = 8 = 2³, তাই x = 3"
      }
    ]
  },

  // Manual Question Creation Examples
  manual_physics_question: {
    title: "আলোর বেগ সম্পর্কে প্রশ্ন",
    type: "mcq",
    subject: "পদার্থবিজ্ঞান",
    chapter: "আলো",
    topic: "আলোর গতি",
    class: 9,
    difficulty: "medium",
    marks: 2,
    timeLimit: 2,
    question: {
      text: "শূন্যস্থানে আলোর বেগ কত?",
      latex: "c = 3 \\times 10^8 \\, \\text{m/s}" // LaTeX for beautiful rendering
    },
    options: [
      { text: "3×10⁸ m/s", isCorrect: true },
      { text: "3×10⁶ m/s", isCorrect: false },
      { text: "3×10¹⁰ m/s", isCorrect: false },
      { text: "3×10⁷ m/s", isCorrect: false }
    ],
    correctAnswer: {
      text: "3×10⁸ m/s",
      explanation: "আলোর বেগ একটি মৌলিক ভৌত ধ্রুবক যার মান 299,792,458 m/s যা সাধারণত 3×10⁸ m/s হিসেবে ব্যবহৃত হয়।"
    },
    tags: ["আলো", "গতি", "ভৌত ধ্রুবক"],
    keywords: ["আলোর বেগ", "শূন্যস্থান", "মিটার প্রতি সেকেন্ড"],
    isPublic: true
  },

  manual_math_question: {
    title: "সূচক সমীকরণ",
    type: "mcq",
    subject: "গণিত",
    chapter: "বীজগণিত",
    topic: "সূচক ও লগারিদম",
    class: 10,
    difficulty: "medium",
    marks: 3,
    timeLimit: 3,
    question: {
      text: "যদি 2^x = 256 হয়, তাহলে x এর মান কত?",
      latex: "2^x = 256 \\Rightarrow x = ?"
    },
    options: [
      { text: "x = 6", isCorrect: false },
      { text: "x = 7", isCorrect: false },
      { text: "x = 8", isCorrect: true },
      { text: "x = 9", isCorrect: false }
    ],
    correctAnswer: {
      text: "x = 8",
      explanation: "2^x = 256 = 2⁸, তাই x = 8। কারণ 2⁸ = 2×2×2×2×2×2×2×2 = 256",
      keyPoints: ["2⁸ = 256", "সূচক নিয়ম প্রয়োগ"]
    },
    tags: ["সূচক", "সমীকরণ", "বীজগণিত"],
    keywords: ["সূচক সমীকরণ", "ঘাত", "লগারিদম"],
    isPublic: true
  }
};

// API Usage Examples
const apiExamples = {
  // Generate mathematical questions via AI
  generate_math_questions: {
    method: "POST",
    url: "/api/questions/ai-generate",
    headers: {
      "Authorization": "Bearer <teacher_jwt_token>",
      "Content-Type": "application/json"
    },
    body: testMathematicalQuestions.math_example
  },

  // Create manual mathematical question
  create_manual_question: {
    method: "POST", 
    url: "/api/questions/",
    headers: {
      "Authorization": "Bearer <teacher_jwt_token>",
      "Content-Type": "application/json"
    },
    body: testMathematicalQuestions.manual_math_question
  },

  // Search for physics questions
  search_physics_questions: {
    method: "GET",
    url: "/api/questions/?subject=পদার্থবিজ্ঞান&chapter=আলো&class=9&difficulty=medium",
    headers: {
      "Authorization": "Bearer <user_jwt_token>"
    }
  }
};

module.exports = {
  testMathematicalQuestions,
  apiExamples
};
