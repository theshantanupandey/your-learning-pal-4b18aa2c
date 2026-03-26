import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const { type, key } = await request.json();

    if (type === 'gemini') {
      if (!key) return Response.json({ success: false, error: 'No key provided' });

      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('Say "ok" in one word.');
      const text = result.response.text();

      return Response.json({ success: !!text });
    }

    return Response.json({ success: false, error: 'Unknown type' });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
}
