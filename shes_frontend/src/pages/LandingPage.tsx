/**
 * SHES Landing Page
 * Styled to match the LoginPage design system:
 *   - Colors  : primary-* Tailwind tokens (primary-900, primary-800, primary-700, primary-500, primary-400, primary-300)
 *   - Fonts   : font-display (headings) · font-body (body text)
 *   - Icons   : lucide-react
 *   - Router  : react-router-dom <Link>
 *   - Layout  : same panelled / card patterns as LoginPage
 */

// Ensure this Page has the light/dark toggle functionality implemented

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, Brain, MessageSquare, Activity, Star,
  Shield, Lock, Zap, Globe, ArrowRight, Menu, X, TrendingUp, Users,
  User, CheckCircle, ChevronRight,
} from 'lucide-react'

// ─── Utility ──────────────────────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible] as const
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ darkMode, toggleTheme }: { darkMode: boolean, toggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const links = ['Features', 'How It Works', 'Trust', 'Users']

  return (
    <nav className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled
        ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm border-b border-gray-100 dark:border-gray-800'
        : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-primary-900 dark:text-white text-lg font-display tracking-tight">
              SHES
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="text-sm font-medium font-body text-gray-600 dark:text-gray-300 hover:text-primary-700 dark:hover:text-primary-400 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="px-3 py-2 rounded-xl border border-primary-200 dark:border-gray-700 text-sm font-body text-gray-600 dark:text-gray-300 hover:text-primary-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {darkMode ? '🌙 Dark' : '☀️ Light'}
            </button>

            <Link
              to="/login"
              className="px-4 py-2 rounded-xl border border-primary-200 text-primary-800 text-sm font-semibold font-body hover:bg-primary-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-xl bg-primary-800 text-white text-sm font-semibold font-body shadow hover:bg-primary-700 hover:shadow-md transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            {links.map(l => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, '-')}`}
                className="block text-sm font-medium font-body text-gray-700 dark:text-gray-300 hover:text-primary-700 py-1"
                onClick={() => setOpen(false)}
              >
                {l}
              </a>
            ))}
            <button
              onClick={toggleTheme}
              className="w-full py-2.5 rounded-xl border border-primary-200 dark:border-gray-700 text-sm font-semibold font-body"
            >
              Toggle {darkMode ? 'Light' : 'Dark'} Mode
            </button>

            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 py-2.5 rounded-xl border border-primary-200 dark:border-gray-700 text-primary-800 dark:text-gray-300 text-sm font-semibold font-body text-center hover:bg-primary-50 dark:hover:bg-gray-800 transition">
                Sign In
              </Link>
              <Link to="/register" className="flex-1 py-2.5 rounded-xl bg-primary-800 text-white text-sm font-semibold font-body text-center hover:bg-primary-700 transition shadow">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

// ─── Chat Mockup ──────────────────────────────────────────────────────────────
function ChatMockup() {
  const messages = [
    { role: 'user', text: 'I have a headache and mild fever since yesterday.' },
    { role: 'ai',   text: 'This may indicate a viral infection. I recommend rest, hydration, and monitoring your temperature closely.' },
    { role: 'user', text: 'Should I be worried?' },
    { role: 'ai',   text: 'Not immediately. If fever exceeds 39 °C or symptoms worsen after 48 h, consult a physician.' },
  ]

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow */}
      <div className="absolute -inset-4 bg-primary-800/10 rounded-3xl blur-2xl pointer-events-none" />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header — matches login left-panel palette */}
        <div className="bg-primary-900 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm font-display">SHES Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-primary-400 text-xs font-body">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="p-4 space-y-3 bg-gray-50 dark:bg-gray-950 min-h-[260px]">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 shadow">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm font-body',
                m.role === 'user'
                  ? 'bg-primary-800 text-white rounded-tr-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-sm',
              )}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-800 flex items-center justify-center shadow">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 border border-gray-100 dark:border-gray-700 shadow-sm flex gap-1 items-center">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2">
          <input
            className="flex-1 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-600 dark:text-gray-200 outline-none focus:border-primary-400 transition-colors font-body"
            placeholder="Describe your symptoms…"
            readOnly
          />
          <button className="w-8 h-8 rounded-xl bg-primary-800 flex items-center justify-center shadow hover:bg-primary-700 transition-colors">
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-4 top-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 px-3 py-1.5 flex items-center gap-2 text-xs font-semibold font-body text-gray-700 dark:text-gray-300">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> AI Active
      </div>
      <div className="absolute -left-6 bottom-16 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 px-3 py-1.5 text-xs font-semibold font-body text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Shield className="w-3 h-3 text-primary-500" /> 256-bit Secure
      </div>
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-white dark:bg-gray-950">
      {/* Subtle background — mirrors login left-panel circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary-900/[0.04] dark:bg-primary-500/[0.03]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary-800/[0.03] dark:bg-primary-600/[0.02]" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-primary-600/[0.025] dark:bg-primary-400/[0.02]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-900/[0.06] border border-primary-900/10 text-primary-800 text-sm font-semibold font-body dark:text-gray-300 dark:bg-primary-500/[0.03] dark:border-primary-500/10">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              AI-Powered Healthcare Platform
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-primary-900 dark:text-white leading-[1.08] tracking-tight font-display">
              Your Smart<br />
              <span className="text-primary-500">Health Expert</span>
              <br />— Anytime, Anywhere
            </h1>

            <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-lg font-body">
              AI-powered health insights, symptom analysis, and personalised recommendations — making intelligent healthcare accessible to everyone.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary-800 text-white font-semibold text-base shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all duration-200 font-body"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/symptoms"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl border-2 border-primary-200 text-primary-800 font-semibold text-base hover:border-primary-400 hover:bg-primary-50 transition-all duration-200 font-body dark:text-gray-300 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-gray-800"
              >
                <Activity className="w-4 h-4" />
                Check Symptoms
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-10 pt-2">
              {[['98%', 'Accuracy Rate'], ['50K+', 'Users Helped'], ['24/7', 'AI Availability']].map(([v, l]) => (
                <div key={l}>
                  <p className="text-2xl font-bold text-primary-900 dark:text-white font-display">{v}</p>
                  <p className="text-sm text-gray-500 font-body">{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="flex justify-center lg:justify-end">
            <ChatMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  const [ref, visible] = useInView()

  const cards = [
    {
      Icon: Brain,
      title: 'AI Diagnosis',
      desc: 'Describe your symptoms and receive intelligent, evidence-based analysis powered by advanced AI models trained on medical data.',
      bg: 'bg-primary-900',
    },
    {
      Icon: MessageSquare,
      title: 'Health Chat Assistant',
      desc: 'Engage in natural conversation with your AI health assistant — ask questions, get clarifications, and receive guided support 24/7.',
      bg: 'bg-primary-800',
    },
    {
      Icon: Activity,
      title: 'Health Monitoring',
      desc: 'Track vitals, symptoms, and trends over time. Visualise your health journey with intuitive dashboards and actionable insights.',
      bg: 'bg-primary-700',
    },
    {
      Icon: Star,
      title: 'Smart Recommendations',
      desc: 'Receive personalised wellness tips, lifestyle recommendations, and preventative care guidance tailored to your health profile.',
      bg: 'bg-primary-600',
    },
  ]

  return (
    <section id="features" className="py-28 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-900/[0.06] text-primary-800 text-sm font-semibold font-body">
            Core Capabilities
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-900 dark:text-white tracking-tight font-display">
            Intelligent tools for<br />
            <span className="text-primary-500">better health</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-body">
            Everything you need to understand, manage, and improve your health — in one intelligent platform.
          </p>
        </div>

        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map(({ Icon: Ic, title, desc, bg }, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-pointer"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.5s ${i * 0.1}s, transform 0.5s ${i * 0.1}s`,
              }}
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4 shadow group-hover:scale-110 transition-transform duration-300', bg)}>
                <Ic className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-primary-900 dark:text-white text-base mb-2 font-display">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-body">{desc}</p>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-500 mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const [ref, visible] = useInView()

  const steps = [
    { n: '01', Icon: Activity,    title: 'Enter Your Symptoms',        desc: 'Describe how you feel in plain language. No medical jargon required.' },
    { n: '02', Icon: Brain,       title: 'AI Analyses Your Condition',  desc: 'Our AI processes your input against vast medical knowledge to identify patterns.' },
    { n: '03', Icon: Zap,         title: 'Get Insights',               desc: 'Receive clear, actionable health insights and personalised recommendations instantly.' },
    { n: '04', Icon: TrendingUp,  title: 'Track Over Time',            desc: 'Monitor your progress, log symptoms, and visualise trends to stay ahead of your health.' },
  ]

  return (
    <section id="how-it-works" className="py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-900/[0.06] text-primary-800 text-sm font-semibold font-body">
            Simple Process
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-900 dark:text-white tracking-tight font-display">
            How <span className="text-primary-500">SHES</span> works
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-body">Four simple steps from symptom to solution.</p>
        </div>

        {/* Connector */}
        <div ref={ref} className="relative">
          <div className="hidden lg:block absolute top-11 left-[12.5%] right-[12.5%] h-px bg-primary-100 dark:bg-gray-800" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ n, Icon: Ic, title, desc }, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(36px)',
                  transition: `opacity 0.6s ${i * 0.15}s, transform 0.6s ${i * 0.15}s`,
                }}
              >
                <div className="relative w-[88px] h-[88px] mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary-100 dark:bg-primary-900 animate-ping opacity-30" style={{ animationDuration: `${2.5 + i * 0.5}s` }} />
                  <div className="relative w-full h-full rounded-full bg-white dark:bg-gray-900 border-2 border-primary-200 dark:border-gray-700 shadow-md flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] font-bold text-primary-400 font-body">{n}</span>
                    <Ic className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                  </div>
                </div>
                <h3 className="font-bold text-primary-900 dark:text-white text-base mb-2 font-display">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-body">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Trust ────────────────────────────────────────────────────────────────────
function Trust() {
  const [ref, visible] = useInView()

  const items = [
    { Icon: Shield,       title: 'Data Privacy First',       desc: 'Your health data is yours. We employ strict data minimisation and never sell personal information.' },
    { Icon: Lock,         title: 'End-to-End Encrypted',     desc: 'All communications and stored data are protected with AES-256 and TLS 1.3 in transit.' },
    { Icon: Zap,          title: 'Reliable AI Insights',     desc: 'Built on peer-reviewed medical databases, continuously validated by healthcare professionals.' },
  ]

  const checks = [
    'HIPAA-aligned data practices',
    'Zero data sold to advertisers',
    'Open-source transparency',
    'Regular third-party security audits',
  ]

  return (
    <section id="trust" className="py-28 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Copy */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-900/[0.06] text-primary-800 text-sm font-semibold font-body">
              <Shield className="w-3.5 h-3.5" /> Security & Trust
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-900 dark:text-white tracking-tight leading-tight font-display">
              Your health data.<br />
              <span className="text-primary-500">Protected always.</span>
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-body">
              Privacy and security are foundational to everything we build at SHES — not afterthoughts.
            </p>
            <div className="space-y-3">
              {checks.map(t => (
                <div key={t} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3 h-3 text-primary-700 dark:text-primary-500" />
                  </div>
                  <span className="text-sm font-medium font-body">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cards — same style as login feature grid */}
          <div ref={ref} className="space-y-4">
            {items.map(({ Icon: Ic, title, desc }, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-primary-900/10 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-4 items-start"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(36px)',
                  transition: `opacity 0.5s ${i * 0.15}s, transform 0.5s ${i * 0.15}s`,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary-900/[0.06] flex items-center justify-center flex-shrink-0 border border-primary-900/10 dark:border-gray-700">
                  <Ic className="w-5 h-5 text-primary-700 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-bold text-primary-900 dark:text-white mb-1 font-display">{title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-body">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  const bars  = [60, 75, 55, 80, 70, 90, 65, 85, 72, 88, 76, 92]
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D']

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-primary-900/[0.06] rounded-3xl blur-2xl pointer-events-none" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden w-full max-w-lg">

        {/* Window chrome */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <p className="font-bold text-primary-900 dark:text-white text-sm font-display">Health Dashboard</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-body">Last 12 months overview</p>
          </div>
          <div className="flex gap-1.5">
            {['bg-red-400', 'bg-yellow-400', 'bg-green-400'].map((c, i) => (
              <div key={i} className={cn('w-3 h-3 rounded-full', c)} />
            ))}
          </div>
        </div>

        {/* Metrics — mirrors login feature mini-cards */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
          {[
            ['98.6 °F', 'Body Temp', 'text-primary-700', 'bg-primary-50 dark:bg-primary-900/20'],
            ['72 bpm',  'Heart Rate','text-primary-600', 'bg-primary-50/50 dark:bg-primary-900/10'],
            ['Good',    'AI Status', 'text-green-600',   'bg-green-50 dark:bg-green-900/20'],
          ].map(([v, l, tc, bg], i) => (
            <div key={i} className={cn('px-4 py-3 text-center', bg)}>
              <p className={cn('font-bold text-sm font-display', tc)}>{v}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-body">{l}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-body mb-4">Health Score Trend</p>
          <div className="flex items-end gap-1.5 h-28">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-primary-800 opacity-75 hover:opacity-100 transition-opacity"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-gray-300 dark:text-gray-600 font-body">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div className="px-5 pb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 font-body mb-3">Recent Symptoms Logged</p>
          {[
            ['Mild headache', '2 h ago',  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'],
            ['Fatigue',       '1 d ago',  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'],
            ['All clear',     '3 d ago',  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'],
          ].map(([s, t, c], i) => (
            <div key={i} className="flex items-center justify-between text-xs font-body">
              <span className="text-gray-700 dark:text-gray-300 font-medium">{s}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 dark:text-gray-500">{t}</span>
                <span className={cn('px-2 py-0.5 rounded-full font-semibold text-[10px]', c)}>
                  {s === 'All clear' ? '✓ Normal' : 'Logged'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Showcase ─────────────────────────────────────────────────────────────────
function Showcase() {
  const [active, setActive] = useState(0)

  const tabs = [
    { label: 'Symptom Checker', Icon: Activity },
    { label: 'AI Chat',         Icon: MessageSquare },
    { label: 'Dashboard',       Icon: TrendingUp },
  ]

  return (
    <section className="py-28 bg-primary-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-800 text-primary-300 text-sm font-semibold font-body border border-primary-700">
            Platform Preview
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-display">
            See SHES in action
          </h2>
          <p className="text-lg text-primary-400 max-w-xl mx-auto font-body">
            Intuitive interfaces designed to make health management effortless.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-primary-800/50 border border-primary-700 rounded-xl p-1 gap-1">
            {tabs.map(({ label, Icon: Ic }, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all duration-200',
                  active === i ? 'bg-primary-500 text-white shadow' : 'text-primary-400 hover:text-white',
                )}
              >
                <Ic className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div className="flex justify-center">
          {active === 0 && (
            <div className="w-full max-w-md bg-primary-800/50 rounded-2xl border border-primary-700 overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-primary-700">
                <p className="font-semibold text-white text-sm font-display flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-400" /> Symptom Checker
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-primary-400 block mb-2 font-body">What are you experiencing?</label>
                  <div className="flex flex-wrap gap-2">
                    {['Headache', 'Fever', 'Fatigue', 'Cough', 'Nausea', 'Chest pain'].map((s, i) => (
                      <span
                        key={i}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-semibold font-body cursor-pointer border transition-all',
                          i < 3
                            ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                            : 'bg-primary-800 border-primary-600 text-primary-400 hover:text-primary-200',
                        )}
                      >{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-primary-400 block mb-2 font-body">Duration</label>
                  <div className="flex gap-2">
                    {['< 1 day', '1–3 days', '1 week+'].map((d, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-semibold font-body text-center cursor-pointer border transition-all',
                          i === 1 ? 'bg-primary-500/20 border-primary-500 text-primary-300' : 'bg-primary-800 border-primary-600 text-primary-400',
                        )}
                      >{d}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                  <p className="text-xs text-primary-300 font-semibold mb-1 font-display flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> AI Analysis Ready
                  </p>
                  <p className="text-xs text-primary-400 leading-relaxed font-body">
                    3 possible conditions identified with high confidence. Tap below to view full report.
                  </p>
                </div>
                <Link
                  to="/symptoms"
                  className="block w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold font-body text-center hover:bg-primary-400 transition-colors shadow"
                >
                  Analyse Symptoms
                </Link>
              </div>
            </div>
          )}
          {active === 1 && <ChatMockup />}
          {active === 2 && <DashboardMockup />}
        </div>
      </div>
    </section>
  )
}

// ─── Target Users ─────────────────────────────────────────────────────────────
function TargetUsers() {
  const [ref, visible] = useInView()

  const users = [
    {
      Icon: User,
      title: 'Health-Conscious Individuals',
      desc: 'People who want to proactively manage their health, track wellness goals, and get instant answers anytime.',
    },
    {
      Icon: Heart,
      title: 'Patients Seeking Guidance',
      desc: 'Users experiencing symptoms who need quick, reliable health insights before visiting a clinic.',
    },
    {
      Icon: Users,
      title: 'Caregivers & Families',
      desc: 'Families managing health for children or elderly relatives who need continuous support and clarity.',
    },
    {
      Icon: Activity,
      title: 'Wellness Trackers',
      desc: 'Users focused on fitness, habits, and long-term wellness monitoring through AI insights.',
    },
  ]

  return (
    <section id="users" className="py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-900/[0.06] text-primary-800 dark:text-gray-300 text-sm font-semibold font-body">
            Built For Everyone
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-900 dark:text-white tracking-tight font-display">
            Who uses <span className="text-primary-500">SHES</span>?
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-body">
            Designed to serve anyone who cares about their health — from individuals to healthcare professionals.
          </p>
        </div>

        {/* Mirrors the login left-panel feature grid exactly */}
        <div ref={ref} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {users.map(({ Icon: Ic, title, desc }, i) => (
            <div
              key={i}
              className="bg-primary-800/[0.04] dark:bg-gray-800/40 rounded-xl p-5 border border-primary-900/[0.08] dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.5s ${i * 0.1}s, transform 0.5s ${i * 0.1}s`,
              }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary-900 flex items-center justify-center mb-4 shadow">
                <Ic className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-primary-900 dark:text-white font-display mb-1">{title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-body leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Mission ──────────────────────────────────────────────────────────────────
function Mission() {
  return (
    <section className="py-28 bg-primary-900 dark:bg-gray-950 relative overflow-hidden">
      {/* Background decoration — mirrors login left panel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary-800/60" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-primary-700/40" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-primary-600/20" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-800/80 text-primary-300 text-sm font-semibold font-body border border-primary-700">
          <Globe className="w-3.5 h-3.5" /> Our Mission
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Healthcare should be a right,<br />not a privilege.
        </h2>
        <p className="text-xl text-primary-300 leading-relaxed max-w-3xl mx-auto font-body">
          Across the world, millions of people lack access to timely, affordable healthcare guidance. SHES was built to change that — bringing the intelligence of an expert health system to anyone with a smartphone, regardless of geography, language, or economic status. We believe that access to smart health guidance can save lives, reduce suffering, and empower communities to take control of their well-being.
        </p>
        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto pt-4">
          {[
            ['4B+',  'People underserved globally'],
            ['70%',  'Reduction in unnecessary clinic visits'],
            ['147',  'Countries accessible'],
          ].map(([v, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-extrabold text-white font-display">{v}</p>
              <p className="text-primary-400 text-xs mt-1 leading-snug font-body">{l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-28 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="w-14 h-14 rounded-2xl bg-primary-800 flex items-center justify-center mx-auto shadow-xl">
          <Heart className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-primary-900 dark:text-white tracking-tight font-display">
          Start taking control of<br />
          <span className="text-primary-500">your health today</span>
        </h2>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-xl mx-auto font-body">
          Join thousands of people using SHES to understand their health better and make smarter wellness decisions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary-800 text-white font-bold text-lg shadow-xl hover:bg-primary-700 hover:shadow-2xl transition-all duration-200 font-body"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-body">Available worldwide</p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-primary-900 dark:bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-display">SHES</span>
            <span className="text-primary-500 text-sm ml-2 font-body">Smart Health Expert System</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-body">
            <Link
              to="/privacy"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Terms of Use
            </Link>
            <a
              href="mailto:support@shes-platform.com"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>

          <p className="text-xs text-primary-600 dark:text-gray-400 font-body">
            © {new Date().getFullYear()} SHES. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newMode = !prev
      localStorage.setItem('theme', newMode ? 'dark' : 'light')

      if (newMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

      return newMode
    })
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navbar darkMode={darkMode} toggleTheme={toggleTheme} />
      <Hero />
      <Features />
      <HowItWorks />
      <Trust />
      <Showcase />
      <TargetUsers />
      <Mission />
      <FinalCTA />
      <Footer />
    </div>
  )
}