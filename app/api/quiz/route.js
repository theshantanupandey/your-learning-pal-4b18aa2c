import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
  try {
    const { action, topicContext, answers, questions } = await request.json();

    if (action === 'generate') {
      return await generateQuiz(topicContext);
    } else if (action === 'evaluate') {
      return await evaluateQuiz(questions, answers, topicContext);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Quiz API error:', error);
    return Response.json({ error: 'Quiz generation failed', details: error.message }, { status: 500 });
  }
}

async function generateQuiz(topicContext) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ questions: getDemoQuiz(topicContext), mode: 'demo' });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate exactly 5 multiple-choice questions for an NCERT student.

Topic: ${topicContext.topicName}
Chapter: ${topicContext.chapterName}
Subject: ${topicContext.subject}
Class: ${topicContext.classNumber}

Return ONLY a JSON array with this exact format, no other text:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Rules:
- Questions should test conceptual understanding, not just memorization
- Options should be plausible — avoid obviously wrong answers
- Mix difficulty: 2 easy, 2 medium, 1 hard
- Keep language simple for Indian students
- Explanations should be 1-2 sentences`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return Response.json({ questions: getDemoQuiz(topicContext), mode: 'fallback' });
  }

  const questions = JSON.parse(jsonMatch[0]);
  return Response.json({ questions, mode: 'ai' });
}

async function evaluateQuiz(questions, answers, topicContext) {
  let correct = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correct;
    if (isCorrect) correct++;
    return {
      question: q.question,
      studentAnswer: q.options[answers[i]],
      correctAnswer: q.options[q.correct],
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const weakAreas = results.filter(r => !r.isCorrect).map(r => r.question);

  let feedback = '';
  if (score >= 80) {
    feedback = '🎉 Excellent! You\'ve mastered this topic! Ready to move to the next one?';
  } else if (score >= 60) {
    feedback = '👍 Good effort! Let me re-explain the concepts you missed.';
  } else {
    feedback = '💪 Don\'t worry! Let\'s go through this topic again — I\'ll explain it differently this time.';
  }

  return Response.json({
    score,
    correct,
    total: questions.length,
    results,
    weakAreas,
    feedback,
    shouldReTeach: score < 70,
  });
}

function getDemoQuiz(topicContext) {
  const topic = topicContext?.topicName || 'General Science';
  return [
    {
      question: `Which of the following best describes ${topic}?`,
      options: [
        'A fundamental concept in this chapter',
        'An unrelated topic from mathematics',
        'Something not covered in NCERT',
        'A topic for higher classes only',
      ],
      correct: 0,
      explanation: `${topic} is indeed a fundamental concept covered in this NCERT chapter.`,
    },
    {
      question: `Why is understanding ${topic} important?`,
      options: [
        'It has no practical use',
        'It forms the basis for advanced topics',
        'It is only for exams',
        'Teachers like to ask about it',
      ],
      correct: 1,
      explanation: 'Understanding basic concepts helps build a strong foundation for advanced learning.',
    },
    {
      question: 'What is the best way to learn a new concept?',
      options: [
        'Memorize everything',
        'Skip to the next chapter',
        'Understand step by step with examples',
        'Only read the summary',
      ],
      correct: 2,
      explanation: 'Step-by-step understanding with real-life examples is the most effective learning method.',
    },
    {
      question: 'In NCERT, concepts are typically explained using:',
      options: [
        'Only formulas',
        'Only diagrams',
        'Activities, examples, and explanations',
        'Only Q&A at the end',
      ],
      correct: 2,
      explanation: 'NCERT books use a combination of activities, real-life examples, and detailed explanations.',
    },
    {
      question: 'After understanding a topic, what should you do?',
      options: [
        'Forget about it',
        'Move to a different subject',
        'Revise with flashcards and test with quizzes',
        'Read the next chapter without reviewing',
      ],
      correct: 2,
      explanation: 'Revision through flashcards and self-testing helps reinforce your understanding.',
    },
  ];
}
