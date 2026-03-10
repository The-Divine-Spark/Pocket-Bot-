'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Role = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
};

type EmotionLabel =
  | 'happy'
  | 'sad'
  | 'stressed'
  | 'angry'
  | 'confused'
  | 'excited'
  | 'lonely'
  | 'calm'
  | 'neutral';

type IntentLabel =
  | 'greeting'
  | 'gratitude'
  | 'acknowledgement'
  | 'agreement'
  | 'disagreement'
  | 'question'
  | 'advice'
  | 'emotional_support'
  | 'goal_setting'
  | 'casual_chat'
  | 'self_reflection'
  | 'productivity'
  | 'learning'
  | 'farewell';

type BrainAnalysis = {
  emotion: EmotionLabel;
  intent: IntentLabel;
  confidence: number;
  notes: string[];
  normalizedMessage: string;
};

type MemoryItem = {
  id: string;
  text: string;
  category: 'identity' | 'goal' | 'preference' | 'emotion_pattern' | 'life_detail';
  createdAt: string;
};

const CHAT_STORAGE_KEY = 'pocketbot-chat-history-v3';
const MEMORY_STORAGE_KEY = 'pocketbot-memory-v3';

const starterMessage: ChatMessage = {
  id: 'starter-assistant-message',
  role: 'assistant',
  content:
    "Hey — I'm PocketBot. I now have a stronger language brain, which means I can better understand common phrasing, emotional tone, short replies, and important things you tell me. Tell me what’s on your mind.",
  timestamp: new Date().toISOString(),
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cleanSpaces(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeForUnderstanding(input: string) {
  let text = input.toLowerCase();

  const replacements: Array<[RegExp, string]> = [
    [/\bi'm\b/g, 'i am'],
    [/\bi’ve\b/g, 'i have'],
    [/\bi've\b/g, 'i have'],
    [/\bi’ll\b/g, 'i will'],
    [/\bi'll\b/g, 'i will'],
    [/\bdon't\b/g, 'do not'],
    [/\bcan't\b/g, 'cannot'],
    [/\bwon't\b/g, 'will not'],
    [/\bit's\b/g, 'it is'],
    [/\bthat's\b/g, 'that is'],
    [/\bwhat's\b/g, 'what is'],
    [/\bthx\b/g, 'thanks'],
    [/\bty\b/g, 'thank you'],
    [/\bu\b/g, 'you'],
    [/\bur\b/g, 'your'],
    [/\byeah\b/g, 'yes'],
    [/\byep\b/g, 'yes'],
    [/\byup\b/g, 'yes'],
    [/\bnah\b/g, 'no'],
    [/\bnope\b/g, 'no'],
    [/\bokay\b/g, 'ok'],
    [/\bokayy+\b/g, 'ok'],
    [/\bokkk+\b/g, 'ok'],
    [/\bpls\b/g, 'please'],
    [/\bplz\b/g, 'please'],
    [/\bidk\b/g, 'i do not know'],
    [/\bimo\b/g, 'in my opinion'],
    [/\btbh\b/g, 'to be honest'],
    [/\bgonna\b/g, 'going to'],
    [/\bwanna\b/g, 'want to'],
    [/\bgotta\b/g, 'have to'],
    [/\bkinda\b/g, 'kind of'],
    [/\bsorta\b/g, 'sort of'],
    [/\blemme\b/g, 'let me'],
    [/\btho\b/g, 'though'],
    [/\bcuz\b/g, 'because'],
    [/\bcoz\b/g, 'because'],
    [/\bya\b/g, 'you'],
    [/[^\w\s!?.,']/g, ' '],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return cleanSpaces(text);
}

function detectEmotion(message: string): { emotion: EmotionLabel; score: number; notes: string[] } {
  const text = normalizeForUnderstanding(message);
  const notes: string[] = [];

  const emotionRules: Array<{
    emotion: EmotionLabel;
    phrases: string[];
    score: number;
    note: string;
  }> = [
    {
      emotion: 'stressed',
      phrases: [
        'stressed',
        'overwhelmed',
        'burned out',
        'too much',
        'pressure',
        'anxious',
        'panic',
        'freaking out',
        'i cannot handle this',
      ],
      score: 0.94,
      note: 'Detected stress or overwhelm.',
    },
    {
      emotion: 'sad',
      phrases: ['sad', 'down', 'hurt', 'depressed', 'hopeless', 'crying', 'empty', 'upset'],
      score: 0.93,
      note: 'Detected sadness-related language.',
    },
    {
      emotion: 'angry',
      phrases: ['angry', 'mad', 'furious', 'frustrated', 'annoyed', 'pissed', 'this sucks', 'hate this'],
      score: 0.91,
      note: 'Detected anger or frustration.',
    },
    {
      emotion: 'confused',
      phrases: ['confused', 'lost', 'unclear', 'not sure', 'i do not understand', 'what do i do'],
      score: 0.88,
      note: 'Detected confusion or uncertainty.',
    },
    {
      emotion: 'lonely',
      phrases: ['lonely', 'alone', 'isolated', 'left out', 'no one understands me'],
      score: 0.88,
      note: 'Detected loneliness.',
    },
    {
      emotion: 'excited',
      phrases: ['excited', 'hyped', 'pumped', 'thrilled', 'cannot wait', 'lets go', 'this is awesome'],
      score: 0.87,
      note: 'Detected excitement.',
    },
    {
      emotion: 'happy',
      phrases: ['happy', 'glad', 'great', 'good news', 'proud', 'thankful', 'feeling good'],
      score: 0.84,
      note: 'Detected positive emotion.',
    },
    {
      emotion: 'calm',
      phrases: ['calm', 'peaceful', 'doing okay', 'doing fine', 'all good', 'i am okay'],
      score: 0.76,
      note: 'Detected calm or steady tone.',
    },
  ];

  for (const rule of emotionRules) {
    if (includesAny(text, rule.phrases)) {
      notes.push(rule.note);
      return { emotion: rule.emotion, score: rule.score, notes };
    }
  }

  if (text.includes('!')) {
    notes.push('Exclamation suggests emotional energy.');
    return { emotion: 'excited', score: 0.62, notes };
  }

  if (includesAny(text, ['thanks', 'thank you', 'appreciate it'])) {
    notes.push('Gratitude suggests a positive tone.');
    return { emotion: 'happy', score: 0.64, notes };
  }

  notes.push('No strong emotion markers detected.');
  return { emotion: 'neutral', score: 0.55, notes };
}

function detectIntent(message: string, previousAssistantMessage?: string): { intent: IntentLabel; score: number; notes: string[] } {
  const text = normalizeForUnderstanding(message);
  const notes: string[] = [];
  const previous = normalizeForUnderstanding(previousAssistantMessage || '');

  if (includesAny(text, ['bye', 'goodbye', 'see you later', 'talk to you later'])) {
    notes.push('Detected farewell.');
    return { intent: 'farewell', score: 0.95, notes };
  }

  if (
    includesAny(text, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']) &&
    wordCount(text) <= 4
  ) {
    notes.push('Detected greeting.');
    return { intent: 'greeting', score: 0.97, notes };
  }

  if (includesAny(text, ['thanks', 'thank you', 'appreciate it', 'thank you so much'])) {
    notes.push('Detected gratitude.');
    return { intent: 'gratitude', score: 0.97, notes };
  }

  if (
    includesAny(text, ['that makes sense', 'got it', 'understood', 'nice to see you too', 'good to hear', 'cool', 'ok']) &&
    wordCount(text) <= 6
  ) {
    notes.push('Detected acknowledgement or short conversational reply.');
    return { intent: 'acknowledgement', score: 0.9, notes };
  }

  if (includesAny(text, ['yes', 'definitely', 'for sure', 'absolutely']) && wordCount(text) <= 5) {
    notes.push('Detected agreement.');
    return { intent: 'agreement', score: 0.89, notes };
  }

  if (includesAny(text, ['no', 'not really', 'i do not think so', 'no thanks']) && wordCount(text) <= 6) {
    notes.push('Detected disagreement or rejection.');
    return { intent: 'disagreement', score: 0.87, notes };
  }

  if (
    includesAny(text, ['how do i', 'how can i', 'what should i do', 'help me', 'give me steps', 'walk me through'])
  ) {
    notes.push('Detected request for help or guidance.');
    return { intent: 'advice', score: 0.94, notes };
  }

  if (
    includesAny(text, ['i feel', 'i am feeling', 'i am struggling', 'this is hard', 'i feel like i am failing'])
  ) {
    notes.push('Detected emotional support request.');
    return { intent: 'emotional_support', score: 0.94, notes };
  }

  if (includesAny(text, ['my goal is', 'i want to', 'i plan to', 'i need to improve', 'build a routine'])) {
    notes.push('Detected goal-setting language.');
    return { intent: 'goal_setting', score: 0.88, notes };
  }

  if (includesAny(text, ['study', 'learn', 'explain', 'teach me', 'understand'])) {
    notes.push('Detected learning intent.');
    return { intent: 'learning', score: 0.86, notes };
  }

  if (includesAny(text, ['productive', 'schedule', 'routine', 'organize', 'focus', 'time management'])) {
    notes.push('Detected productivity intent.');
    return { intent: 'productivity', score: 0.84, notes };
  }

  if (includesAny(text, ['i think', 'i wonder', 'about myself', 'my pattern', 'why am i like this'])) {
    notes.push('Detected self-reflection.');
    return { intent: 'self_reflection', score: 0.82, notes };
  }

  if (
    text.endsWith('?') ||
    includesAny(text, ['what', 'why', 'when', 'where', 'who', 'which', 'is it', 'can you', 'do you'])
  ) {
    notes.push('Detected direct question.');
    return { intent: 'question', score: 0.84, notes };
  }

  if (previous && wordCount(text) <= 5) {
    notes.push('Short reply interpreted using conversational context.');
    return { intent: 'acknowledgement', score: 0.7, notes };
  }

  notes.push('Defaulted to casual chat.');
  return { intent: 'casual_chat', score: 0.62, notes };
}

function analyzeMessage(message: string, previousAssistantMessage?: string): BrainAnalysis {
  const normalizedMessage = normalizeForUnderstanding(message);
  const emotionResult = detectEmotion(message);
  const intentResult = detectIntent(message, previousAssistantMessage);

  return {
    emotion: emotionResult.emotion,
    intent: intentResult.intent,
    confidence: Number(((emotionResult.score + intentResult.score) / 2).toFixed(2)),
    notes: [...emotionResult.notes, ...intentResult.notes],
    normalizedMessage,
  };
}

function extractMemory(message: string): MemoryItem[] {
  const text = message.trim();
  const lower = normalizeForUnderstanding(message);
  const memories: MemoryItem[] = [];

  const addMemory = (memoryText: string, category: MemoryItem['category']) => {
    memories.push({
      id: createId(),
      text: memoryText,
      category,
      createdAt: new Date().toISOString(),
    });
  };

  const nameMatch = text.match(/my name is ([A-Za-z]+(?:\s[A-Za-z]+)?)/i);
  if (nameMatch?.[1]) {
    addMemory(`User's name is ${nameMatch[1].trim()}.`, 'identity');
  }

  const goalMatch = text.match(/(?:my goal is|i want to|i plan to)\s+(.+)/i);
  if (goalMatch?.[1]) {
    addMemory(`User goal: ${goalMatch[1].trim()}`, 'goal');
  }

  const likeMatch = text.match(/i like\s+(.+)/i);
  if (likeMatch?.[1] && likeMatch[1].length < 120) {
    addMemory(`User likes ${likeMatch[1].trim()}.`, 'preference');
  }

  const identityMatch = text.match(/i am\s+(.+)/i);
  if (identityMatch?.[1] && identityMatch[1].length < 120) {
    const snippet = identityMatch[1].trim();
    if (
      snippet &&
      !includesAny(lower, [
        'i am feeling',
        'i am sad',
        'i am stressed',
        'i am angry',
        'i am confused',
        'i am overwhelmed',
      ])
    ) {
      addMemory(`User identity detail: ${snippet}.`, 'life_detail');
    }
  }

  if (includesAny(lower, ['i get anxious often', 'i am stressed a lot', 'i feel overwhelmed a lot'])) {
    addMemory('User may experience repeated stress or anxiety patterns.', 'emotion_pattern');
  }

  return memories;
}

function dedupeMemories(memories: MemoryItem[]) {
  const seen = new Set<string>();
  const result: MemoryItem[] = [];

  for (const memory of memories) {
    const key = `${memory.category}-${memory.text.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(memory);
    }
  }

  return result;
}

function getRelevantMemories(memories: MemoryItem[], message: string): MemoryItem[] {
  const lower = normalizeForUnderstanding(message);

  const scored = memories.map((memory) => {
    let score = 0;
    const memoryLower = memory.text.toLowerCase();

    const words = lower.split(/\s+/).filter(Boolean);
    for (const word of words) {
      if (word.length > 3 && memoryLower.includes(word)) {
        score += 1;
      }
    }

    if (includesAny(lower, ['goal', 'future', 'plan']) && memory.category === 'goal') score += 3;
    if (includesAny(lower, ['feel', 'emotion', 'stressed', 'sad']) && memory.category === 'emotion_pattern') score += 3;
    if (includesAny(lower, ['like', 'favorite', 'prefer']) && memory.category === 'preference') score += 3;

    return { memory, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.memory);
}

function getLastAssistantMessage(messages: ChatMessage[]) {
  const reversed = [...messages].reverse();
  return reversed.find((message) => message.role === 'assistant');
}

function buildSystemContext(analysis: BrainAnalysis, relevantMemories: MemoryItem[]) {
  const systemPersonality = [
    'You are PocketBot, a supportive and intelligent AI assistant.',
    'You should understand natural language, casual speech, short conversational replies, and emotional tone.',
    'Respond like a thoughtful human assistant, not like an echo bot.',
    'When users express emotion, acknowledge the feeling before advice.',
    'When the user gives a short social reply like thanks, cool, nice to see you too, or got it, answer naturally.',
    'Use memory when helpful, but do not sound creepy or overly repetitive.',
  ].join(' ');

  const analysisText = `Detected emotion: ${analysis.emotion}. Detected intent: ${analysis.intent}. Confidence: ${analysis.confidence}. Normalized message: ${analysis.normalizedMessage}.`;
  const notesText = analysis.notes.length ? `Brain notes: ${analysis.notes.join(' ')}` : '';
  const memoryText = relevantMemories.length
    ? `Relevant memories: ${relevantMemories.map((m) => m.text).join(' | ')}`
    : 'Relevant memories: none.';

  return `${systemPersonality} ${analysisText} ${notesText} ${memoryText}`;
}

function generateNaturalReply(
  userMessage: string,
  analysis: BrainAnalysis,
  relevantMemories: MemoryItem[],
  previousAssistantMessage?: string
) {
  const text = analysis.normalizedMessage;
  const previous = normalizeForUnderstanding(previousAssistantMessage || '');

  const shortMemoryLine =
    relevantMemories.length > 0
      ? ` I’m also keeping in mind that ${relevantMemories[0].text.charAt(0).toLowerCase()}${relevantMemories[0].text.slice(1)}`
      : '';

  if (analysis.intent === 'greeting') {
    return 'Hey — good to see you. What would you like to talk about today?';
  }

  if (analysis.intent === 'gratitude') {
    return 'Of course — happy to help.';
  }

  if (analysis.intent === 'farewell') {
    return 'See you later — come back anytime.';
  }

  if (analysis.intent === 'agreement') {
    return 'Nice — we’re on the same page.';
  }

  if (analysis.intent === 'disagreement') {
    return 'That’s totally fine. Tell me what direction you want to go instead.';
  }

  if (analysis.intent === 'acknowledgement') {
    if (includesAny(text, ['nice to see you too', 'good to see you too'])) {
      return 'Glad to hear that. What’s on your mind?';
    }

    if (includesAny(text, ['that makes sense', 'got it', 'understood'])) {
      return 'Good — want to keep going or try the next step?';
    }

    if (includesAny(text, ['cool', 'ok'])) {
      return 'Alright. Send me the next thing you want to improve.';
    }

    if (previous.includes('good to see you') || previous.includes('what would you like to talk about today')) {
      return 'Glad to hear that. What do you want PocketBot to help with?';
    }

    return 'Got it. Tell me a little more.';
  }

  if (analysis.intent === 'emotional_support') {
    const emotionalOpeners: Record<EmotionLabel, string> = {
      stressed: 'That sounds overwhelming.',
      sad: 'I’m sorry you’re dealing with that.',
      angry: 'That sounds really frustrating.',
      confused: 'That makes sense to feel confused.',
      lonely: 'That sounds lonely and heavy.',
      excited: 'That sounds intense in a good way.',
      happy: 'That’s good to hear.',
      calm: 'Glad things feel steady right now.',
      neutral: 'I’m here with you.',
    };

    return `${emotionalOpeners[analysis.emotion]} Tell me the hardest part first, and I’ll help you work through it.${shortMemoryLine}`;
  }

  if (analysis.intent === 'advice') {
    const emotionalPrefix =
      analysis.emotion === 'stressed'
        ? 'Let’s make this simpler.'
        : analysis.emotion === 'confused'
          ? 'Let’s clear it up step by step.'
          : 'I can help with that.';

    return `${emotionalPrefix} Send me a little more detail and I’ll break it into exact steps.${shortMemoryLine}`;
  }

  if (analysis.intent === 'goal_setting') {
    return `That’s a solid goal. The smartest move is to turn it into one clear next action instead of trying to do everything at once.${shortMemoryLine}`;
  }

  if (analysis.intent === 'learning') {
    return 'Absolutely. Send me the topic and I’ll explain it in simple terms first, then deeper if you want.';
  }

  if (analysis.intent === 'productivity') {
    return 'We can turn that into a routine, schedule, or checklist. Tell me which one you want.';
  }

  if (analysis.intent === 'self_reflection') {
    return `That’s worth looking at closely. We can figure out the pattern together instead of guessing.${shortMemoryLine}`;
  }

  if (analysis.intent === 'question') {
    return 'Ask the full question and I’ll give you the clearest answer I can.';
  }

  return 'Tell me a little more so I can respond in a smarter and more tailored way.';
}

async function getAssistantReply(
  userMessage: string,
  messages: ChatMessage[],
  analysis: BrainAnalysis,
  relevantMemories: MemoryItem[],
  previousAssistantMessage?: string
) {
  const systemContext = buildSystemContext(analysis, relevantMemories);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        systemContext,
        analysis,
        relevantMemories,
        messages: messages.slice(-10),
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as { reply?: string };

    if (!data.reply || typeof data.reply !== 'string') {
      throw new Error('API reply missing');
    }

    return data.reply;
  } catch {
    return generateNaturalReply(userMessage, analysis, relevantMemories, previousAssistantMessage);
  }
}

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<BrainAnalysis | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedMessages = loadFromStorage<ChatMessage[]>(CHAT_STORAGE_KEY, [starterMessage]);
    const savedMemories = loadFromStorage<MemoryItem[]>(MEMORY_STORAGE_KEY, []);

    setMessages(savedMessages.length ? savedMessages : [starterMessage]);
    setMemories(savedMemories);
  }, []);

  useEffect(() => {
    saveToStorage(CHAT_STORAGE_KEY, messages);
  }, [messages]);

  useEffect(() => {
    saveToStorage(MEMORY_STORAGE_KEY, memories);
  }, [memories]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const memorySummary = useMemo(() => {
    const goals = memories.filter((m) => m.category === 'goal').length;
    const preferences = memories.filter((m) => m.category === 'preference').length;
    const identity = memories.filter((m) => m.category === 'identity' || m.category === 'life_detail').length;
    const emotions = memories.filter((m) => m.category === 'emotion_pattern').length;

    return { goals, preferences, identity, emotions };
  }, [memories]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const previousAssistant = getLastAssistantMessage(messages);

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    const analysis = analyzeMessage(trimmed, previousAssistant?.content);
    setLastAnalysis(analysis);

    const newMemories = extractMemory(trimmed);
    const mergedMemories = dedupeMemories([...memories, ...newMemories]);
    setMemories(mergedMemories);

    const relevantMemories = getRelevantMemories(mergedMemories, trimmed);

    const reply = await getAssistantReply(
      trimmed,
      nextMessages,
      analysis,
      relevantMemories,
      previousAssistant?.content
    );

    const assistantMessage: ChatMessage = {
      id: createId(),
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }

  function clearConversation() {
    const resetMessages = [starterMessage];
    setMessages(resetMessages);
    setMemories([]);
    setLastAnalysis(null);
    saveToStorage(CHAT_STORAGE_KEY, resetMessages);
    saveToStorage(MEMORY_STORAGE_KEY, []);
  }

  return (
    <main
      style={{
  minHeight: '100vh',
  background: '#120f24',
  color: '#f5f7fb',
  padding: '32px 16px',
  fontFamily: 'Arial, Helvetica, sans-serif',
}}

    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.4fr 0.8fr',
          gap: 20,
        }}
      >
        <section
          style={{
            background: '#1a1638',
            border: '1px solid #3a2f68',
            borderRadius: 18,
            padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>PocketBot</h1>
              <p style={{ margin: '6px 0 0', color: '#aab6da' }}>
                Brain upgrade: natural language understanding, emotional detection, memory, and smarter replies.
              </p>
            </div>

            <button
              onClick={clearConversation}
              style={{
                background: '#202b52',
                color: '#ffffff',
                border: '1px solid #32406f',
                borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Clear Memory
            </button>
          </div>

          <div
            style={{
              height: 520,
              overflowY: 'auto',
              background: '#15122e',
              border: '1px solid #352b60',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '12px 14px',
                    borderRadius: 14,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    background: message.role === 'user' ? '#7a6dff' : '#241d4d',
                    border: message.role === 'user' ? '1px solid #9a90ff' : '1px solid #43387a',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      marginBottom: 6,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {message.role === 'user' ? 'You' : 'PocketBot'}
                  </div>
                  {message.content}
                </div>
              </div>
            ))}

            {isLoading && <div style={{ color: '#beb6e8', padding: '8px 2px' }}>PocketBot is thinking...</div>}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid #2a3764',
                background: '#0e1530',
                color: '#ffffff',
                fontSize: 16,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                minWidth: 120,
                borderRadius: 12,
                border: 'none',
                background: isLoading ? '#6a628f' : '#8a78ff',
                color: '#ffffff',
                fontWeight: 800,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                padding: '0 16px',
              }}
            >
              {isLoading ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </section>

        <aside
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <div
            style={{
              background: '#121933',
              border: '1px solid #243055',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Brain Status</h2>

            {lastAnalysis ? (
              <div style={{ color: '#dce4ff', lineHeight: 1.6 }}>
                <div><strong>Emotion:</strong> {lastAnalysis.emotion}</div>
                <div><strong>Intent:</strong> {lastAnalysis.intent}</div>
                <div><strong>Confidence:</strong> {lastAnalysis.confidence}</div>
                <div><strong>Normalized:</strong> {lastAnalysis.normalizedMessage}</div>

                <div style={{ marginTop: 10 }}>
                  <strong>Notes:</strong>
                  <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                    {lastAnalysis.notes.map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p style={{ color: '#aab6da', margin: 0 }}>
                Send a message and PocketBot will analyze language, emotion, and intent here.
              </p>
            )}
          </div>

          <div
            style={{
              background: '#121933',
              border: '1px solid #243055',
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 22 }}>Memory System</h2>

            <div style={{ color: '#dce4ff', lineHeight: 1.7, marginBottom: 12 }}>
              <div><strong>Total memories:</strong> {memories.length}</div>
              <div><strong>Identity:</strong> {memorySummary.identity}</div>
              <div><strong>Goals:</strong> {memorySummary.goals}</div>
              <div><strong>Preferences:</strong> {memorySummary.preferences}</div>
              <div><strong>Emotion patterns:</strong> {memorySummary.emotions}</div>
            </div>

            <div
              style={{
                maxHeight: 260,
                overflowY: 'auto',
                border: '1px solid #22305a',
                borderRadius: 12,
                padding: 12,
                background: '#0e1530',
              }}
            >
              {memories.length === 0 ? (
                <p style={{ margin: 0, color: '#aab6da' }}>No memories stored yet.</p>
              ) : (
                memories
                  .slice()
                  .reverse()
                  .map((memory) => (
                    <div
                      key={memory.id}
                      style={{
                        borderBottom: '1px solid #1f294b',
                        paddingBottom: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: '#86a0ff',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        {memory.category}
                      </div>
                      <div style={{ color: '#f5f7fb', marginTop: 4 }}>{memory.text}</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

