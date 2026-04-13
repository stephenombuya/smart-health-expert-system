// src/pages/TermsOfUse.tsx

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Moon, FileText, AlertCircle, UserCheck, Scale, Shield, Gavel } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

const LAST_UPDATED = '1 April 2025'

export default function TermsOfUse() {
  const [dark, setDark] = useState(() =>
    localStorage.getItem('shes-dark') === '1'
  )

  const toggleDark = () => {
    const isDark = !dark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('shes-dark', isDark ? '1' : '0')
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* Header */}
        <div className="bg-primary-900 dark:bg-primary-950 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Top row — back link + toggle */}
            <div className="flex justify-between items-center mb-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-primary-300 hover:text-white transition-colors"
              >
                ← Back to Home
              </Link>
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-colors"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-700 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold font-display">Terms of Use</h1>
            </div>
            <p className="text-primary-300 text-lg font-body">Last updated: {LAST_UPDATED}</p>

          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 font-body">

          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
            These Terms of Use govern your access to and use of SHES (Smart Health Expert System), 
            operated by the SHES development team. By creating an account or using the platform, 
            you agree to these terms in full. If you do not agree, please do not use SHES.
          </p>

          {/* Medical disclaimer */}
          <section className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-red-800 dark:text-red-300 font-display mb-2">
                  Important: SHES is Not a Medical Provider
                </h2>
                <p className="text-red-700 dark:text-red-300 leading-relaxed">
                  SHES provides AI-generated health information for educational and informational purposes only. 
                  Nothing on this platform constitutes medical advice, a diagnosis, or a treatment plan. 
                  Always consult a qualified and licensed healthcare professional before making any health-related decisions. 
                  In case of a medical emergency, call your local emergency services immediately.
                </p>
              </div>
            </div>
          </section>

          <Section number="1" title="Eligibility" icon={<UserCheck className="w-5 h-5" />}>
            <p>
              You must be at least 18 years old to use SHES independently. Users under 18 may only 
              use the platform under the supervision of a parent or legal guardian who agrees to these terms 
              on their behalf. By using SHES, you confirm that you meet these requirements.
            </p>
          </Section>

          <Section number="2" title="Account Responsibilities" icon={<Shield className="w-5 h-5" />}>
            <p className="mb-3">You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Keeping your login credentials confidential and not sharing your account.</li>
              <li>All activity that occurs under your account.</li>
              <li>Providing accurate and truthful information when registering and using the platform.</li>
              <li>Notifying us immediately at <a href="mailto:support@shes-platform.com" className="text-primary-600 dark:text-primary-400 hover:underline">support@shes-platform.com</a> if you suspect unauthorised access to your account.</li>
            </ul>
          </Section>

          <Section number="3" title="Acceptable Use" icon={<Gavel className="w-5 h-5" />}>
            <p className="mb-3">You agree to use SHES only for its intended purpose. You must not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Attempt to manipulate, jailbreak, or exploit the AI system to generate harmful, misleading, or dangerous medical instructions.</li>
              <li>Submit false symptoms or fabricated medical data intended to deceive the system.</li>
              <li>Use the platform to diagnose, prescribe, or treat others without proper medical licensing.</li>
              <li>Scrape, reverse-engineer, or replicate any part of the platform without prior written permission.</li>
              <li>Use the platform for any unlawful purpose or in violation of any applicable local, national, or international law.</li>
            </ul>
          </Section>

          <Section number="4" title="AI-Generated Content" icon={<AlertCircle className="w-5 h-5" />}>
            <p className="mb-3">
              SHES uses large language models and rule-based systems to generate health information. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>AI outputs may be incomplete, inaccurate, or outdated.</li>
              <li>The platform does not have access to your full medical history unless you explicitly provide it.</li>
              <li>Responses should be verified with a licensed healthcare professional before acting on them.</li>
              <li>SHES does not replace clinical judgement, physical examination, or laboratory testing.</li>
            </ul>
          </Section>

          <Section number="5" title="Health Data and Privacy" icon={<Shield className="w-5 h-5" />}>
            <p>
              Any health data you submit — including symptoms, medications, lab results, and mood entries — 
              is processed to provide you with personalised health insights. We handle this data in accordance 
              with our <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</Link>. 
              You retain ownership of your health data and may request its deletion at any time.
            </p>
          </Section>

          <Section number="6" title="Limitation of Liability" icon={<Scale className="w-5 h-5" />}>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-amber-800 dark:text-amber-300">
                To the maximum extent permitted by law, SHES and its developers shall not be liable for any 
                direct, indirect, incidental, or consequential damages arising from your use of or reliance on 
                the platform, including but not limited to health outcomes resulting from AI-generated content. 
                Your use of SHES is entirely at your own risk.
              </p>
            </div>
          </Section>

          <Section number="7" title="Service Availability and Changes">
            <p>
              We strive to maintain platform availability but do not guarantee uninterrupted access. 
              We reserve the right to modify, suspend, or discontinue any part of SHES at any time, 
              with or without notice. We may also update these Terms periodically — continued use of the 
              platform after changes are posted constitutes acceptance of the revised terms.
            </p>
          </Section>

          <Section number="8" title="Intellectual Property">
            <p>
              All content, branding, software, algorithms, and design elements on SHES are the intellectual 
              property of the SHES development team unless otherwise stated. You may not copy, distribute, 
              or create derivative works from any part of the platform without prior written consent.
            </p>
          </Section>

          <Section number="9" title="Termination">
            <p>
              We reserve the right to suspend or permanently terminate your account if you violate these Terms, 
              engage in fraudulent activity, or pose a risk to other users or the integrity of the platform. 
              You may also delete your account at any time from your profile settings.
            </p>
          </Section>

          <Section number="10" title="Governing Law">
            <p>
              These Terms are governed by the laws of Kenya. Any disputes arising from the use of SHES 
              shall be subject to the jurisdiction of the courts of Kenya.
            </p>
          </Section>

          <section className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <h2 className="text-xl font-bold text-primary-900 dark:text-white font-display mb-3">11. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-400">
              For questions, complaints, or requests regarding these Terms, contact us at{' '}
              <a href="mailto:support@shes-platform.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                support@shes-platform.com
              </a>. We aim to respond within 5 business days.
            </p>
          </section>

        </div>
      </div>
    </PageLayout>
  )
}

function Section({
  number, title, icon, children,
}: {
  number: string
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className="text-primary-600 dark:text-primary-400">{icon}</span>
        )}
        <h2 className="text-xl font-bold text-primary-900 dark:text-white font-display">
          {number}. {title}
        </h2>
      </div>
      <div className="text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  )
}