import { useState } from 'react';
import { MessageSquare, Send, Star, Lightbulb, Bug, Heart, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type FeedbackType = 'idea' | 'bug' | 'love' | 'other';

interface FeedbackOption {
  type: FeedbackType;
  icon: typeof Lightbulb;
  label: string;
  description: string;
  color: string;
}

const feedbackOptions: FeedbackOption[] = [
  {
    type: 'idea',
    icon: Lightbulb,
    label: 'Feature Idea',
    description: 'Suggest a new feature',
    color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  },
  {
    type: 'bug',
    icon: Bug,
    label: 'Bug Report',
    description: 'Something not working?',
    color: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
  {
    type: 'love',
    icon: Heart,
    label: 'I Love It!',
    description: 'Share what you love',
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  },
  {
    type: 'other',
    icon: MessageSquare,
    label: 'Other',
    description: 'General feedback',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
];

export function Feedback() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) {
      toast.error('Please select a feedback type and write a message');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call (in future - send to backend/email)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For now, log to console (later - send to your email/backend)
    console.log('Feedback submitted:', {
      type: selectedType,
      message: message.trim(),
      rating,
      user: user?.email || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success('Thank you for your feedback!');
  };

  const resetForm = () => {
    setSelectedType(null);
    setMessage('');
    setRating(0);
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="p-8 max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your feedback helps us make Risko.ai better for everyone.
              We read every message!
            </p>
            <Button onClick={resetForm}>
              Send More Feedback
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-7 w-7" />
          Feedback
        </h1>
        <p className="text-muted-foreground">
          Help us improve Risko.ai - your ideas and feedback matter!
        </p>
      </div>

      {/* Feedback Type Selection */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">What kind of feedback do you have?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {feedbackOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedType === option.type;

            return (
              <button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-center',
                  isSelected
                    ? option.color + ' border-current'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <Icon className={cn('h-6 w-6 mx-auto mb-2', isSelected ? '' : 'text-muted-foreground')} />
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Message Input */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Tell us more</h3>
        <Textarea
          placeholder={
            selectedType === 'idea'
              ? "I'd love to see a feature that..."
              : selectedType === 'bug'
              ? "I found a bug: when I try to..."
              : selectedType === 'love'
              ? "I really love how Risko.ai..."
              : "Your feedback here..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[150px] resize-none"
        />
        <p className="text-xs text-muted-foreground mt-2">
          {message.length}/1000 characters
        </p>
      </Card>

      {/* Rating */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">How would you rate Risko.ai overall?</h3>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'h-8 w-8 transition-colors',
                  (hoveredRating || rating) >= star
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-3 text-sm text-muted-foreground">
              {rating === 5 && 'Excellent!'}
              {rating === 4 && 'Great!'}
              {rating === 3 && 'Good'}
              {rating === 2 && 'Could be better'}
              {rating === 1 && 'Needs improvement'}
            </span>
          )}
        </div>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!selectedType || !message.trim() || isSubmitting}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Feedback
          </>
        )}
      </Button>

      {/* Contact Info */}
      <p className="text-center text-sm text-muted-foreground">
        Or email us directly at{' '}
        <a href="mailto:feedback@risko.ai" className="text-purple-500 hover:underline">
          feedback@risko.ai
        </a>
      </p>
    </div>
  );
}
