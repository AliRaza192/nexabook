"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Gift, Users, Share2, Trophy, TrendingUp, CheckCircle, Copy,
  MessageCircle, Link2, Sparkles, ArrowRight, Loader2
} from "lucide-react";
import { formatPKR } from "@/lib/utils/number-format";

// Pakistani currency formatting
const formatCurrency = (value: number) => formatPKR(value, 'south-asian');

export default function ReferEarnPage() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  // Generate deterministic referral code from Clerk user ID
  const referralCode = user?.id 
    ? `NEXA-${user.id.slice(-6).toUpperCase()}` 
    : "NEXA-XXXXXX";

  // Create referral link (update to your actual Vercel deployment URL)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexabook.vercel.app";
  const referralLink = `${baseUrl}/register?ref=${referralCode}`;

  // WhatsApp share message
  const whatsappMessage = encodeURIComponent(
    `🎉 Join me on NexaBook - The ultimate business management platform!\n\n` +
    `Sign up using my referral link and get started:\n` +
    `${referralLink}\n\n` +
    `Manage your invoices, inventory, accounting & more! 💼📊`
  );
  const whatsappLink = `https://wa.me/?text=${whatsappMessage}`;

  // Copy to clipboard with toast notification
  const copyToClipboard = useCallback(async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      
      // Show success feedback
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } finally {
      setCopying(false);
    }
  }, [referralLink]);

  // Calculate referral code display
  const userEmail = user?.emailAddresses[0]?.emailAddress || "your email";
  const userName = user?.fullName || user?.username || "User";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-amber-500" />
              Refer & Earn
            </h1>
            <p className="text-nexabook-600 mt-1">
              Invite friends and earn rewards for every successful signup
            </p>
          </div>
          {isLoaded && user && (
            <Badge variant="outline" className="text-sm gap-2 self-start px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {userName}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Premium Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="border-2 border-nexabook-200 bg-gradient-to-br from-nexabook-50 via-white to-blue-50 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-nexabook-900 to-nexabook-700 flex items-center justify-center shadow-md flex-shrink-0">
                <Gift className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-nexabook-900 mb-1">
                  Your Unique Referral Link
                </h2>
                <p className="text-sm text-nexabook-600">
                  Share this link and earn <span className="font-semibold text-green-700">{formatCurrency(50)}</span> for every successful signup
                </p>
              </div>
            </div>

            {/* Referral Code Display */}
            <div className="mb-4 p-4 bg-white border-2 border-nexabook-200 rounded-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-nexabook-500" />
                  <span className="text-xs text-nexabook-500 uppercase tracking-wide">Referral Code</span>
                </div>
                <Badge className="text-sm px-3 py-1 bg-nexabook-900 hover:bg-nexabook-800">
                  {referralCode}
                </Badge>
              </div>
            </div>

            {/* Referral Link Display */}
            <div className="mb-4 p-4 bg-white border-2 border-nexabook-200 rounded-lg font-mono text-sm text-nexabook-700 break-all">
              {referralLink}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={copyToClipboard} 
                disabled={copying}
                className={copied 
                  ? "bg-green-600 hover:bg-green-700 flex-1" 
                  : "bg-nexabook-900 hover:bg-nexabook-800 flex-1"
                }
                size="lg"
              >
                {copying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copying...
                  </>
                ) : copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => window.open(whatsappLink, '_blank')}
                variant="outline"
                size="lg"
                className="flex-1 border-green-300 hover:bg-green-50 hover:border-green-400 text-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share on WhatsApp
              </Button>
            </div>

            {/* Success Toast */}
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Referral link copied! Share it with your friends and colleagues.
                  </span>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="enterprise-card">
          <CardHeader>
            <CardTitle className="text-nexabook-900">How It Works</CardTitle>
            <CardDescription>Three simple steps to start earning rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  step: "1", 
                  icon: Share2, 
                  title: "Share Your Link", 
                  desc: "Copy your unique referral link and share it with friends, colleagues, or on social media",
                  color: "bg-blue-100 text-blue-700"
                },
                { 
                  step: "2", 
                  icon: Users, 
                  title: "They Sign Up", 
                  desc: "When someone registers using your link and activates their account",
                  color: "bg-green-100 text-green-700"
                },
                { 
                  step: "3", 
                  icon: Gift, 
                  title: "You Earn Rewards", 
                  desc: `Earn ${formatCurrency(50)} reward points for every successful signup`,
                  color: "bg-purple-100 text-purple-700"
                },
              ].map((item, idx) => (
                <div key={idx} className="text-center space-y-4 relative">
                  {/* Connector Arrow (hidden on mobile) */}
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-10 -right-3 text-nexabook-300">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className={`h-20 w-20 rounded-full ${item.color} flex items-center justify-center mx-auto shadow-sm`}>
                      <item.icon className="h-10 w-10" />
                    </div>
                    <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-nexabook-900 text-white text-sm font-bold flex items-center justify-center shadow-md">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-nexabook-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-nexabook-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rewards Tiers */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="enterprise-card">
          <CardHeader>
            <CardTitle className="text-nexabook-900">Rewards Tiers</CardTitle>
            <CardDescription>Earn bonus rewards as you refer more people</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { 
                  tier: "Bronze", 
                  referrals: "1-5", 
                  reward: 50,
                  rewardLabel: "/ref", 
                  color: "bg-amber-50 border-2 border-amber-300",
                  iconColor: "text-amber-600"
                },
                { 
                  tier: "Silver", 
                  referrals: "6-15", 
                  reward: 75,
                  rewardLabel: "/ref", 
                  color: "bg-gray-50 border-2 border-gray-300",
                  iconColor: "text-gray-600"
                },
                { 
                  tier: "Gold", 
                  referrals: "16-30", 
                  reward: 100,
                  rewardLabel: "/ref", 
                  color: "bg-yellow-50 border-2 border-yellow-300",
                  iconColor: "text-yellow-600"
                },
                { 
                  tier: "Platinum", 
                  referrals: "31+", 
                  reward: 150,
                  rewardLabel: "/ref", 
                  color: "bg-purple-50 border-2 border-purple-300",
                  iconColor: "text-purple-600"
                },
              ].map((tier, idx) => (
                <Card key={idx} className={`border-2 ${tier.color} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5 text-center">
                    <Trophy className={`h-10 w-10 mx-auto mb-3 ${tier.iconColor}`} />
                    <h3 className="font-bold text-nexabook-900 text-lg">{tier.tier}</h3>
                    <p className="text-xs text-nexabook-600 mt-1">{tier.referrals} referrals</p>
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-2xl font-bold text-nexabook-900">
                        {formatCurrency(tier.reward)}
                      </p>
                      <p className="text-xs text-nexabook-600">{tier.rewardLabel}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Empty State - No Referrals Yet */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="enterprise-card">
          <CardContent className="p-12 text-center">
            <div className="h-20 w-20 rounded-full bg-nexabook-100 flex items-center justify-center mx-auto mb-4">
              <Share2 className="h-10 w-10 text-nexabook-400" />
            </div>
            <h3 className="text-xl font-semibold text-nexabook-900 mb-2">
              No referrals yet
            </h3>
            <p className="text-sm text-nexabook-600 max-w-md mx-auto mb-6">
              Share your referral link to start earning rewards! Every successful signup earns you {formatCurrency(50)}.
            </p>
            <Button 
              onClick={copyToClipboard}
              className="bg-nexabook-900 hover:bg-nexabook-800"
              size="lg"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Your Referral Link
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Referral Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="enterprise-card border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-nexabook-900 text-lg mb-2">
                  Why Refer to NexaBook?
                </h3>
                <ul className="space-y-2 text-sm text-nexabook-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Earn <strong>{formatCurrency(50)}</strong> for every successful referral</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Unlock higher reward tiers as you refer more people</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Help your friends discover a powerful business management tool</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>No limit on referrals - earn unlimited rewards</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
