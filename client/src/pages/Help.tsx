import { HelpCircle, MessageCircle, BookOpen, Video, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const faqItems = [
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

const guides = [
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

export function Help() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <HelpCircle className="h-7 w-7" />
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-2">
          Get answers to your questions and learn how to use ViralTrend AI
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
              onClick={() => window.location.href = 'mailto:axislineX@gmail.com?subject=TrendScout Support'}
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
            <h3 className="font-semibold mb-2">Documentation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Coming soon - we're working on comprehensive guides
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </div>
        </Card>
      </div>

      {/* FAQ Section */}
      <div>
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
    </div>
  );
}
