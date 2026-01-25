import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-purple-500" />
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>

      <Card>
        <CardContent className="pt-6 prose dark:prose-invert max-w-none">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li>Account information (email, name)</li>
            <li>Usage data (searches, generated scripts)</li>
            <li>Payment information (processed securely via Stripe)</li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <ul>
            <li>To provide and improve our services</li>
            <li>To personalize your experience</li>
            <li>To communicate important updates</li>
            <li>To ensure platform security</li>
          </ul>

          <h2>3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with service providers (hosting, payments) necessary for platform operation.</p>

          <h2>4. Data Security</h2>
          <p>We use industry-standard encryption and security measures to protect your data.</p>

          <h2>5. Your Rights</h2>
          <ul>
            <li>Access your personal data</li>
            <li>Request data deletion</li>
            <li>Export your data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>6. Contact</h2>
          <p>For privacy concerns, contact us at: privacy@trendscout.ai</p>

          <p className="text-sm text-muted-foreground mt-8">Full privacy policy coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
