import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { BookOpen, RefreshCw } from 'lucide-react';
import { getGeminiKey, getFishAudioKey, getFishVoiceId } from '@/lib/apiKeys';
import { synthesizeSpeech, playAudioBlob } from '@/lib/fishAudio';
import { saveLastSession } from '@/components/ProgressCard';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import FlashcardDeck from '@/components/FlashcardDeck';
import QuizPanel from '@/components/QuizPanel';
import { motion } from 'framer-motion';

type Message = {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
};

type Flashcard = { front: string; back: string };

type Question = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
};

type Assessment = {
  flashcards: Flashcard[];
  quiz: Question[];
};

const classes = [6, 7, 8, 9, 10];
const subjects = ['Science', 'Mathematics', 'Social Science', 'English'];

export default function WebTutor() {
  const [classLevel, setClassLevel] = useState('10');
  const [subject, setSubject] = useState('Science');
  const [topic, setTopic] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [assessment, setAssessment] = useState<Assessment | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, assessment]);

  const speakMessage = async (text: string) => {
    const fishKey = getFishAudioKey();
    const voiceId = getFishVoiceId();
    if (!fishKey || !voiceId) return;
    try {
      const blob = await synthesizeSpeech(text, voiceId, fishKey);
      await playAudioBlob(blob);
    } catch (err) {
      console.error('Fish Audio TTS error:', err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          await sendAudioMessage(base64data, 'audio/webm', audioBlob);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (base64Data: string, mimeType: string, audioBlob: Blob) => {
    if (isLoading || !chatRef.current) return;
    const audioUrl = URL.createObjectURL(audioBlob);
    setMessages((prev) => [...prev, { role: 'user', text: '🎤 Audio message', audioUrl }]);
    setIsLoading(true);
    try {
      const response = await chatRef.current.sendMessage({
        message: [{ inlineData: { data: base64Data, mimeType } }],
      });
      handleResponse(response);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, error processing audio.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAssessmentTool: FunctionDeclaration = {
    name: 'generate_assessment',
    description: 'Generates flashcards and a multiple-choice quiz after a concept has been fully explained.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        flashcards: {
          type: Type.ARRAY,
          description: 'A list of 3-5 flashcards.',
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Term or question.' },
              back: { type: Type.STRING, description: 'Definition or answer.' },
            },
            required: ['front', 'back'],
          },
        },
        quiz: {
          type: Type.ARRAY,
          description: 'A list of 3-5 MCQ questions.',
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswerIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
          },
        },
      },
      required: ['flashcards', 'quiz'],
    },
  };

  const startTutor = async () => {
    if (!topic.trim()) return;
    const apiKey = getGeminiKey();
    if (!apiKey) {
      alert('Please configure your Gemini API key first.');
      window.location.href = '/api';
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    setIsStarted(true);
    setIsLoading(true);
    saveLastSession({ topic, classLevel, subject });

    const systemInstruction = `You are VidyAI, an expert NCERT tutor for Class 6-10 students in India.
You are currently teaching a Class ${classLevel} student about ${subject}, specifically the topic: "${topic}".
Your goal is to teach the concept conversationally, step-by-step.
1. Start by explaining the very first, most basic part of the concept simply. Use relatable analogies.
2. ALWAYS end your turn by asking a checking question.
3. Wait for the student's response. Do NOT explain the whole topic at once.
4. If they understand, praise them and move to the next part. If not, re-explain differently.
5. Once the FULL concept is explained, call the \`generate_assessment\` tool.
6. After quiz, review score and conclude.`;

    try {
      chatRef.current = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [generateAssessmentTool] }],
          temperature: 0.7,
        },
      });
      const response = await chatRef.current.sendMessage({ message: `Hi, I want to learn about ${topic}.` });
      handleResponse(response);
    } catch {
      setMessages([{ role: 'model', text: 'Sorry, error starting session. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (response: any) => {
    let text = response.text || '';
    if (response.functionCalls?.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'generate_assessment') {
        setAssessment(call.args as Assessment);
        text += '\n\n*I\'ve prepared flashcards and a quiz for you below!*';
      }
    }
    if (text) {
      setMessages((prev) => [...prev, { role: 'model', text }]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);
    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      handleResponse(response);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: 'Sorry, an error occurred.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizSubmit = async (score: number, total: number) => {
    const feedbackMsg = `I finished the quiz! I got ${score} out of ${total} correct.`;
    setMessages((prev) => [...prev, { role: 'user', text: feedbackMsg }]);
    setIsLoading(true);
    try {
      const response = await chatRef.current.sendMessage({ message: feedbackMsg });
      handleResponse(response);
    } catch {}
    finally { setIsLoading(false); }
  };

  // ─── Setup Screen ───
  if (!isStarted) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border shadow-card p-8 space-y-8"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Start a lesson</h1>
              <p className="text-sm text-muted-foreground">What would you like to learn?</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Class pills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class</label>
              <div className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <button
                    key={c}
                    onClick={() => setClassLevel(String(c))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      classLevel === String(c)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Class {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject pills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSubject(s)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      subject === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Trigonometry..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <button
              onClick={startTutor}
              disabled={!topic.trim() || isLoading}
              className="w-full py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Start Learning'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Chat Screen ───
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Topic header */}
      <div className="px-6 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{topic}</h1>
            <p className="text-xs text-muted-foreground">Class {classLevel} · {subject}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Active
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4 pb-4">
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              role={msg.role}
              text={msg.text}
              audioUrl={msg.audioUrl}
              onSpeak={msg.role === 'model' ? () => speakMessage(msg.text) : undefined}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-card flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assessment */}
          {assessment && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-border shadow-card overflow-hidden mt-6"
            >
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Review & Practice</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Test your understanding</p>
              </div>

              <div className="p-6 space-y-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> Flashcards
                  </h3>
                  <FlashcardDeck cards={assessment.flashcards} />
                </div>

                <hr className="border-border" />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Quick Quiz</h3>
                  <QuizPanel
                    questions={assessment.quiz}
                    onSubmit={handleQuizSubmit}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={sendMessage}
        isLoading={isLoading}
        isRecording={isRecording}
        onToggleRecording={isRecording ? stopRecording : startRecording}
      />
    </div>
  );
}
