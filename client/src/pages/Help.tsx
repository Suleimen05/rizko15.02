import { HelpCircle, MessageCircle, BookOpen, Video, Mail, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REVIEW_MODE } from '@/config/features';
import { Link, useLocation } from 'react-router-dom';

// FAQ items for REVIEW_MODE (Official API only)
const reviewModeFaqItems = [
  {
    question: 'How do I connect my social media accounts?',
    answer: 'Go to "Connect Accounts" in the sidebar, then click on the platform you want to connect (TikTok, Instagram, or YouTube). You\'ll be redirected to authorize access through the official platform login.',
  },
  {
    question: 'What analytics can I see after connecting?',
    answer: 'Once connected, you can view your video performance metrics including views, likes, comments, and follower growth. Our AI provides personalized insights to help improve your content strategy.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes! We use official platform APIs with OAuth authentication. We only access your public profile and video statistics. We never post on your behalf or access private messages.',
  },
  {
    question: 'Can I disconnect my accounts?',
    answer: 'Yes, you can disconnect any linked account at any time from the "Connect Accounts" page. Your data will be removed from our system.',
  },
];

// FAQ items for full version
const fullFaqItems = [
  {
    question: 'How do I generate an AI script from a trending video?',
    answer: 'Simply click on any trending video and select "Generate AI Script". Our AI will analyze the video and create a unique script tailored to your brand and tone.',
  },
  {
    question: 'What data sources does ViralTrend AI use?',
    answer: 'We use TikTok\'s official API through RapidAPI, combined with our proprietary AI analysis engine that processes engagement patterns, viral elements, and trend data.',
  },
  {
    question: 'How accurate are the viral predictions?',
    answer: 'Our viral prediction algorithm has an 85% accuracy rate based on historical data, analyzing factors like engagement velocity, hashtag growth, and content patterns.',
  },
  {
    question: 'Can I track multiple competitors?',
    answer: 'Yes! Pro users can track up to 20 competitors, monitor their top-performing content, and receive alerts when they post viral videos.',
  },
  {
    question: 'Is there a limit on AI script generation?',
    answer: 'Free users get 10 AI scripts per month. Pro users enjoy unlimited script generation with advanced customization options.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription anytime from the Settings > Billing page. Your access will continue until the end of your billing period.',
  },
];

const faqItems = REVIEW_MODE ? reviewModeFaqItems : fullFaqItems;

// Guides for REVIEW_MODE
const reviewModeGuides = [
  {
    title: 'Getting Started Guide',
    description: 'Learn how to connect your accounts and view your analytics',
    icon: BookOpen,
    duration: '3 min read',
  },
];

// Guides for full version
const fullGuides = [
  {
    title: 'Getting Started Guide',
    description: 'Learn the basics of finding viral trends and generating scripts',
    icon: BookOpen,
    duration: '5 min read',
  },
  {
    title: 'Viral Content Strategy',
    description: 'Master the art of creating content that gets millions of views',
    icon: Video,
    duration: '12 min read',
  },
  {
    title: 'Competitor Analysis',
    description: 'How to spy on competitors and reverse-engineer their success',
    icon: MessageCircle,
    duration: '8 min read',
  },
];

const guides = REVIEW_MODE ? reviewModeGuides : fullGuides;

export function Help() {
  const location = useLocation();
  const isStandalone = location.pathname === '/help';

  const content = (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <HelpCircle className="h-7 w-7" />
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-2">
          Get answers to your questions and learn how to use Rizko.ai
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Contact Support</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Chat with our support team for personalized help
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://t.me/+13215884561', '_blank')}
            >
              Start Chat
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">Email Us</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Send us an email and we'll get back to you within 24 hours
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = 'mailto:support@rizko.ai?subject=Rizko.ai Support'}
            >
              Send Email
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">FAQ</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Find answers to common questions below
            </p>
            <Button variant="outline" className="w-full" onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>
              View FAQ
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>

      {/* FAQ Section */}
      <div id="faq">
        <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {faqItems.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Guides Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Helpful Guides</h2>
        <div className="grid gap-4">
          {guides.map((guide, index) => {
            const Icon = guide.icon;
            return (
              <Card key={index} className="p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 group-hover:text-purple-600 transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {guide.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{guide.duration}</span>
                      <span>•</span>
                      <span className="text-purple-600 font-medium">Read Guide</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">System Status</h3>
            <p className="text-sm text-muted-foreground">All systems are operational</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium">All Systems Operational</span>
          </div>
        </div>
      </Card>

      {/* Back to Home for standalone */}
      {isStandalone && (
        <div className="text-center pt-4">
          <Link to="/" className="text-blue-500 hover:underline inline-flex items-center gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );

  // Standalone mode - with full page wrapper
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {content}
        </div>
      </div>
    );
  }

  // Dashboard mode - no wrapper
  return content;
}
