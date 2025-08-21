// Cost-Effective AI Integration Service
// Multiple API options with fallback mechanism

const axios = require('axios');

class AIQuestionGenerator {
  constructor() {
    // Priority-based provider system for scaling
    // FREE Demo ➡️ Growth ➡️ Scale phases
    
    this.providers = {
      // FREE TIER (Demo Phase)
      groq: {
        enabled: true,
        baseURL: 'https://api.groq.com/openai/v1',
        model: 'llama-3.1-70b-versatile',
        apiKey: process.env.GROQ_API_KEY,
        cost: 'FREE',
        rateLimit: 100, // requests per day for free
        priority: 1,
        tier: 'free'
      },
      
      openrouter: {
        enabled: true,
        baseURL: 'https://openrouter.ai/api/v1',
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        apiKey: process.env.OPENROUTER_API_KEY,
        cost: 'FREE',
        rateLimit: 200,
        priority: 2,
        tier: 'free'
      },
      
      huggingface: {
        enabled: true,
        baseURL: 'https://api-inference.huggingface.co/models',
        model: 'meta-llama/Llama-2-7b-chat-hf',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        cost: 'FREE',
        rateLimit: 1000,
        priority: 3,
        tier: 'free'
      },
      
      // GROWTH TIER (Paid but affordable)
      gemini: {
        enabled: !!process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-1.5-flash',
        apiKey: process.env.GEMINI_API_KEY,
        cost: '$0.075/1M tokens', // Very affordable
        rateLimit: 10000,
        priority: 4,
        tier: 'growth'
      },
      
      // SCALE TIER (Premium but powerful)
      openai: {
        enabled: !!process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini', // Cost-effective GPT-4 variant
        apiKey: process.env.OPENAI_API_KEY,
        cost: '$0.15/$0.60 per 1M tokens',
        rateLimit: 50000,
        priority: 5,
        tier: 'scale'
      },
      
      // ENTERPRISE TIER (Custom solutions)
      claude: {
        enabled: !!process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://api.anthropic.com/v1',
        model: 'claude-3-haiku-20240307',
        apiKey: process.env.ANTHROPIC_API_KEY,
        cost: '$0.25/$1.25 per 1M tokens',
        rateLimit: 100000,
        priority: 6,
        tier: 'enterprise'
      }
    };
    
    // Track usage for cost optimization
    this.usageTracker = {
      daily: {},
      monthly: {},
      costs: {}
    };
  }

  // Get available provider with highest priority
  getAvailableProvider() {
    const sortedProviders = Object.entries(this.providers)
      .filter(([_, config]) => config.enabled && config.apiKey)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    return sortedProviders.length > 0 ? sortedProviders[0] : null;
  }

  // Generate MCQ Questions
  async generateMCQ(options) {
    const {
      subject,
      chapter,
      topic,
      class: classNum,
      difficulty = 'medium',
      count = 5,
      language = 'bengali'
    } = options;

    const prompt = this.buildMCQPrompt({
      subject,
      chapter,
      topic,
      classNum,
      difficulty,
      count,
      language
    });

    try {
      const provider = this.getAvailableProvider();
      if (!provider) {
        throw new Error('No AI provider available. Please configure API keys.');
      }

      const [providerName, config] = provider;
      console.log(`Using AI provider: ${providerName} (${config.cost})`);

      const response = await this.callProvider(providerName, config, prompt);
      return this.parseMCQResponse(response, options);

    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error(`AI question generation failed: ${error.message}`);
    }
  }

  // Generate Creative Questions
  async generateCreativeQuestions(options) {
    const {
      subject,
      chapter,
      topic,
      class: classNum,
      difficulty = 'medium',
      count = 3,
      language = 'bengali'
    } = options;

    const prompt = this.buildCreativePrompt({
      subject,
      chapter,
      topic,
      classNum,
      difficulty,
      count,
      language
    });

    try {
      const provider = this.getAvailableProvider();
      if (!provider) {
        throw new Error('No AI provider available. Please configure API keys.');
      }

      const [providerName, config] = provider;
      const response = await this.callProvider(providerName, config, prompt);
      return this.parseCreativeResponse(response, options);

    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error(`AI question generation failed: ${error.message}`);
    }
  }

  // Call specific AI provider
  async callProvider(providerName, config, prompt) {
    switch (providerName) {
      case 'groq':
        return await this.callGroq(config, prompt);
      
      case 'openrouter':
        return await this.callOpenRouter(config, prompt);
      
      case 'huggingface':
        return await this.callHuggingFace(config, prompt);
      
      case 'gemini':
        return await this.callGemini(config, prompt);
      
      case 'openai':
        return await this.callOpenAI(config, prompt);
      
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  // Groq API call (FREE)
  async callGroq(config, prompt) {
    const response = await axios.post(
      `${config.baseURL}/chat/completions`,
      {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Bengali educator who creates high-quality educational questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  // OpenRouter API call (FREE tier available)
  async callOpenRouter(config, prompt) {
    const response = await axios.post(
      `${config.baseURL}/chat/completions`,
      {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Bengali educator who creates high-quality educational questions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gyanguru.com',
          'X-Title': 'GyanGuru Education Platform'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  // Build MCQ prompt
  buildMCQPrompt(options) {
    const { subject, chapter, topic, classNum, difficulty, count, language } = options;
    
    const mathematicalInstructions = subject.toLowerCase().includes('গণিত') || subject.toLowerCase().includes('math') || subject.toLowerCase().includes('physics') || subject.toLowerCase().includes('chemistry') ? `

বিশেষ নির্দেশনা (গণিত/বিজ্ঞানের জন্য):
- Mathematical expressions: x², x³, 3×10⁸, 2×10⁻⁶ format ব্যবহার করুন
- Fractions: ½, ¾, 3/4, (a+b)/c format ব্যবহার করুন  
- Square roots: √2, √(x+1), ∛8 format ব্যবহার করুন
- Powers: 2⁵, 10⁸, a^n, e^x format ব্যবহার করুন
- Greek letters: α (alpha), β (beta), π (pi), θ (theta), λ (lambda)
- Special symbols: ≤, ≥, ≠, ±, ∞, ∫, ∑, ∂
- Units: m/s², kg⋅m/s², °C, K, mol, A প্রভৃতি সঠিকভাবে লিখুন

উদাহরণ প্রশ্ন:
"আলোর বেগ কত?"
A) 3×10⁸ m/s
B) 3×10⁶ m/s  
C) 3×10¹⁰ m/s
D) 3×10⁷ m/s` : '';
    
    return `আপনি একজন অভিজ্ঞ শিক্ষক। নিম্নলিখিত তথ্যের ভিত্তিতে ${count}টি বহুনির্বাচনী প্রশ্ন তৈরি করুন:

বিষয়: ${subject}
অধ্যায়: ${chapter}
${topic ? `টপিক: ${topic}` : ''}
শ্রেণী: ${classNum}
কঠিনতা: ${difficulty}
ভাষা: ${language}${mathematicalInstructions}

প্রতিটি প্রশ্নের জন্য:
1. স্পষ্ট ও সহজবোধ্য প্রশ্ন
2. ৪টি বিকল্প উত্তর (A, B, C, D)
3. একটি সঠিক উত্তর
4. সংক্ষিপ্ত ব্যাখ্যা

JSON format এ উত্তর দিন (mathematical expressions সহ):
{
  "questions": [
    {
      "question": "প্রশ্নের টেক্সট",
      "latex": "\\text{LaTeX format (optional)}",
      "options": [
        { "text": "বিকল্প A", "isCorrect": false },
        { "text": "বিকল্প B", "isCorrect": true },
        { "text": "বিকল্প C", "isCorrect": false },
        { "text": "বিকল্প D", "isCorrect": false }
      ],
      "explanation": "সঠিক উত্তরের ব্যাখ্যা"
    }
  ]
}

উদাহরণ গণিত/বিজ্ঞানের প্রশ্ন:
{
  "question": "আলোর বেগ কত?",
  "latex": "c = 3 \\times 10^8 \\, \\text{m/s}",
  "options": [
    { "text": "3×10⁸ m/s", "isCorrect": true },
    { "text": "3×10⁶ m/s", "isCorrect": false }
  ]
}`;
  }

  // Build Creative Question prompt
  buildCreativePrompt(options) {
    const { subject, chapter, topic, classNum, difficulty, count, language } = options;
    
    return `আপনি একজন অভিজ্ঞ শিক্ষক। নিম্নলিখিত তথ্যের ভিত্তিতে ${count}টি সৃজনশীল প্রশ্ন তৈরি করুন:

বিষয়: ${subject}
অধ্যায়: ${chapter}
${topic ? `টপিক: ${topic}` : ''}
শ্রেণী: ${classNum}
কঠিনতা: ${difficulty}
ভাষা: ${language}

প্রতিটি প্রশ্নের জন্য:
1. একটি উদ্দীপক (গল্প/ঘটনা/তথ্য)
2. ৩-৪টি অংশে প্রশ্ন (ক, খ, গ, ঘ)
3. প্রতিটি অংশের নমুনা উত্তর
4. মানবণ্টন

JSON format এ উত্তর দিন:
{
  "questions": [
    {
      "stimulus": "উদ্দীপক টেক্সট",
      "question": "মূল প্রশ্নের বিষয়",
      "parts": [
        {
          "part": "ক",
          "question": "প্রশ্ন ক",
          "marks": 1,
          "answer": "নমুনা উত্তর"
        }
      ],
      "totalMarks": 10
    }
  ]
}`;
  }

  // Parse MCQ response
  parseMCQResponse(response, originalOptions) {
    try {
      // Clean response and extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return data.questions.map(q => ({
        title: q.question.substring(0, 100) + '...',
        type: 'mcq',
        subject: originalOptions.subject,
        chapter: originalOptions.chapter,
        topic: originalOptions.topic || '',
        class: originalOptions.classNum,
        difficulty: originalOptions.difficulty,
        marks: this.getMarksByDifficulty(originalOptions.difficulty),
        timeLimit: 2,
        question: {
          text: q.question,
          latex: q.latex || null // Store LaTeX if provided by AI
        },
        options: q.options,
        correctAnswer: {
          explanation: q.explanation || ''
        },
        source: 'ai_generated',
        aiGenerationDetails: {
          prompt: 'MCQ Generation',
          model: 'AI Assistant',
          generatedAt: new Date()
        }
      }));

    } catch (error) {
      console.error('Parse MCQ Error:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  // Parse Creative response
  parseCreativeResponse(response, originalOptions) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from AI');
      }

      const data = JSON.parse(jsonMatch[0]);
      
      return data.questions.map(q => ({
        title: q.question.substring(0, 100) + '...',
        type: 'cq',
        subject: originalOptions.subject,
        chapter: originalOptions.chapter,
        topic: originalOptions.topic || '',
        class: originalOptions.classNum,
        difficulty: originalOptions.difficulty,
        marks: q.totalMarks || 10,
        timeLimit: 20,
        question: {
          text: `উদ্দীপক: ${q.stimulus}\n\n${q.question}`
        },
        correctAnswer: {
          text: q.parts.map(p => `${p.part}) ${p.answer}`).join('\n'),
          keyPoints: q.parts.map(p => p.answer)
        },
        source: 'ai_generated',
        aiGenerationDetails: {
          prompt: 'Creative Question Generation',
          model: 'AI Assistant',
          generatedAt: new Date()
        }
      }));

    } catch (error) {
      console.error('Parse Creative Error:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  // Get marks by difficulty
  getMarksByDifficulty(difficulty) {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 2;
    }
  }

  // Check provider status
  async checkProviderStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(this.providers)) {
      status[name] = {
        enabled: config.enabled,
        hasApiKey: !!config.apiKey,
        cost: config.cost,
        priority: config.priority
      };
    }
    
    return status;
  }
}

module.exports = new AIQuestionGenerator();
