import { Shield, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        </div>

        <Card>
          <CardContent className="pt-6 prose dark:prose-invert max-w-none">
            <p className="text-muted-foreground text-sm">Effective Date: January 15, 2026</p>
            <p className="text-muted-foreground text-sm mb-6">Last Updated: January 15, 2026</p>

            <p className="lead">
              Rizko.ai ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social media analytics platform and services.
            </p>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg my-6">
              <p className="text-sm m-0"><strong>Summary:</strong> We only access data you explicitly authorize through OAuth. We never post on your behalf, sell your data, or share it with advertisers. You can disconnect your accounts and delete your data at any time.</p>
            </div>

            <h2>1. Information We Collect</h2>

            <h3>1.1 Information You Provide Directly</h3>
            <ul>
              <li><strong>Account Information:</strong> Email address, name, and password when you create an account</li>
              <li><strong>Profile Information:</strong> Optional profile details you choose to provide</li>
              <li><strong>Communications:</strong> Information you provide when contacting our support team</li>
              <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store full card numbers)</li>
            </ul>

            <h3>1.2 Information from Connected Social Media Accounts</h3>
            <p>When you connect your social media accounts via OAuth, we access only the following data with your explicit consent:</p>

            <table className="w-full border-collapse my-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Platform</th>
                  <th className="text-left py-2">Data We Access</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><strong>TikTok</strong></td>
                  <td className="py-2">Public profile info, video list, video statistics (views, likes, comments, shares)</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><strong>Instagram</strong></td>
                  <td className="py-2">Business/Creator account profile, media list, engagement metrics</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><strong>YouTube</strong></td>
                  <td className="py-2">Channel information, video list, video analytics (via YouTube Data API)</td>
                </tr>
              </tbody>
            </table>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg my-4">
              <p className="text-sm m-0"><strong>Important:</strong> We do NOT access your private messages, passwords, payment information from social platforms, or any data from accounts you haven't explicitly connected.</p>
            </div>

            <h3>1.3 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> Features used, pages visited, actions taken within our platform</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
              <li><strong>Cookies:</strong> Essential cookies for authentication and session management (see Section 7)</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>

            <h3>2.1 Service Delivery</h3>
            <ul>
              <li>Display your content analytics in your personal dashboard</li>
              <li>Generate AI-powered recommendations using Google Gemini to help improve your content</li>
              <li>Track your performance trends over time</li>
              <li>Provide customer support</li>
            </ul>

            <h3>2.2 Service Improvement</h3>
            <ul>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Develop new features and functionality</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>

            <h3>2.3 Communications</h3>
            <ul>
              <li>Send essential service notifications (password resets, security alerts)</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send product updates (with your consent, and you can opt out at any time)</li>
            </ul>

            <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg my-4">
              <p className="text-sm m-0"><strong>What We Never Do:</strong></p>
              <ul className="text-sm mb-0">
                <li>Post, modify, or delete content on your social media accounts</li>
                <li>Sell your personal data to third parties</li>
                <li>Use your data for advertising purposes</li>
                <li>Share your analytics with other users without your consent</li>
              </ul>
            </div>

            <h2>3. Legal Basis for Processing (GDPR)</h2>
            <p>If you are located in the European Economic Area (EEA), UK, or Switzerland, we process your personal data based on the following legal grounds:</p>
            <ul>
              <li><strong>Consent:</strong> When you connect your social media accounts or opt-in to marketing communications</li>
              <li><strong>Contract Performance:</strong> To provide the services you requested when creating an account</li>
              <li><strong>Legitimate Interests:</strong> To improve our services, ensure security, and prevent fraud</li>
              <li><strong>Legal Obligations:</strong> To comply with applicable laws and regulations</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal data. We may share your information only in the following circumstances:</p>

            <h3>4.1 Service Providers</h3>
            <p>We work with trusted third-party service providers who assist us in operating our platform:</p>
            <ul>
              <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
              <li><strong>Google Cloud/Gemini:</strong> AI-powered analytics and recommendations</li>
              <li><strong>Hosting Providers:</strong> Secure cloud infrastructure</li>
              <li><strong>Analytics:</strong> To understand how users interact with our platform</li>
            </ul>
            <p>All service providers are bound by data processing agreements and can only process your data as instructed by us.</p>

            <h3>4.2 Legal Requirements</h3>
            <p>We may disclose your information if required by law, court order, or government request, or to protect our rights, safety, or the rights of others.</p>

            <h3>4.3 Business Transfers</h3>
            <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred. We will notify you before your data becomes subject to a different privacy policy.</p>

            <h2>5. International Data Transfers</h2>
            <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place:</p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
              <li>Data Processing Agreements with all third-party processors</li>
              <li>Compliance with EU-US Data Privacy Framework where applicable</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>We retain your data only for as long as necessary to provide our services:</p>
            <ul>
              <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
              <li><strong>Deleted Accounts:</strong> All personal data is deleted within 30 days of account deletion</li>
              <li><strong>Disconnected Platforms:</strong> Data from disconnected social accounts is deleted within 7 days</li>
              <li><strong>Backup Data:</strong> Encrypted backups are purged within 90 days</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law (e.g., financial records)</li>
            </ul>

            <h2>7. Cookies and Tracking Technologies</h2>
            <p>We use the following types of cookies:</p>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for authentication and core functionality (cannot be disabled)</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences (e.g., theme, language)</li>
            </ul>
            <p>We do NOT use:</p>
            <ul>
              <li>Third-party advertising cookies</li>
              <li>Cross-site tracking cookies</li>
              <li>Social media tracking pixels (except when you explicitly use share features)</li>
            </ul>

            <h2>8. Your Privacy Rights</h2>

            <h3>8.1 Rights for All Users</h3>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data</li>
              <li><strong>Disconnect:</strong> Revoke access to connected social media accounts at any time</li>
              <li><strong>Export:</strong> Request your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
            </ul>

            <h3>8.2 Additional Rights for EEA/UK Residents (GDPR)</h3>
            <ul>
              <li><strong>Restriction:</strong> Request restriction of processing</li>
              <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time (without affecting prior processing)</li>
              <li><strong>Complaint:</strong> Lodge a complaint with your local Data Protection Authority</li>
            </ul>

            <h3>8.3 Rights for California Residents (CCPA/CPRA)</h3>
            <ul>
              <li><strong>Right to Know:</strong> Request disclosure of data collected about you</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
              <li><strong>Right to Opt-Out:</strong> Opt out of sale/sharing of personal information (note: we do not sell your data)</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
            </ul>
            <p>To exercise your rights, contact us at <a href="mailto:privacy@rizko.ai" className="text-blue-500 hover:underline">privacy@rizko.ai</a> or use our <Link to="/data-deletion" className="text-blue-500 hover:underline">Data Deletion Request</Link> page.</p>

            <h2>9. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data:</p>
            <ul>
              <li><strong>Encryption in Transit:</strong> All data transmitted using TLS 1.3</li>
              <li><strong>Encryption at Rest:</strong> AES-256 encryption for stored data</li>
              <li><strong>OAuth Token Security:</strong> Access tokens are encrypted and stored separately</li>
              <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication for staff</li>
              <li><strong>Regular Audits:</strong> Periodic security assessments and vulnerability testing</li>
              <li><strong>Incident Response:</strong> Documented procedures for security incidents</li>
            </ul>

            <h2>10. Children's Privacy</h2>
            <p>Our services are not intended for users under 13 years of age (or 16 in the EEA). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately at <a href="mailto:privacy@rizko.ai" className="text-blue-500 hover:underline">privacy@rizko.ai</a>.</p>

            <h2>11. Third-Party Platform Policies</h2>
            <p>When you connect your social media accounts, your data is also subject to the privacy policies of those platforms:</p>
            <ul>
              <li><a href="https://www.tiktok.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">TikTok Privacy Policy <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">Instagram Privacy Policy <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">YouTube Terms of Service <ExternalLink className="h-3 w-3" /></a></li>
            </ul>

            <h2>12. Changes to This Privacy Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
            <ul>
              <li>Posting the updated policy on this page with a new "Last Updated" date</li>
              <li>Sending an email notification for significant changes</li>
              <li>Displaying an in-app notification</li>
            </ul>
            <p>Your continued use of our services after changes take effect constitutes acceptance of the updated policy.</p>

            <h2>13. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:privacy@rizko.ai" className="text-blue-500 hover:underline">privacy@rizko.ai</a></li>
              <li><strong>Data Deletion:</strong> <Link to="/data-deletion" className="text-blue-500 hover:underline">Request Data Deletion</Link></li>
              <li><strong>General Support:</strong> <a href="mailto:support@rizko.ai" className="text-blue-500 hover:underline">support@rizko.ai</a></li>
            </ul>

            <p className="text-sm text-muted-foreground mt-8">
              By using Rizko.ai, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-x-4">
          <Link to="/terms-of-service" className="text-blue-500 hover:underline">Terms of Service</Link>
          <span className="text-muted-foreground">|</span>
          <Link to="/data-policy" className="text-blue-500 hover:underline">Data Policy</Link>
          <span className="text-muted-foreground">|</span>
          <Link to="/" className="text-blue-500 hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
