import '../App.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-[#052334] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">UniMind Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm md:text-base text-gray-200">
            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Introduction</h2>
              <p>
                UniMind ("we", "our", or "us") is committed to protecting your privacy and handling your
                personal information in accordance with the Privacy Act 1988 (Cth) and the Australian Privacy
                Principles. This policy explains how we collect, use, and store your information across the
                UniMind platform (web app and browser extension).
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Information We Collect</h2>
              <p>
                We collect information that you voluntarily provide when you create an account, enrol in courses,
                and use UniMind’s practice features. We also collect minimal technical data needed to operate the
                service.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-semibold">Account details:</span> email address and display name (and a password hash stored securely).
                </li>
                <li>
                  <span className="font-semibold">Course enrolments:</span> the courses you choose to join (e.g., COMP1511, COMP2521).
                </li>
                <li>
                  <span className="font-semibold">Practice & progress data:</span> question attempts (correct/incorrect, timestamp, time to answer),
                  topic progress, daily streaks, and per-question scheduling metrics (e.g., rolling accuracy and next-due times).
                </li>
                <li>
                  <span className="font-semibold">Extension settings (if installed):</span> your blocked sites list (sync storage), temporary
                  redirect information (the URL you chose to visit and a short-lived bypass timestamp), and a cached daily quote. We do not
                  read or store webpage content.
                </li>
                <li>
                  <span className="font-semibold">Technical logs:</span> standard server logs (e.g., timestamps, IP/user-agent at the infrastructure level)
                  to keep the service reliable and secure.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">How We Collect Your Information</h2>
              <p>
                Most information is provided directly by you through the UniMind web app or extension (e.g., account
                creation, course selection, practice activity). The extension only inspects destination URLs to check
                them against your block list; it does not read or capture page content.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Why We Collect Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To create and manage your account and enrolments.</li>
                <li>To deliver practice questions, track progress, and personalise scheduling.</li>
                <li>To operate the focus-check flow in the extension and return you to your original site after you answer.</li>
                <li>To maintain service security, reliability, and support.</li>
              </ul>
              <p>We do not use your information for other purposes without your consent.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">How We Store and Protect Your Information</h2>
              <p>
                Your data is stored securely. We take reasonable steps to protect personal information from misuse,
                loss, and unauthorised access, modification, or disclosure. Passwords are stored as hashed values.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Sharing of Information</h2>
              <p>
                We do not sell or rent your personal information. If we use third-party service providers (e.g.,
                managed email or hosting), they must meet privacy and security standards consistent with the Australian
                Privacy Principles.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Access and Correction</h2>
              <p>You may request to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access the personal information we hold about you;</li>
                <li>Correct any inaccurate or outdated information; and</li>
                <li>Delete your data (including course practice history) upon request.</li>
              </ul>
              <p>Please contact us using the details below.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide UniMind’s
                services. You can remove data (e.g., by unenrolling from a course) or request account deletion at any time.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy as UniMind evolves. Any updates will be posted on this page with a
                new effective date.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg md:text-xl font-semibold text-white">Contact Us</h2>
              <p>
                For questions or privacy requests, contact us at <span className="font-mono">parhamsepas@gmail.com</span>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

