import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
  try {
    const { topicContext, count = 6 } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ flashcards: getDemoFlashcards(topicContext), mode: 'demo' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Generate exactly ${count} flashcards for an NCERT student to revise.

Topic: ${topicContext.topicName}
Chapter: ${topicContext.chapterName}
Subject: ${topicContext.subject}
Class: ${topicContext.classNumber}

Return ONLY a JSON array, no other text:
[
  {
    "front": "Question or key term",
    "back": "Answer or definition (keep it concise, 1-3 sentences)",
    "difficulty": "easy|medium|hard"
  }
]

Rules:
- Mix of definitions, key facts, and conceptual questions
- Front side should be a clear question or "What is...?" format
- Back side should be concise but complete
- 2 easy, 2 medium, 2 hard
- Language should be simple for Indian students`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ flashcards: getDemoFlashcards(topicContext), mode: 'fallback' });
    }

    const flashcards = JSON.parse(jsonMatch[0]);
    return Response.json({ flashcards, mode: 'ai' });
  } catch (error) {
    console.error('Flashcard API error:', error);
    return Response.json({ error: 'Flashcard generation failed', details: error.message }, { status: 500 });
  }
}

function getDemoFlashcards(topicContext) {
  const topic = topicContext?.topicName || 'Science';
  return [
    { front: `What is ${topic}?`, back: `${topic} is a key concept in this NCERT chapter that helps us understand the world around us.`, difficulty: 'easy' },
    { front: `Why do we study ${topic}?`, back: `Studying ${topic} helps build a strong foundation and connects to real-life applications.`, difficulty: 'easy' },
    { front: `Give one real-life example of ${topic}.`, back: 'You can observe this concept in everyday activities — the textbook provides several examples.', difficulty: 'medium' },
    { front: 'What are the key steps to understand this concept?', back: '1. Read the basics 2. Understand with examples 3. Practice questions 4. Revise regularly', difficulty: 'medium' },
    { front: `How does ${topic} connect to the next topic?`, back: 'This concept forms the foundation — the next topic builds upon these fundamentals.', difficulty: 'hard' },
    { front: 'What is the most common mistake students make here?', back: 'Students often memorize instead of understanding. Focus on WHY and HOW, not just WHAT.', difficulty: 'hard' },
  ];
}
