/**
 * SHES Health Assistant – Full Page Chat
 * Replaces the floating widget with a dedicated /chat route.
 * Features:
 *   • Full conversation history in a sidebar
 *   • Suggested questions for new users
 *   • Source citations from Kenya MOH guidelines
 *   • Clear conversation button
 *   • Language support (English + Swahili)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send, Trash2, Bot, User, Loader2,
  MessageSquare, ChevronRight, Globe,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/api/services'
import { useAuth } from '@/contexts/AuthContext'
import { Spinner } from '@/components/common'

// ─── Suggested questions ──────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = {
  en: [
    { category: "Malaria",      question: "What are the symptoms of malaria?" },
    { category: "Diabetes",     question: "My fasting glucose is 130 mg/dL. What does this mean?" },
    { category: "Hypertension", question: "What lifestyle changes help lower blood pressure?" },
    { category: "Nutrition",    question: "What foods should I avoid if I have diabetes?" },
    { category: "TB",           question: "How is tuberculosis treated in Kenya?" },
    { category: "Mental Health",question: "I have been feeling very low for 2 weeks. What should I do?" },
    { category: "Medications",  question: "Can I take ibuprofen with lisinopril?" },
    { category: "Lab Results",  question: "My HbA1c is 7.8%. Is that bad?" },
    { category: "Pregnancy",    question: "What vaccines do I need during pregnancy?" },
    { category: "Emergency",    question: "What are the warning signs of a stroke?" },
  ],
  sw: [
    { category: "Malaria",      question: "Dalili za malaria ni zipi?" },
    { category: "Kisukari",     question: "Sukari yangu ya damu ni 130 mg/dL. Inamaanisha nini?" },
    { category: "Shinikizo",    question: "Ninawezaje kupunguza shinikizo la damu?" },
    { category: "Lishe",        question: "Ni vyakula gani niepuke nikisukari?" },
    { category: "TB",           question: "Kifua kikuu hutibiwa vipi Kenya?" },
    { category: "Afya ya Akili",question: "Nimekuwa na huzuni sana kwa wiki 2. Nifanye nini?" },
    { category: "Dawa",         question: "Ninaweza kutumia ibuprofen na lisinopril pamoja?" },
    { category: "Maabara",      question: "HbA1c yangu ni 7.8%. Je, hiyo ni mbaya?" },
    { category: "Mimba",        question: "Chanjo gani ninahitaji wakati wa ujauzito?" },
    { category: "Dharura",      question: "Ishara za kiharusi ni zipi?" },
  ],
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:       'user' | 'assistant'
  content:    string
  sources?:   string[]
  timestamp?: string
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center
                       text-white text-xs font-bold font-display
                       ${isUser ? 'bg-primary-700' : 'bg-emerald-600'}`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`max-w-[70%] space-y-2`}>
        <div className={`rounded-2xl px-4 py-3 text-sm font-body leading-relaxed
                         whitespace-pre-wrap
                         ${isUser
                           ? 'bg-primary-800 text-white rounded-tr-sm'
                           : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm'
                         }`}>
          {msg.content}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="px-1">
            <p className="text-2xs text-gray-400 font-display mb-1">📚 Sources:</p>
            {msg.sources.map((s, i) => (
              <p key={i} className="text-2xs text-primary-600 font-body">· {s}</p>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {msg.timestamp && (
          <p className={`text-2xs text-gray-300 font-body px-1
                         ${isUser ? 'text-right' : ''}`}>
            {new Date(msg.timestamp).toLocaleTimeString('en-KE', {
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Suggested Question Card ──────────────────────────────────────────────────

function SuggestedQuestion({
  category, question, onClick,
}: { category: string; question: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-gray-100 bg-white
                 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150
                 group"
    >
      <p className="text-2xs text-primary-600 font-semibold font-display mb-0.5">{category}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-700 font-body leading-relaxed">{question}</p>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500 shrink-0 transition-colors" />
      </div>
    </button>
  )
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user }                   = useAuth()
  const qc                         = useQueryClient()
  const [messages, setMessages]    = useState<Message[]>([])
  const [input, setInput]          = useState('')
  const [lang, setLang]            = useState<'en' | 'sw'>('en')
  const [error, setError]          = useState('')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const bottomRef                  = useRef<HTMLDivElement>(null)
  const inputRef                   = useRef<HTMLTextAreaElement>(null)

  // Load history on mount
  useEffect(() => {
    if (historyLoaded) return
    setHistoryLoaded(true)
    chatApi.getHistory()
      .then(history => {
        if (history.length > 0) {
          setMessages(history.map(m => ({
            role:      m.role,
            content:   m.content,
            timestamp: m.created_at,
          })))
        } else {
          // Welcome message
          setMessages([{
            role: 'assistant',
            content: [
              "Habari! I'm SHES Assistant, your personal health advisor.",
              "I can answer health questions based on Kenya MOH guidelines,",
              "and I'll personalise my answers using your health data.",
              "",
              "You can ask me in English or Swahili. Try one of the suggested",
              "questions on the right, or type your own question below.",
              "",
              "⚕️ Note: I provide health information, not medical diagnoses.",
              "Always consult a qualified healthcare provider for personal advice.",
            ].join("\n"),
            timestamp: new Date().toISOString(),
          }])
        }
      })
      .catch(() => {})
  }, [historyLoaded])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   data.message,
        sources:   data.sources,
        timestamp: new Date().toISOString(),
      }])
      setError('')
    },
    onError: () => {
      setError('Failed to get a response. Please check your connection and try again.')
    },
  })

  const clearMutation = useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () => {
      setMessages([{
        role:    'assistant',
        content: 'Conversation cleared. How can I help you?',
        timestamp: new Date().toISOString(),
      }])
      setHistoryLoaded(false)
    },
  })

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sendMutation.isPending) return

    setMessages(prev => [...prev, {
      role:      'user',
      content:   msg,
      timestamp: new Date().toISOString(),
    }])
    setInput('')
    setError('')
    sendMutation.mutate(msg)

    // Focus input after sending
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [input, sendMutation])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = SUGGESTED_QUESTIONS[lang]
  const hasMessages  = messages.length > 1

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] gap-0 -mx-4 -my-6 sm:-mx-6 lg:-mx-8 overflow-hidden">

      {/* ── Main Chat Area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-surface-50">

        {/* Chat Header */}
        <div className="flex items-center justify-between px-5 py-3.5
                        bg-white border-b border-gray-100 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center
                             justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 font-display">
                SHES Health Assistant
              </p>
              <p className="text-2xs text-gray-400 font-body">
                Kenya MOH Guidelines · GPT-4o · {messages.length - 1} message{messages.length !== 2 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'sw' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         border border-gray-200 bg-white text-xs font-medium
                         text-gray-600 hover:bg-gray-50 transition-colors font-display"
              title="Switch language"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Kiswahili' : 'English'}
            </button>

            {/* Clear button */}
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || messages.length <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                         border border-gray-200 bg-white text-xs font-medium
                         text-gray-600 hover:bg-red-50 hover:text-red-600
                         hover:border-red-200 transition-colors disabled:opacity-40
                         disabled:cursor-not-allowed font-display"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} msg={msg} />
          ))}

          {/* Loading indicator */}
          {sendMutation.isPending && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-emerald-600 shrink-0
                               flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-100
                               shadow-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-xs text-gray-400 font-body">
                  Searching Kenya MOH guidelines…
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-xs text-red-700 font-body">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Disclaimer */}
        <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 shrink-0">
          <p className="text-2xs text-amber-700 font-body text-center">
            ⚕️ For informational guidance only. Not a substitute for professional medical advice.
            Always consult a qualified healthcare provider.
          </p>
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 bg-white border-t border-gray-100 shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                lang === 'en'
                  ? "Ask a health question in English or Swahili… (Enter to send)"
                  : "Uliza swali la afya kwa Kiswahili au Kiingereza… (Enter kutuma)"
              }
              rows={2}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3
                         text-sm font-body text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         focus:border-transparent max-h-32 overflow-y-auto"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sendMutation.isPending}
              className="w-11 h-11 rounded-xl bg-primary-800 flex items-center
                         justify-center text-white hover:bg-primary-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-2xs text-gray-400 font-body mt-2 text-center">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      </div>

      {/* ── Suggested Questions Sidebar ────────────────────────────────── */}
      <div className="w-72 shrink-0 bg-white border-l border-gray-100
                      flex flex-col overflow-hidden hidden lg:flex">
        <div className="px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-600" />
            <p className="text-xs font-semibold text-gray-900 font-display">
              Suggested Questions
            </p>
          </div>
          <p className="text-2xs text-gray-400 font-body mt-0.5">
            Click any question to ask it
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {suggestions.map((s, i) => (
            <SuggestedQuestion
              key={i}
              category={s.category}
              question={s.question}
              onClick={() => handleSend(s.question)}
            />
          ))}
        </div>

        {/* User health context reminder */}
        <div className="px-4 py-3 border-t border-gray-100 bg-primary-50">
          <p className="text-2xs text-primary-700 font-body leading-relaxed">
            <span className="font-semibold">Personalised for you.</span>{' '}
            SHES Assistant uses your health records to give contextual answers —
            glucose trends, BP history, medications, and more.
          </p>
        </div>
      </div>
    </div>
  )
}