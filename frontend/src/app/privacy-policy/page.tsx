import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Social Selling',
  description: 'Privacy Policy for Social Selling platform - Instagram/Meta Platform Compliant',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl bg-white rounded-lg shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-sm text-gray-600 mb-8">Last Updated: November 3, 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Social Selling (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Social Selling platform. This Privacy Policy explains how we collect, use, and protect your information when you use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Account information (name, email, password)</li>
              <li>Instagram Business Account data (username, profile information)</li>
              <li>Content you create or share through our platform</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Instagram Data</h3>
            <p className="text-gray-700 mb-2">When you connect your Instagram Business Account, we access:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Profile information (username, profile picture, biography)</li>
              <li>Account statistics (followers, following, media count)</li>
              <li>Messages and comments (for management purposes)</li>
              <li>Content publish capabilities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Usage data and analytics</li>
              <li>Device information</li>
              <li>Log data and error reports</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 mb-2">We use your information to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Provide and maintain our service</li>
              <li>Manage your Instagram Business Account</li>
              <li>Process and respond to messages</li>
              <li>Publish content on your behalf</li>
              <li>Analyze and improve our service</li>
              <li>Send service-related notifications</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Instagram Data Usage</h2>
            <p className="text-gray-700 mb-2">We use Instagram data solely for:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Displaying your account information in our platform</li>
              <li>Managing messages and comments</li>
              <li>Publishing content as requested by you</li>
              <li>Providing analytics and insights</li>
            </ul>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-gray-800 font-semibold">We do NOT:</p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>Sell your Instagram data to third parties</li>
                <li>Use your data for advertising purposes</li>
                <li>Share your data without your consent (except as required by law)</li>
                <li>Make eligibility determinations based on platform data (e.g., housing, employment, or education)</li>
                <li>Facilitate surveillance through the use of platform data</li>
                <li>Sell, license, or purchase platform data</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Meta Platform Terms Compliance</h2>
            <p className="text-gray-700 mb-4">
              Social Selling uses the Instagram Graph API and complies with all Meta Platform Terms and Policies.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.1 Data Processing</h3>
            <p className="text-gray-700 mb-4">
              We process Instagram platform data exactly as described in this privacy policy and in accordance with all applicable laws, regulations, and Meta Terms. This privacy policy does not supersede, modify, or contradict Meta&apos;s Terms.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.2 Data Deletion Obligations</h3>
            <p className="text-gray-700 mb-2">We are required to delete Instagram platform data:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>When it is no longer needed for the purposes described in this policy</li>
              <li>When you request deletion of your data</li>
              <li>When Meta requests deletion on your behalf</li>
              <li>As required by applicable data protection laws</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">5.3 Policy Transparency</h3>
            <p className="text-gray-700 mb-4">
              This privacy policy is publicly accessible at a non-geoblocked URL that Meta can crawl. We retain all versions of this policy and will provide them to Meta upon request.
            </p>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
              <p className="text-gray-800 font-semibold">Data Deletion Request</p>
              <p className="text-gray-700 mt-2">
                To request deletion of your Instagram data, please visit our{' '}
                <a href="/data-deletion" className="text-blue-600 hover:underline font-semibold">
                  Data Deletion Instructions
                </a>{' '}
                page.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Sharing</h2>
            <p className="text-gray-700 mb-2">We may share your information:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>With service providers (hosting, analytics) under strict confidentiality</li>
              <li>When required by law or legal process</li>
              <li>To protect rights, safety, and security</li>
              <li>With your explicit consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Security</h2>
            <p className="text-gray-700 mb-2">We implement industry-standard security measures:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>Encrypted storage of OAuth tokens</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Account data: Retained while your account is active</li>
              <li>Instagram tokens: Retained until you disconnect your account</li>
              <li>Logs: Retained for 90 days</li>
              <li>Backup data: Retained for 30 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Your Rights</h2>
            <p className="text-gray-700 mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Disconnect your Instagram account</li>
              <li>Export your data</li>
              <li>Opt-out of non-essential communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Instagram Account Disconnection</h2>
            <p className="text-gray-700 mb-2">You can disconnect your Instagram account at any time:</p>
            <ol className="list-decimal pl-6 mb-4 text-gray-700">
              <li>Go to Settings → Instagram Accounts</li>
              <li>Click &quot;Disconnect&quot;</li>
              <li>All associated data will be deleted within 30 days</li>
            </ol>
            <p className="text-gray-700 mb-4">
              You can also revoke access directly from Instagram: Go to Instagram Settings → Security → Apps and Websites → Remove Social Selling
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Services</h2>
            <p className="text-gray-700 mb-2">We use:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li><strong>Facebook/Instagram Graph API:</strong> For Instagram integration</li>
              <li><strong>Cloud Hosting:</strong> For service infrastructure</li>
              <li><strong>Analytics:</strong> For service improvement</li>
            </ul>
            <p className="text-gray-700">Each service has its own privacy policy.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Children&apos;s Privacy</h2>
            <p className="text-gray-700">
              Our service is not intended for users under 18. We do not knowingly collect data from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to This Policy</h2>
            <p className="text-gray-700 mb-2">We may update this Privacy Policy. We will notify you of significant changes via:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Email notification</li>
              <li>In-app notification</li>
              <li>Notice on our website</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Us</h2>
            <p className="text-gray-700 mb-2">For privacy-related questions or requests:</p>
            <ul className="list-none pl-0 mb-4 text-gray-700">
              <li><strong>Email:</strong> privacy@app-socialselling.willianbvsanches.com</li>
              <li><strong>Website:</strong> <a href="https://app-socialselling.willianbvsanches.com" className="text-blue-600 hover:underline">https://app-socialselling.willianbvsanches.com</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Cookie Policy</h2>
            <p className="text-gray-700 mb-2">We use cookies for:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Authentication and session management</li>
              <li>Preferences and settings</li>
              <li>Analytics (with your consent)</li>
            </ul>
            <p className="text-gray-700">You can control cookies through your browser settings.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Data Breach Notification</h2>
            <p className="text-gray-700 mb-2">In case of a data breach, we will:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Notify affected users within 72 hours</li>
              <li>Report to relevant authorities as required</li>
              <li>Take immediate remediation actions</li>
            </ul>
          </section>

          <div className="border-t border-gray-300 pt-6 mt-8">
            <p className="text-sm text-gray-600">
              <strong>Effective Date:</strong> November 3, 2025
            </p>
            <p className="text-sm text-gray-600 mt-2">
              By using Social Selling, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
