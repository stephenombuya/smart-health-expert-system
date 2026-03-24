/**
 * SHES Health Assistant Chat Widget
 * Floating chat button + slide-up panel.
 * Powered by OpenAI GPT-4o + Kenya MOH guideline RAG.
 */
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Trash2, Bot, User } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '@/api/services'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export function ChatWidget() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError]       = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)
  const qc                      = useQueryClient()
  const hasLoaded               = useRef(false)

  // Load history on first open
  useEffect(() => {
    if (open && !hasLoaded.current) {
      hasLoaded.current = true
      chatApi.getHistory().then(history => {
        if (history.length > 0) {
          setMessages(history.map(m => ({ role: m.role, content: m.content })))
        } else {
          setMessages([{
            role:    'assistant',
            content: (
              'Hello! I am SHES Assistant, your personal health advisor powered by Kenya MOH guidelines. '
              + 'I can answer health questions in English or Swahili. '
              + 'How can I help you today?\n\n'
              + 'Habari! Mimi ni SHES Assistant, mshauri wako wa afya. '
              + 'Unaweza kuniuliza maswali ya afya kwa Kiingereza au Kiswahili.'
            ),
          }])
        }
      }).catch(() => {})
    }
  }, [open])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, sources: data.sources },
      ])
      setError('')
    },
    onError: () => {
      setError('Failed to get a response. Please try again.')
    },
  })

  const clearMutation = useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () => {
      setMessages([{
        role:    'assistant',
        content: 'Conversation cleared. How can I help you?',
      }])
      hasLoaded.current = false
    },
  })

  const handleSend = () => {
    const text = input.trim()
    if (!text || sendMutation.isPending) return

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    sendMutation.mutate(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-800 rounded-full
                   shadow-2xl flex items-center justify-center text-white
                   hover:bg-primary-700 transition-all duration-200
                   hover:scale-105 active:scale-95"
        aria-label="Open health assistant"
      >
        {open
          ? <X className="w-6 h-6" />
          : <MessageCircle className="w-6 h-6" />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[520px]
                        bg-white rounded-2xl shadow-2xl border border-gray-100
                        flex flex-col animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-primary-800 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold font-display">SHES Assistant</p>
                <p className="text-2xs text-primary-200 font-body">
                  Kenya MOH Guidelines
                </p>
              </div>
            </div>
            <button
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center
                                 justify-center text-white text-xs font-bold
                                 ${msg.role === 'user' ? 'bg-primary-600' : 'bg-emerald-600'}`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5" />
                    : <Bot className="w-3.5 h-3.5" />
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-body
                                 leading-relaxed whitespace-pre-wrap
                                 ${msg.role === 'user'
                                   ? 'bg-primary-800 text-white rounded-tr-sm'
                                   : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                                 }`}>
                  {msg.content}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200/50">
                      <p className="text-2xs text-gray-400 font-display mb-1">Sources:</p>
                      {msg.sources.map((s, i) => (
                        <p key={i} className="text-2xs text-gray-400 font-body">· {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {sendMutation.isPending && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 shrink-0
                                flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center font-body px-2">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-100">
            <p className="text-2xs text-amber-700 font-body text-center">
              For informational guidance only. Not a substitute for professional medical advice.
            </p>
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a health question…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2
                         text-xs font-body text-gray-900 placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         focus:border-transparent max-h-24 overflow-y-auto"
              style={{ minHeight: '36px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
              className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center
                         text-white hover:bg-primary-700 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}