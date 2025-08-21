const Question = require('../models/Question');
const { AIQuestionGenerator } = require('./aiQuestionGenerator');

class AutoGradingService {
  constructor() {
    this.aiService = new AIQuestionGenerator();
  }

  /**
   * Grade Multiple Choice Question
   */
  gradeMCQ(studentAnswer, correctAnswer, maxMarks, negativeMarkingConfig = null) {
    const isCorrect = studentAnswer.selectedOption === correctAnswer;
    
    if (isCorrect) {
      return {
        isCorrect: true,
        marksAwarded: maxMarks,
        confidence: 1.0,
        explanation: 'Correct answer selected'
      };
    } else {
      let marksAwarded = 0;
      
      // Apply negative marking if enabled
      if (negativeMarkingConfig && negativeMarkingConfig.enabled) {
        marksAwarded = -(maxMarks * negativeMarkingConfig.percentage / 100);
      }
      
      return {
        isCorrect: false,
        marksAwarded: Math.max(marksAwarded, -maxMarks), // Cap negative marks
        confidence: 1.0,
        explanation: `Incorrect. Correct answer: ${correctAnswer}`
      };
    }
  }

  /**
   * Grade True/False Question
   */
  gradeTrueFalse(studentAnswer, correctAnswer, maxMarks, negativeMarkingConfig = null) {
    return this.gradeMCQ(studentAnswer, correctAnswer, maxMarks, negativeMarkingConfig);
  }

  /**
   * Grade Fill in the Blanks Question
   */
  gradeFillInTheBlanks(studentAnswer, correctAnswers, maxMarks, partialMarkingEnabled = false) {
    const studentAnswers = studentAnswer.fillAnswers || [];
    let correctCount = 0;
    let totalBlanks = correctAnswers.length;
    const detailedResults = [];

    studentAnswers.forEach((answer, index) => {
      if (index < correctAnswers.length) {
        const isCorrect = this.compareTextAnswers(answer, correctAnswers[index]);
        if (isCorrect) {
          correctCount++;
        }
        
        detailedResults.push({
          index: index + 1,
          studentAnswer: answer,
          correctAnswer: correctAnswers[index],
          isCorrect
        });
      }
    });

    let marksAwarded = 0;
    let isCorrect = false;

    if (partialMarkingEnabled) {
      // Award partial marks based on correct answers
      marksAwarded = (correctCount / totalBlanks) * maxMarks;
      isCorrect = correctCount === totalBlanks;
    } else {
      // All or nothing marking
      isCorrect = correctCount === totalBlanks;
      marksAwarded = isCorrect ? maxMarks : 0;
    }

    return {
      isCorrect,
      marksAwarded: Math.round(marksAwarded * 100) / 100,
      confidence: 0.9,
      explanation: `${correctCount}/${totalBlanks} blanks filled correctly`,
      detailedResults,
      partialCredit: partialMarkingEnabled
    };
  }

  /**
   * Grade Short Answer Question using AI
   */
  async gradeShortAnswer(studentAnswer, questionData, maxMarks) {
    try {
      const prompt = this.buildShortAnswerGradingPrompt(
        questionData.questionText,
        questionData.correctAnswer,
        studentAnswer.textAnswer,
        maxMarks
      );

      const aiResponse = await this.aiService.generateResponse(prompt, 'groq');
      const gradingResult = this.parseAIGradingResponse(aiResponse);

      return {
        isCorrect: gradingResult.score >= 0.7,
        marksAwarded: Math.round(gradingResult.marksAwarded * 100) / 100,
        confidence: gradingResult.confidence,
        explanation: gradingResult.explanation,
        aiAnalysis: {
          keyPointsCovered: gradingResult.keyPoints,
          qualityScore: gradingResult.qualityScore,
          relevanceScore: gradingResult.relevanceScore
        }
      };
    } catch (error) {
      console.error('AI grading failed:', error);
      
      // Fallback to basic text similarity
      return this.gradeTextSimilarity(studentAnswer.textAnswer, questionData.correctAnswer, maxMarks);
    }
  }

  /**
   * Grade Mathematical Expression
   */
  gradeMathematical(studentAnswer, correctAnswer, maxMarks, tolerance = 0.001) {
    try {
      // For numerical answers
      if (typeof correctAnswer === 'number' || !isNaN(parseFloat(correctAnswer))) {
        const studentNum = parseFloat(studentAnswer.textAnswer);
        const correctNum = parseFloat(correctAnswer);
        
        if (isNaN(studentNum) || isNaN(correctNum)) {
          return {
            isCorrect: false,
            marksAwarded: 0,
            confidence: 0.9,
            explanation: 'Invalid numerical answer'
          };
        }
        
        const isCorrect = Math.abs(studentNum - correctNum) <= tolerance;
        
        return {
          isCorrect,
          marksAwarded: isCorrect ? maxMarks : 0,
          confidence: 0.95,
          explanation: isCorrect ? 'Numerical answer is correct' : `Expected: ${correctNum}, Got: ${studentNum}`
        };
      }
      
      // For algebraic expressions (basic string comparison for now)
      // TODO: Implement symbolic math evaluation
      const isCorrect = this.normalizeExpression(studentAnswer.textAnswer) === 
                       this.normalizeExpression(correctAnswer);
      
      return {
        isCorrect,
        marksAwarded: isCorrect ? maxMarks : 0,
        confidence: 0.8,
        explanation: isCorrect ? 'Expression matches' : 'Expression does not match expected answer'
      };
      
    } catch (error) {
      console.error('Mathematical grading error:', error);
      return {
        isCorrect: false,
        marksAwarded: 0,
        confidence: 0.1,
        explanation: 'Error in mathematical evaluation'
      };
    }
  }

  /**
   * Auto-grade a complete response
   */
  async gradeResponse(response, questionData, assessmentConfig) {
    const { questionType, maxMarks } = response;
    const { negativeMarking, partialMarking } = assessmentConfig;

    let gradingResult;

    switch (questionType) {
      case 'MCQ':
        gradingResult = this.gradeMCQ(
          response.answer, 
          questionData.correctAnswer, 
          maxMarks, 
          negativeMarking
        );
        break;

      case 'True/False':
        gradingResult = this.gradeTrueFalse(
          response.answer, 
          questionData.correctAnswer, 
          maxMarks, 
          negativeMarking
        );
        break;

      case 'Fill in the Blanks':
        gradingResult = this.gradeFillInTheBlanks(
          response.answer, 
          questionData.correctAnswer, 
          maxMarks, 
          partialMarking
        );
        break;

      case 'Short Answer':
        if (questionData.subject === 'Mathematics' || questionData.subject === 'Physics') {
          gradingResult = this.gradeMathematical(
            response.answer, 
            questionData.correctAnswer, 
            maxMarks
          );
        } else {
          gradingResult = await this.gradeShortAnswer(
            response.answer, 
            questionData, 
            maxMarks
          );
        }
        break;

      case 'Long Answer':
      case 'Essay':
        // These require manual grading or advanced AI
        gradingResult = {
          isCorrect: null,
          marksAwarded: 0,
          confidence: 0,
          explanation: 'Requires manual grading',
          needsManualGrading: true
        };
        break;

      default:
        gradingResult = {
          isCorrect: false,
          marksAwarded: 0,
          confidence: 0,
          explanation: 'Unknown question type'
        };
    }

    return gradingResult;
  }

  /**
   * Batch grade multiple responses
   */
  async batchGradeResponses(responses, questions, assessmentConfig) {
    const gradingResults = [];

    for (const response of responses) {
      const questionData = questions.find(q => q._id.toString() === response.questionId.toString());
      
      if (questionData) {
        const result = await this.gradeResponse(response, questionData, assessmentConfig);
        gradingResults.push({
          questionId: response.questionId,
          ...result
        });
      }
    }

    return gradingResults;
  }

  /**
   * Plagiarism detection for text answers
   */
  async detectPlagiarism(textAnswer, referenceSources = [], threshold = 0.8) {
    try {
      // Simple implementation - in production, use dedicated plagiarism detection APIs
      const similarities = [];
      
      for (const source of referenceSources) {
        const similarity = this.calculateTextSimilarity(textAnswer, source.text);
        if (similarity > threshold) {
          similarities.push({
            source: source.source,
            similarity,
            matchedText: this.findMatchingSegments(textAnswer, source.text)
          });
        }
      }

      return {
        isPlagiarized: similarities.length > 0,
        plagiarismScore: similarities.length > 0 ? Math.max(...similarities.map(s => s.similarity)) : 0,
        matches: similarities
      };
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      return {
        isPlagiarized: false,
        plagiarismScore: 0,
        matches: []
      };
    }
  }

  // Helper methods

  /**
   * Compare text answers with fuzzy matching
   */
  compareTextAnswers(answer1, answer2) {
    const normalized1 = this.normalizeText(answer1);
    const normalized2 = this.normalizeText(answer2);
    
    // Exact match
    if (normalized1 === normalized2) return true;
    
    // Fuzzy match (using Levenshtein distance)
    const similarity = this.calculateLevenshteinSimilarity(normalized1, normalized2);
    return similarity > 0.85; // 85% similarity threshold
  }

  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Normalize mathematical expressions
   */
  normalizeExpression(expression) {
    return expression
      .toLowerCase()
      .replace(/\s+/g, '') // Remove all spaces
      .replace(/\*+/g, '*') // Normalize multiplication
      .replace(/\++/g, '+') // Normalize addition
      .replace(/-+/g, '-'); // Normalize subtraction
  }

  /**
   * Calculate Levenshtein similarity
   */
  calculateLevenshteinSimilarity(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Build prompt for AI grading
   */
  buildShortAnswerGradingPrompt(questionText, correctAnswer, studentAnswer, maxMarks) {
    return `
      As an expert teacher, grade this student's answer:
      
      Question: ${questionText}
      Correct Answer: ${correctAnswer}
      Student Answer: ${studentAnswer}
      Max Marks: ${maxMarks}
      
      Evaluate the student's answer and respond in this JSON format:
      {
        "score": 0.8,
        "marksAwarded": 4,
        "confidence": 0.9,
        "explanation": "Good answer covering main points but missing some details",
        "keyPoints": ["point1", "point2"],
        "qualityScore": 0.8,
        "relevanceScore": 0.9
      }
      
      Score should be between 0-1, where 1 means perfect answer.
    `;
  }

  /**
   * Parse AI grading response
   */
  parseAIGradingResponse(aiResponse) {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      return {
        score: 0.5,
        marksAwarded: 0,
        confidence: 0.3,
        explanation: 'Could not parse AI response',
        keyPoints: [],
        qualityScore: 0.5,
        relevanceScore: 0.5
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        score: 0,
        marksAwarded: 0,
        confidence: 0.1,
        explanation: 'AI grading failed',
        keyPoints: [],
        qualityScore: 0,
        relevanceScore: 0
      };
    }
  }

  /**
   * Grade using basic text similarity (fallback)
   */
  gradeTextSimilarity(studentAnswer, correctAnswer, maxMarks) {
    const similarity = this.calculateTextSimilarity(studentAnswer, correctAnswer);
    const marksAwarded = similarity * maxMarks;
    
    return {
      isCorrect: similarity > 0.7,
      marksAwarded: Math.round(marksAwarded * 100) / 100,
      confidence: 0.6,
      explanation: `Text similarity: ${Math.round(similarity * 100)}%`
    };
  }

  /**
   * Calculate text similarity using cosine similarity
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = this.getWordFrequency(this.normalizeText(text1));
    const words2 = this.getWordFrequency(this.normalizeText(text2));
    
    const allWords = new Set([...Object.keys(words1), ...Object.keys(words2)]);
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (const word of allWords) {
      const freq1 = words1[word] || 0;
      const freq2 = words2[word] || 0;
      
      dotProduct += freq1 * freq2;
      norm1 += freq1 * freq1;
      norm2 += freq2 * freq2;
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Get word frequency map
   */
  getWordFrequency(text) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const frequency = {};
    
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
    
    return frequency;
  }

  /**
   * Find matching text segments
   */
  findMatchingSegments(text1, text2) {
    // Simple implementation - find common phrases
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const matches = [];
    
    for (let i = 0; i < words1.length - 2; i++) {
      const phrase = words1.slice(i, i + 3).join(' ');
      if (text2.includes(phrase)) {
        matches.push(phrase);
      }
    }
    
    return matches;
  }
}

module.exports = { AutoGradingService };
