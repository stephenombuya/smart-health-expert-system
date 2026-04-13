// src/pages/PrivacyPolicy.tsx

import { Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import { Shield, Lock, Eye, Trash2, Bell, Globe, UserCheck, Mail } from 'lucide-react'
import { PageLayout } from '@/components/layout/PageLayout'

const LAST_UPDATED = new Date().getFullYear()

export default function PrivacyPolicy() {
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
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold font-display">Privacy Policy</h1>
            </div>
            <p className="text-primary-300 text-lg font-body">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 font-body">

          {/* Intro */}
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
            SHES (Smart Health Expert System) is committed to protecting your privacy. This Privacy Policy 
            explains what information we collect, how we use it, and what rights you have over your data. 
            By using SHES, you agree to the practices described here.
          </p>

          {/* Quick summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: <Lock className="w-5 h-5" />, title: 'Your data is encrypted', desc: 'All health data is encrypted in transit and at rest.' },
              { icon: <Eye className="w-5 h-5" />, title: 'We never sell your data', desc: 'Your personal and health information is never sold to third parties.' },
              { icon: <Trash2 className="w-5 h-5" />, title: 'You can delete anytime', desc: 'Request full deletion of your data at any time.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-2">
                  {icon}
                  <p className="text-sm font-bold font-display">{title}</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>

          <Section number="1" title="Who We Are" icon={<Shield className="w-5 h-5" />}>
            <p>
              SHES is an AI-powered health information platform developed to support patients in Kenya and 
              beyond with symptom triage, medication management, chronic disease tracking, and mental health support. 
              For privacy-related enquiries, contact us at{' '}
              <a href="mailto:privacy@shes-platform.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                privacy@shes-platform.com
              </a>.
            </p>
          </Section>

          <Section number="2" title="What Information We Collect" icon={<Eye className="w-5 h-5" />}>
            <p className="mb-3">We collect the following categories of data:</p>

            <div className="space-y-3">
              {[
                {
                  label: 'Account Information',
                  detail: 'Name, email address, phone number, county, date of birth, and role (patient/doctor) provided during registration.',
                },
                {
                  label: 'Health Data',
                  detail: 'Symptoms, triage sessions, medications and dosages, glucose and blood pressure readings, mood entries, lab results, and any notes you add.',
                },
                {
                  label: 'Usage Data',
                  detail: 'Pages visited, features used, session duration, and interaction logs. This helps us improve the platform.',
                },
                {
                  label: 'Device & Technical Data',
                  detail: 'Browser type, operating system, IP address, and timezone. Used for security and performance monitoring.',
                },
                {
                  label: 'Communications',
                  detail: 'Messages sent to our support team and responses to feedback surveys.',
                },
              ].map(({ label, detail }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 shrink-0" />
                  <p><span className="font-semibold text-gray-800 dark:text-gray-200">{label}:</span> {detail}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section number="3" title="How We Use Your Information" icon={<UserCheck className="w-5 h-5" />}>
            <p className="mb-3">Your data is used to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Deliver personalised AI-powered health insights and recommendations.</li>
              <li>Enable symptom triage, medication tracking, and chronic condition monitoring.</li>
              <li>Send critical health alerts, medication reminders, and appointment notifications (based on your notification preferences).</li>
              <li>Improve the accuracy and safety of our AI models using anonymised, aggregated data.</li>
              <li>Maintain platform security, detect abuse, and comply with legal obligations.</li>
              <li>Provide customer support when you contact us.</li>
            </ul>
            <p className="mt-3">
              We do not use your identifiable health data to train third-party AI models without your explicit consent.
            </p>
          </Section>

          <Section number="4" title="Health Data — Special Category" icon={<Lock className="w-5 h-5" />}>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-amber-800 dark:text-amber-300">
                Health data is classified as sensitive personal data. We treat it with the highest level of care. 
                It is encrypted at rest using AES-256 and in transit via TLS 1.2+. Access is restricted to 
                authorised systems and personnel only. We retain health data for as long as your account is active, 
                or as required by applicable law.
              </p>
            </div>
          </Section>

          <Section number="5" title="Data Sharing" icon={<Globe className="w-5 h-5" />}>
            <p className="mb-3">We do not sell your personal data. We may share limited data only in these circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Service Providers:</span> trusted third-party providers (e.g. cloud hosting, email delivery) who process data on our behalf under strict data processing agreements.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Healthcare Professionals:</span> if you explicitly share your health summary with a doctor through the platform's doctor-patient feature.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Legal Requirements:</span> where required by Kenyan law, court order, or to protect the safety of users.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Business Transfers:</span> in the event of a merger or acquisition, your data may transfer to the new entity under the same privacy protections.</li>
            </ul>
          </Section>

          <Section number="6" title="Cookies and Tracking" icon={<Eye className="w-5 h-5" />}>
            <p>
              SHES uses essential cookies to maintain your session and authentication state. We do not use 
              advertising or third-party tracking cookies. You may disable cookies in your browser settings, 
              but this may affect platform functionality.
            </p>
          </Section>

          <Section number="7" title="Your Rights" icon={<UserCheck className="w-5 h-5" />}>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Access</span> a copy of all personal data we hold about you.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Correct</span> inaccurate or incomplete information via your profile settings.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Delete</span> your account and all associated data. Requests are processed within 30 days.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Export</span> your health data in PDF format from your profile.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Withdraw consent</span> for non-essential data processing at any time.</li>
              <li><span className="font-semibold text-gray-800 dark:text-gray-200">Opt out</span> of non-critical notifications via your notification settings.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact{' '}
              <a href="mailto:privacy@shes-platform.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                privacy@shes-platform.com
              </a>.
            </p>
          </Section>

          <Section number="8" title="Data Retention" icon={<Trash2 className="w-5 h-5" />}>
            <p>
              We retain your account and health data for as long as your account is active. If you delete your account, 
              we will remove your personal data within 30 days, except where retention is required by law (e.g. audit logs 
              may be retained for up to 12 months). Anonymised, aggregated data may be retained indefinitely for research purposes.
            </p>
          </Section>

          <Section number="9" title="Notifications and Communications" icon={<Bell className="w-5 h-5" />}>
            <p>
              We may send you health alerts, medication reminders, and platform updates via email, push notifications, 
              or SMS based on your notification preferences. Critical health alerts cannot be disabled as they are 
              essential to your safety. You can manage all other notification preferences in your account settings.
            </p>
          </Section>

          <Section number="10" title="Children's Privacy" icon={<Shield className="w-5 h-5" />}>
            <p>
              SHES is not intended for children under 13. We do not knowingly collect personal data from children 
              under 13 without verifiable parental consent. If you believe a child has provided us with personal data, 
              please contact us immediately and we will delete it.
            </p>
          </Section>

          <Section number="11" title="Changes to This Policy" icon={<Globe className="w-5 h-5" />}>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via 
              email or an in-app notification at least 14 days before the changes take effect. Your continued use 
              of SHES after the effective date constitutes acceptance of the updated policy.
            </p>
          </Section>

          {/* Contact */}
          <section className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="text-xl font-bold text-primary-900 dark:text-white font-display">12. Contact & Complaints</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              For privacy questions, data requests, or complaints:
            </p>
            <ul className="text-gray-600 dark:text-gray-400 space-y-1">
              <li>Email: <a href="mailto:privacy@shes-platform.com" className="text-primary-600 dark:text-primary-400 hover:underline">privacy@shes-platform.com</a></li>
              <li>Response time: within 5 business days</li>
              <li>You also have the right to lodge a complaint with the relevant data protection authority in your jurisdiction.</li>
            </ul>
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