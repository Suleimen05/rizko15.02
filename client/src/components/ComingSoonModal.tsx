import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  Store,
  CheckCircle,
  Target,
  Briefcase,
  Star,
  MessageCircle,
  CreditCard,
  ThumbsUp,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'publish' | 'marketplace';
}

const STORAGE_KEY_PREFIX = 'interested_';

export function ComingSoonModal({ isOpen, onClose, type }: ComingSoonModalProps) {
  const { user } = useAuth();
  const [isInterested, setIsInterested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${type}`);
    if (stored === 'true') {
      setIsInterested(true);
    }
  }, [type]);

  const handleInterested = async () => {
    if (isInterested) return;

    setIsSubmitting(true);

    try {
      // Save to Supabase
      const { error: _supabaseError } = await supabase
        .from('waitlist')
        .insert([{
          email: user?.email || 'anonymous',
          feature: type
        }]);

      // Save to localStorage regardless of Supabase result
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, 'true');
      setIsInterested(true);
      setJustSubmitted(true);
    } catch {
      // Fallback to localStorage
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${type}`, 'true');
      setIsInterested(true);
      setJustSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setJustSubmitted(false);
    onClose();
  };

  const config = {
    publish: {
      icon: Rocket,
      title: 'Publish Hub',
      subtitle: 'Coming February 2026',
      description: 'Schedule and publish your content across all major platforms',
      features: [
        { icon: CheckCircle, text: 'Publish to TikTok', color: 'text-green-400' },
        { icon: CheckCircle, text: 'Publish to Instagram', color: 'text-green-400' },
        { icon: CheckCircle, text: 'Publish to YouTube', color: 'text-green-400' },
        { icon: CheckCircle, text: 'Schedule posts', color: 'text-green-400' },
        { icon: CheckCircle, text: 'AI-generated hashtags', color: 'text-green-400' },
        { icon: CheckCircle, text: 'Multi-platform analytics', color: 'text-green-400' },
      ],
    },
    marketplace: {
      icon: Store,
      title: 'Marketplace',
      subtitle: 'Coming February 2026',
      description: 'Hire content creators, SMM managers, and TikTok experts for your brand',
      features: [
        { icon: Target, text: 'Browse 1000+ verified creators', color: 'text-purple-400' },
        { icon: Briefcase, text: 'Post job listings', color: 'text-purple-400' },
        { icon: Star, text: 'Read reviews & ratings', color: 'text-purple-400' },
        { icon: MessageCircle, text: 'Direct messaging', color: 'text-purple-400' },
        { icon: CreditCard, text: 'Secure payments', color: 'text-purple-400' },
      ],
    },
  };

  const current = config[type];
  const Icon = current.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 to-purple-900/50 border-purple-500/30 text-white">
        <DialogHeader className="text-center sm:text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Icon className="h-8 w-8 text-purple-400" />
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {current.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-purple-200 text-lg">
            {current.subtitle}
          </DialogDescription>
        </DialogHeader>

        <p className="text-center text-gray-300 text-sm">
          {current.description}
        </p>

        <div className="mt-4 p-4 rounded-lg bg-purple-950/50 border border-purple-500/20">
          <h4 className="font-semibold text-white mb-3">
            {type === 'publish' ? "What's coming:" : "What you'll be able to do:"}
          </h4>
          <ul className="space-y-2.5 text-gray-300">
            {current.features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <li key={index} className="flex items-center gap-2">
                  <FeatureIcon className={`h-4 w-4 ${feature.color} flex-shrink-0`} />
                  <span>{feature.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Interest section */}
        <div className="mt-4">
          {justSubmitted ? (
            <div className="text-center py-4 px-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-medium">Thanks for your interest!</p>
              <p className="text-gray-400 text-sm mt-1">We'll contact you when it's ready.</p>
            </div>
          ) : isInterested ? (
            <Button
              disabled
              className="w-full bg-green-600/20 text-green-400 border border-green-500/30 cursor-default"
            >
              <Check className="h-4 w-4 mr-2" />
              You're Interested
            </Button>
          ) : (
            <Button
              onClick={handleInterested}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            >
              {isSubmitting ? (
                <span className="animate-pulse">...</span>
              ) : (
                <>
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  I'm Interested
                </>
              )}
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleClose}
          className="w-full border-purple-500/30 text-purple-200 hover:bg-purple-500/10 hover:text-white"
        >
          Back to Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
