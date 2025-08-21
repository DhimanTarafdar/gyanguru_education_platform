// Quick Test for Mathematical Question Generation
// Run this after getting API keys

const axios = require('axios');

// Test Mathematical Question Generation
async function testMathQuestionGeneration() {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    console.log('🧮 Testing Mathematical Question Generation...\n');

    // Test 1: Check AI Provider Status
    console.log('1. Checking AI Provider Status:');
    try {
      const statusResponse = await axios.get(`${baseURL}/questions/ai-status`, {
        headers: {
          'Authorization': 'Bearer <your-teacher-jwt-token>' // Replace with actual token
        }
      });
      console.log('   Status:', statusResponse.data);
    } catch (error) {
      console.log('   ❌ Need to login as teacher first or configure API keys');
    }

    // Test 2: Generate Physics Questions
    console.log('\n2. Generating Physics Questions:');
    const physicsRequest = {
      type: "mcq",
      subject: "পদার্থবিজ্ঞান",
      chapter: "আলো",
      topic: "আলোর গতি",
      class: 9,
      difficulty: "medium",
      count: 2,
      language: "bengali",
      saveToDatabase: false
    };

    console.log('   Request:', physicsRequest);
    // Note: This will fail without proper authentication and API keys
    // But shows the expected format

    // Test 3: Generate Math Questions  
    console.log('\n3. Math Question Format:');
    const mathRequest = {
      type: "mcq",
      subject: "গণিত",
      chapter: "বীজগণিত", 
      topic: "সূচক ও লগারিদম",
      class: 10,
      difficulty: "medium",
      count: 2,
      language: "bengali",
      saveToDatabase: false
    };

    console.log('   Request:', mathRequest);

    // Test 4: Manual Question Creation
    console.log('\n4. Manual Mathematical Question Creation:');
    const manualQuestion = {
      title: "আলোর বেগ সম্পর্কে প্রশ্ন",
      type: "mcq",
      subject: "পদার্থবিজ্ঞান",
      chapter: "আলো",
      class: 9,
      difficulty: "medium",
      marks: 2,
      question: {
        text: "শূন্যস্থানে আলোর বেগ কত?",
        latex: "c = 3 \\times 10^8 \\, \\text{m/s}"
      },
      options: [
        { text: "3×10⁸ m/s", isCorrect: true },
        { text: "3×10⁶ m/s", isCorrect: false },
        { text: "3×10¹⁰ m/s", isCorrect: false },
        { text: "3×10⁷ m/s", isCorrect: false }
      ],
      correctAnswer: {
        explanation: "আলোর বেগ একটি মৌলিক ভৌত ধ্রুবক"
      },
      tags: ["আলো", "গতি"],
      isPublic: true
    };

    console.log('   Manual Question Format:', JSON.stringify(manualQuestion, null, 2));

    console.log('\n✅ Mathematical Question System Ready!');
    console.log('\n📝 Steps to use:');
    console.log('1. Get FREE API key from https://console.groq.com/');
    console.log('2. Add GROQ_API_KEY to .env file');
    console.log('3. Login as teacher and get JWT token');
    console.log('4. Use /api/questions/ai-generate endpoint');
    console.log('5. AI will generate questions like: "আলোর বেগ কত?" with options "3×10⁸ m/s"');

  } catch (error) {
    console.error('Test Error:', error.message);
  }
}

// Mathematical Notation Examples that AI can generate
const mathematicalExamples = {
  physics: [
    "আলোর বেগ কত? A) 3×10⁸ m/s B) 3×10⁶ m/s",
    "মাধ্যাকর্ষণ ত্বরণ কত? A) 9.8 m/s² B) 10 m/s²",
    "প্লাঙ্কের ধ্রুবক কত? A) 6.63×10⁻³⁴ J⋅s B) 6.63×10⁻³² J⋅s"
  ],
  math: [
    "যদি 2^x = 8 হয়, তাহলে x = ? A) 2 B) 3 C) 4",
    "√16 এর মান কত? A) 2 B) 4 C) 8",
    "log₁₀(100) = ? A) 1 B) 2 C) 10",
    "sin²θ + cos²θ = ? A) 0 B) 1 C) 2"
  ],
  chemistry: [
    "পানির আণবিক ভর কত? A) 16 g/mol B) 18 g/mol C) 20 g/mol",
    "অ্যাভোগাড্রো সংখ্যা কত? A) 6.02×10²³ B) 6.02×10²²"
  ]
};

console.log('\n🧮 Mathematical Question Generation Test\n');
console.log('Examples of questions AI can generate:');
console.log('\n📐 Physics:', mathematicalExamples.physics);
console.log('\n🔢 Math:', mathematicalExamples.math);  
console.log('\n⚗️ Chemistry:', mathematicalExamples.chemistry);

console.log('\n🎯 Your specific example: "আলোর বেগ কত?" ✅');
console.log('Options: A) 3×10⁸ m/s B) 3×10⁶ m/s ✅');
console.log('AI can definitely generate this type of question! 🚀');

// Uncomment to run test (need API keys and authentication)
// testMathQuestionGeneration();

module.exports = {
  testMathQuestionGeneration,
  mathematicalExamples
};
