"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Gift, Users, Star, Copy, Share2, Trophy, TrendingUp, CheckCircle, Clock,
} from "lucide-react";

const STORAGE_KEY = "nexabook_referrals";

// Referral record stored in localStorage
interface ReferralRecord {
  name: string;
  email: string;
  date: string;
  status: "success" | "pending";
  reward: number;
}

function loadReferrals(): ReferralRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ReferEarnPage() {
  const { user, isLoaded } = useUser();
  const [copied, setCopied] = useState(false);
  const [referrals] = useState<ReferralRecord[]>(loadReferrals);

  // Build referral link from Clerk user ID
  const referralCode = user?.id ? `NEXA-${user.id.slice(-6).toUpperCase()}` : "NEXA-XXXXXX";
  const referralLink = `https://nexabook-eight.vercel.app/register?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real stats from localStorage
  const totalReferrals = referrals.length;
  const successfulReferrals = referrals.filter(r => r.status === "success").length;
  const pendingReferrals = referrals.filter(r => r.status === "pending").length;
  const rewardPoints = successfulReferrals * 50;
  const totalEarned = `Rs. ${rewardPoints.toLocaleString()}`;

  // Determine current tier
  const currentTier = successfulReferrals <= 5 ? "Bronze" : successfulReferrals <= 15 ? "Silver" : successfulReferrals <= 30 ? "Gold" : "Platinum";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Refer & Earn</h1>
            <p className="text-nexabook-600 mt-1">Invite friends and earn rewards for every successful signup</p>
          </div>
          {isLoaded && user && (
            <Badge variant="outline" className="text-sm gap-2 self-start">
              <Users className="h-3.5 w-3.5" />
              {user.fullName || user.emailAddresses[0]?.emailAddress || "User"}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Referral Link Card */}
      <Card className="border-2 border-nexabook-200 bg-gradient-to-r from-nexabook-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-nexabook-900 flex items-center justify-center">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-nexabook-900">Your Unique Referral Link</h2>
              <p className="text-sm text-nexabook-600">Share this link to earn Rs. 50 per successful signup</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-white border-2 border-nexabook-200 rounded-lg px-4 py-3 font-mono text-sm break-all">
              {referralLink}
            </div>
            <Button onClick={copyToClipboard} variant={copied ? "default" : "outline"} className={copied ? "bg-green-600 hover:bg-green-700" : ""}>
              {copied ? <><CheckCircle className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards — only show if there is data */}
      {totalReferrals > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <p className="text-2xl font-bold text-nexabook-900">{totalReferrals}</p>
            <p className="text-xs text-nexabook-600">Total Referrals</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-2xl font-bold text-nexabook-900">{successfulReferrals}</p>
            <p className="text-xs text-nexabook-600">Successful</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
            <p className="text-2xl font-bold text-nexabook-900">{pendingReferrals}</p>
            <p className="text-xs text-nexabook-600">Pending</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-2xl font-bold text-nexabook-900">{rewardPoints}</p>
            <p className="text-xs text-nexabook-600">Reward Points</p>
          </CardContent></Card>
          <Card className="col-span-2 md:col-span-1"><CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-nexabook-700" />
            <p className="text-xl font-bold text-nexabook-900">{totalEarned}</p>
            <p className="text-xs text-nexabook-600">Total Earned</p>
          </CardContent></Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-nexabook-200" />
            <p className="text-sm font-medium text-nexabook-700">Your referral stats will appear here once someone signs up using your link.</p>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader><CardTitle>How It Works</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: Share2, title: "Share Your Link", desc: "Copy your unique referral link and share it with friends or colleagues" },
              { step: "2", icon: Users, title: "They Sign Up", desc: "When someone signs up using your link and activates their account" },
              { step: "3", icon: Gift, title: "You Earn Rewards", desc: "Earn Rs. 50 reward points for every successful signup" },
            ].map((item, idx) => (
              <div key={idx} className="text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-nexabook-100 flex items-center justify-center mx-auto relative">
                  <item.icon className="h-8 w-8 text-nexabook-700" />
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-nexabook-900 text-white text-sm font-bold flex items-center justify-center">{item.step}</div>
                </div>
                <h3 className="font-semibold text-nexabook-900">{item.title}</h3>
                <p className="text-sm text-nexabook-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle>Referral History</CardTitle><CardDescription>Track your referrals and their status</CardDescription></div>
          {totalReferrals > 0 && (
            <Badge variant="outline" className="gap-1"><Trophy className="h-4 w-4" />{successfulReferrals} Successful</Badge>
          )}
        </CardHeader>
        {totalReferrals === 0 ? (
          <CardContent className="p-12 text-center">
            <Share2 className="h-12 w-12 mx-auto mb-3 text-nexabook-200" />
            <p className="text-sm font-medium text-nexabook-700">No referrals yet. Share your link to start earning!</p>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-nexabook-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-nexabook-600">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-nexabook-600">Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {referrals.map((ref, idx) => (
                    <tr key={idx} className="hover:bg-nexabook-50/50">
                      <td className="px-4 py-3 font-medium">{ref.name}</td>
                      <td className="px-4 py-3 text-sm text-nexabook-600">{ref.email}</td>
                      <td className="px-4 py-3 text-sm">{new Date(ref.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ref.status === "success" ? "default" : "outline"} className={ref.status === "success" ? "bg-green-600" : "gap-1"}>
                          {ref.status === "success" ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {ref.status === "success" ? "Successful" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{ref.reward > 0 ? `Rs. ${ref.reward}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Rewards Tiers */}
      <Card>
        <CardHeader><CardTitle>Rewards Tiers</CardTitle><CardDescription>Earn bonus rewards as you refer more people</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { tier: "Bronze", referrals: "1-5", reward: "Rs. 50/ref", color: "bg-amber-100 border-amber-300", min: 1, max: 5 },
              { tier: "Silver", referrals: "6-15", reward: "Rs. 75/ref", color: "bg-gray-100 border-gray-300", min: 6, max: 15 },
              { tier: "Gold", referrals: "16-30", reward: "Rs. 100/ref", color: "bg-yellow-100 border-yellow-300", min: 16, max: 30 },
              { tier: "Platinum", referrals: "31+", reward: "Rs. 150/ref", color: "bg-purple-100 border-purple-300", min: 31, max: Infinity },
            ].map((tier, idx) => {
              const achieved = successfulReferrals >= tier.min;
              return (
                <Card key={idx} className={`border-2 ${tier.color} ${achieved ? "ring-2 ring-nexabook-400" : ""}`}>
                  <CardContent className="p-4 text-center">
                    <Trophy className={`h-8 w-8 mx-auto mb-2 ${achieved ? "text-nexabook-700" : "text-nexabook-400"}`} />
                    <h3 className="font-bold text-nexabook-900">{tier.tier}</h3>
                    <p className="text-xs text-nexabook-600 mt-1">{tier.referrals} referrals</p>
                    <p className="text-lg font-bold text-nexabook-900 mt-2">{tier.reward}</p>
                    {achieved && <Badge className="mt-2 bg-green-600">Achieved</Badge>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
