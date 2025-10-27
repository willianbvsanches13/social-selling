import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions - Social Selling',
  description: 'Instructions for requesting data deletion from Social Selling',
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl bg-white rounded-lg shadow-lg p-8 md:p-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Deletion Instructions</h1>
        <p className="text-sm text-gray-600 mb-8">Social Selling - User Data Deletion Request</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Delete Your Data</h2>
            <p className="text-gray-700 mb-4">
              We respect your privacy and your right to control your data. You can request deletion of your data from Social Selling in multiple ways:
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 1: Delete from Within the App</h2>
            <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
              <li>Log in to your Social Selling account at <a href="https://app-socialselling.willianbvsanches.com" className="text-blue-600 hover:underline">app-socialselling.willianbvsanches.com</a></li>
              <li>Go to <strong>Settings</strong> → <strong>Account</strong></li>
              <li>Click on <strong>&quot;Delete Account&quot;</strong></li>
              <li>Confirm your deletion request</li>
              <li>Your account and all associated data will be permanently deleted within 30 days</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 2: Disconnect Instagram Account Only</h2>
            <p className="text-gray-700 mb-2">If you only want to disconnect your Instagram account without deleting your Social Selling account:</p>
            <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
              <li>Log in to your Social Selling account</li>
              <li>Go to <strong>Instagram Accounts</strong></li>
              <li>Click <strong>&quot;Disconnect&quot;</strong> on the account you want to remove</li>
              <li>Confirm the disconnection</li>
              <li>All Instagram-related data will be deleted within 30 days</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 3: Revoke Access from Instagram</h2>
            <p className="text-gray-700 mb-2">You can also revoke Social Selling&apos;s access directly from Instagram:</p>
            <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">
              <li>Open Instagram app or website</li>
              <li>Go to <strong>Settings</strong> → <strong>Security</strong></li>
              <li>Select <strong>Apps and Websites</strong></li>
              <li>Find <strong>&quot;Social Selling&quot;</strong> in the list</li>
              <li>Click <strong>Remove</strong></li>
              <li>This will immediately revoke our access to your Instagram data</li>
            </ol>
            <p className="text-gray-700 mt-4">
              Note: After revoking access from Instagram, you should also delete your data from our platform using Method 1 or 2.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Method 4: Email Request</h2>
            <p className="text-gray-700 mb-4">
              If you cannot access your account, you can request data deletion via email:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="text-gray-800">
                <strong>Email:</strong> <a href="mailto:privacy@app-socialselling.willianbvsanches.com" className="text-blue-600 hover:underline">privacy@app-socialselling.willianbvsanches.com</a>
              </p>
              <p className="text-gray-800 mt-2">
                <strong>Subject:</strong> Data Deletion Request
              </p>
              <p className="text-gray-800 mt-2">
                <strong>Include in your email:</strong>
              </p>
              <ul className="list-disc pl-6 mt-2 text-gray-700">
                <li>Your full name</li>
                <li>Email address associated with your account</li>
                <li>Instagram username (if applicable)</li>
                <li>Reason for deletion (optional)</li>
              </ul>
            </div>
            <p className="text-gray-700">
              We will process your request within <strong>30 days</strong> and send you a confirmation email once completed.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Data Will Be Deleted?</h2>
            <p className="text-gray-700 mb-2">When you request data deletion, the following information will be permanently removed:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Your account information (name, email, password)</li>
              <li>Instagram account connection data</li>
              <li>OAuth tokens and authentication data</li>
              <li>Messages and conversation history</li>
              <li>Published content metadata</li>
              <li>Usage analytics and logs</li>
              <li>Any other personal data associated with your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention Period</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="text-gray-800 font-semibold">Important:</p>
              <ul className="list-disc pl-6 text-gray-700 mt-2">
                <li>Active deletion takes up to <strong>30 days</strong> to complete</li>
                <li>Backup data will be deleted within <strong>90 days</strong></li>
                <li>Some data may be retained for legal compliance purposes</li>
                <li>Deletion is <strong>permanent and cannot be undone</strong></li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retained for Legal Compliance</h2>
            <p className="text-gray-700 mb-4">
              In accordance with legal requirements, we may retain certain data for a limited period:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Transaction records (for accounting purposes): 7 years</li>
              <li>Legal dispute-related data: Until resolution</li>
              <li>Security incident logs: 2 years</li>
            </ul>
            <p className="text-gray-700">
              This data is stored securely and used only for the specified legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Confirmation</h2>
            <p className="text-gray-700 mb-4">
              Once your data deletion request is completed, you will receive:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Email confirmation of deletion</li>
              <li>Reference number for your request</li>
              <li>Summary of deleted data categories</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions or Issues?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about data deletion or encounter any issues:
            </p>
            <ul className="list-none pl-0 mb-4 text-gray-700">
              <li><strong>Email:</strong> <a href="mailto:privacy@app-socialselling.willianbvsanches.com" className="text-blue-600 hover:underline">privacy@app-socialselling.willianbvsanches.com</a></li>
              <li><strong>Response Time:</strong> Within 48 hours</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Facebook/Instagram Users</h2>
            <p className="text-gray-700 mb-4">
              If you connected your Instagram account via Facebook Login, you can also manage your data through:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700">
              <li>Facebook Settings → Apps and Websites → Social Selling → Remove</li>
              <li>Instagram Settings → Security → Apps and Websites → Social Selling → Remove</li>
            </ul>
            <p className="text-gray-700">
              This will immediately revoke our access to your Facebook/Instagram data.
            </p>
          </section>

          <div className="border-t border-gray-300 pt-6 mt-8">
            <p className="text-sm text-gray-600">
              This data deletion policy is compliant with GDPR, CCPA, and other privacy regulations.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Last Updated:</strong> October 27, 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
