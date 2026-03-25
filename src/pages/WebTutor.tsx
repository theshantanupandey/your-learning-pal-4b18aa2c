import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { Send, ArrowLeft, BookOpen, CheckCircle, XCircle, RefreshCw, Mic, Square } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { getGeminiKey } from '@/lib/apiKeys';

type Message = {
  role: 'user' | 'model';
  text: string;
  audioUrl?: string;
};

type Flashcard = {
  front: string;
  back: string;
};

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

export default function WebTutor() {
  const [classLevel, setClassLevel] = useState('10');
  const [subject, setSubject] = useState('Science');
  const [topic, setTopic] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          await sendAudioMessage(base64data, 'audio/webm', audioBlob);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
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
    setMessages(prev => [...prev, { role: 'user', text: '🎤 Audio message', audioUrl }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ 
        message: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ] 
      });
      handleResponse(response);
    } catch (error) {
      console.error("Error sending audio message:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error processing your audio. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, assessment]);

  const generateAssessmentTool: FunctionDeclaration = {
    name: 'generate_assessment',
    description: 'Generates flashcards and a multiple-choice quiz after a concept has been fully explained.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        flashcards: {
          type: Type.ARRAY,
          description: 'A list of 3-5 flashcards covering key terms and definitions.',
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'The term or question on the front of the card.' },
              back: { type: Type.STRING, description: 'The definition or answer on the back of the card.' }
            },
            required: ['front', 'back']
          }
        },
        quiz: {
          type: Type.ARRAY,
          description: 'A list of 3-5 multiple-choice questions to test understanding.',
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'The question text.' },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Exactly 4 possible options.'
              },
              correctAnswerIndex: { type: Type.INTEGER, description: 'The index (0-3) of the correct option.' },
              explanation: { type: Type.STRING, description: 'Explanation of why the answer is correct.' }
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation']
          }
        }
      },
      required: ['flashcards', 'quiz']
    }
  };

  const startTutor = async () => {
    if (!topic.trim()) return;
    setIsStarted(true);
    setIsLoading(true);

    const systemInstruction = `You are VidyAI, an expert NCERT tutor for Class 6-10 students in India.
You are currently teaching a Class ${classLevel} student about ${subject}, specifically the topic: "${topic}".
Your goal is to teach the concept conversationally, step-by-step.
1. Start by explaining the very first, most basic part of the concept simply. Use relatable analogies.
2. ALWAYS end your turn by asking a checking question like "Does this make sense?", "Can you give me an example?", or "What do you think happens next?".
3. Wait for the student's response. Do NOT explain the whole topic at once.
4. If they understand, praise them and move to the next part. If not, re-explain using a different analogy.
5. Once the FULL concept is explained and understood, you MUST call the \`generate_assessment\` tool to create flashcards and a short MCQ quiz.
6. After they complete the quiz, they will tell you their score. Review it, re-explain weak areas if needed, or conclude the topic.`;

    try {
      chatRef.current = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [generateAssessmentTool] }],
          temperature: 0.7,
        }
      });

      const response = await chatRef.current.sendMessage({ message: `Hi, I want to learn about ${topic}.` });
      
      handleResponse(response);
    } catch (error) {
      console.error("Error starting chat:", error);
      setMessages([{ role: 'model', text: 'Sorry, I encountered an error starting the session. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (response: any) => {
    let text = response.text || '';
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'generate_assessment') {
        const args = call.args as Assessment;
        setAssessment(args);
        text += "\\n\\n*I've generated some flashcards and a quiz for you below! Let me know how you do.*";
        
        // We need to send a tool response back to the model so it knows the tool was executed
        // But for simplicity in this UI, we'll just let the user interact with the UI and then send a normal message with their score.
      }
    }

    if (text) {
      setMessages(prev => [...prev, { role: 'model', text }]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatRef.current) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      handleResponse(response);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!assessment) return;
    setQuizSubmitted(true);
    
    let score = 0;
    assessment.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correctAnswerIndex) score++;
    });

    const total = assessment.quiz.length;
    const feedbackMsg = `I finished the quiz! I got ${score} out of ${total} correct.`;
    
    setMessages(prev => [...prev, { role: 'user', text: feedbackMsg }]);
    setIsLoading(true);
    
    try {
      const response = await chatRef.current.sendMessage({ message: feedbackMsg });
      handleResponse(response);
    } catch (error) {
      console.error("Error sending quiz results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <Link to="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Web Tutor setup</h1>
                <p className="text-slate-500">What would you like to learn today?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Class</label>
                  <select 
                    value={classLevel} 
                    onChange={e => setClassLevel(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {[6,7,8,9,10].map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Subject</label>
                  <select 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {['Science', 'Mathematics', 'Social Science', 'English'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Topic / Chapter</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., Photosynthesis, Trigonometry, French Revolution..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <button 
                onClick={startTutor}
                disabled={!topic.trim() || isLoading}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Start Learning'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="font-semibold text-slate-900">{topic}</h1>
              <p className="text-xs text-slate-500">Class {classLevel} • {subject}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span>VidyAI Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  <div className="space-y-2">
                    {msg.audioUrl && (
                      <audio controls src={msg.audioUrl} className="max-w-full h-10" />
                    )}
                    {msg.text !== '🎤 Audio message' && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    {msg.text === '🎤 Audio message' && !msg.audioUrl && <p className="whitespace-pre-wrap">{msg.text}</p>}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex space-x-2">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          )}

          {assessment && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h2 className="text-xl font-bold text-slate-900">Review & Practice</h2>
                <p className="text-slate-500 text-sm mt-1">Test your knowledge on what we just covered.</p>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Flashcards */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-blue-500" /> Flashcards
                  </h3>
                  
                  <div className="relative h-64 w-full perspective-1000">
                    <div 
                      className={`w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      {/* Front */}
                      <div className="absolute w-full h-full backface-hidden bg-blue-50 rounded-2xl border border-blue-100 p-8 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4">Term</span>
                        <p className="text-2xl font-medium text-blue-900">{assessment.flashcards[currentFlashcard].front}</p>
                        <p className="text-sm text-blue-500 mt-auto">Click to flip</p>
                      </div>
                      
                      {/* Back */}
                      <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Definition</span>
                        <p className="text-lg text-slate-700">{assessment.flashcards[currentFlashcard].back}</p>
                        <p className="text-sm text-slate-400 mt-auto">Click to flip back</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center px-4">
                    <button 
                      onClick={() => { setCurrentFlashcard(Math.max(0, currentFlashcard - 1)); setIsFlipped(false); }}
                      disabled={currentFlashcard === 0}
                      className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-medium text-slate-400">
                      {currentFlashcard + 1} / {assessment.flashcards.length}
                    </span>
                    <button 
                      onClick={() => { setCurrentFlashcard(Math.min(assessment.flashcards.length - 1, currentFlashcard + 1)); setIsFlipped(false); }}
                      disabled={currentFlashcard === assessment.flashcards.length - 1}
                      className="text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Quiz */}
                <div className="space-y-6">
                  <h3 className="font-semibold text-slate-800 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Quick Quiz
                  </h3>
                  
                  <div className="space-y-8">
                    {assessment.quiz.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3">
                        <p className="font-medium text-slate-800">{qIdx + 1}. {q.question}</p>
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = quizAnswers[qIdx] === oIdx;
                            const isCorrect = q.correctAnswerIndex === oIdx;
                            const showResult = quizSubmitted;
                            
                            let btnClass = "w-full text-left p-3 rounded-xl border text-sm transition-colors ";
                            
                            if (showResult) {
                              if (isCorrect) btnClass += "bg-green-50 border-green-200 text-green-800";
                              else if (isSelected && !isCorrect) btnClass += "bg-red-50 border-red-200 text-red-800";
                              else btnClass += "bg-white border-slate-200 text-slate-500 opacity-50";
                            } else {
                              if (isSelected) btnClass += "bg-blue-50 border-blue-300 text-blue-800";
                              else btnClass += "bg-white border-slate-200 text-slate-700 hover:bg-slate-50";
                            }

                            return (
                              <button
                                key={oIdx}
                                disabled={quizSubmitted}
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                className={btnClass}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{opt}</span>
                                  {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                                  {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
                            <span className="font-semibold text-slate-800">Explanation:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {!quizSubmitted && (
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(quizAnswers).length !== assessment.quiz.length || isLoading}
                      className="w-full py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Submit Answers
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={sendMessage} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your answer or ask a question..."
                disabled={isLoading || isRecording}
                className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isRecording}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`p-4 rounded-2xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-6 h-6" />}
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
