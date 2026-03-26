import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `You are Taksh, an expert NCERT tutor for Indian students in Classes 6-10. You teach like the best school teachers in India — patient, encouraging, and thorough.

## Teaching Style:
- Explain concepts STEP BY STEP, never dump all information at once
- Use simple language mixed with Hindi words where natural (e.g., "Dekho, this is like...")
- Give real-life examples and analogies students can relate to
- After explaining a concept, ALWAYS ask "Samajh aaya? (Did you understand?)" or a checking question
- If a student says they don't understand, explain differently with a new analogy
- Be encouraging: "Bahut accha! (Very good!)", "Sahi jawab! (Correct answer!)"
- Keep responses focused — one concept at a time

## Rules:
- ONLY teach NCERT curriculum for Classes 6-10
- If asked about something outside NCERT, politely redirect
- Use markdown for formatting (bold, bullet points, etc.)
- When a student seems to have understood a topic, suggest: "Shall I create some flashcards to help you revise, or would you like a quiz to test your understanding?"
- At the end of a topic, summarize the key points

## Response Format:
- Keep responses concise but thorough (200-400 words max)
- Use **bold** for key terms
- Use numbered lists for steps
- Add emojis sparingly for engagement (🎯, ✅, 💡, 📝)`;

export async function POST(request) {
  try {
    const { message, history = [], topicContext } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      // Demo mode — return a simulated response
      return Response.json({
        response: getDemoResponse(message, topicContext),
        mode: 'demo',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build chat history
    const chatHistory = history.map(msg => ({
      role: msg.role === 'tutor' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const contextPrefix = topicContext
      ? `[Context: The student is studying ${topicContext.subject}, Class ${topicContext.classNumber}, Chapter: "${topicContext.chapterName}", Topic: "${topicContext.topicName}"]\n\n`
      : '';

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(contextPrefix + message);
    const response = result.response.text();

    return Response.json({ response, mode: 'ai' });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to get response', details: error.message },
      { status: 500 }
    );
  }
}

function getDemoResponse(message, topicContext) {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    return `Namaste! 🙏 Welcome to Taksh! I'm your personal NCERT tutor.

I'll teach you just like your favorite teacher would — step by step, with examples and fun explanations!

**What would you like to learn today?** Pick any topic from the syllabus on the left, or just tell me:
- 📚 Which class are you in?
- 📖 Which subject interests you?
- 🎯 Any specific chapter or concept?

Let's make learning fun! 🎓`;
  }

  if (topicContext) {
    return `Great choice! Let's learn about **"${topicContext.topicName}"** from ${topicContext.subject}, Class ${topicContext.classNumber} 📚

Let me explain this step by step:

**Step 1: Understanding the basics**
${topicContext.topicName} is a fundamental concept in this chapter. Think of it like this — imagine you're in your daily life...

💡 **Key Point:** The most important thing to remember here is that this concept connects to what you've already learned in previous topics.

**Step 2: Going deeper**
Now let's understand WHY this works the way it does...

📝 **Quick Check:** Can you tell me what you already know about ${topicContext.topicName}? This will help me explain it better!

_Samajh aaya? Tell me your thoughts and I'll explain more! 😊_

> ⚠️ **Note:** This is a demo response. Add your Gemini API key in \`.env.local\` for real AI tutoring!`;
  }

  return `That's a great question! 🎯

Let me break this down for you step by step. In NCERT, this concept is explained beautifully — let me add some real-life examples to make it clearer.

**The key idea is:** Every concept connects to something you already know from daily life.

💡 Would you like me to:
1. Explain this in more detail?
2. Give you a real-life example?
3. Create flashcards for revision?
4. Test you with a quick quiz?

_Just let me know! I'm here to help you understand completely. 😊_

> ⚠️ **Demo mode** — Add your Gemini API key for real tutoring!`;
}
