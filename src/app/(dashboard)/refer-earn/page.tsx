"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Gift, Users, Star, Copy, Share2, Trophy, TrendingUp, CheckCircle, Clock, ExternalLink,
} from "lucide-react";

export default function ReferEarnPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://nexabook.io/signup?ref=NEXA-7X8K9M";

  const stats = {
    totalReferrals: 12,
    successfulReferrals: 7,
    pendingReferrals: 5,
    rewardPoints: 350,
    totalEarned: "Rs. 3,500",
  };

  const referrals = [
    { name: "Ahmed Khan", email: "ahmed@example.com", date: "2026-04-01", status: "success", reward: 50 },
    { name: "Fatima Ali", email: "fatima@example.com", date: "2026-03-28", status: "success", reward: 50 },
    { name: "Usman Raza", email: "usman@example.com", date: "2026-03-25", status: "success", reward: 50 },
    { name: "Ayesha Malik", email: "ayesha@example.com", date: "2026-03-20", status: "success", reward: 50 },
    { name: "Hassan Bilal", email: "hassan@example.com", date: "2026-03-15", status: "success", reward: 50 },
    { name: "Sara Yousaf", email: "sara@example.com", date: "2026-03-10", status: "success", reward: 50 },
    { name: "Bilal Tariq", email: "bilal@example.com", date: "2026-03-05", status: "success", reward: 50 },
    { name: "Zara Sheikh", email: "zara@example.com", date: "2026-04-05", status: "pending", reward: 0 },
    { name: "Omar Farooq", email: "omar@example.com", date: "2026-04-06", status: "pending", reward: 0 },
    { name: "Hina Aslam", email: "hina@example.com", date: "2026-04-07", status: "pending", reward: 0 },
    { name: "Kamran Shah", email: "kamran@example.com", date: "2026-04-08", status: "pending", reward: 0 },
    { name: "Nadia Pervez", email: "nadia@example.com", date: "2026-04-09", status: "pending", reward: 0 },
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-nexabook-900">Refer & Earn</h1>
            <p className="text-nexabook-600 mt-1">Invite friends and earn rewards for every successful signup</p>
          </div>
          <Button className="bg-nexabook-900 hover:bg-nexabook-800">
            <Share2 className="h-4 w-4 mr-2" />Share Referral Link
          </Button>
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
          <div className="flex gap-3">
            <div className="flex-1 bg-white border-2 border-nexabook-200 rounded-lg px-4 py-3 font-mono text-sm">
              {referralLink}
            </div>
            <Button onClick={copyToClipboard} variant={copied ? "default" : "outline"} className={copied ? "bg-green-600" : ""}>
              {copied ? <><CheckCircle className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-6 w-6 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold text-nexabook-900">{stats.totalReferrals}</p>
          <p className="text-xs text-nexabook-600">Total Referrals</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold text-nexabook-900">{stats.successfulReferrals}</p>
          <p className="text-xs text-nexabook-600">Successful</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
          <p className="text-2xl font-bold text-nexabook-900">{stats.pendingReferrals}</p>
          <p className="text-xs text-nexabook-600">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Star className="h-6 w-6 mx-auto mb-2 text-purple-600" />
          <p className="text-2xl font-bold text-nexabook-900">{stats.rewardPoints}</p>
          <p className="text-xs text-nexabook-600">Reward Points</p>
        </CardContent></Card>
        <Card className="col-span-2 md:col-span-1"><CardContent className="p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-nexabook-700" />
          <p className="text-xl font-bold text-nexabook-900">{stats.totalEarned}</p>
          <p className="text-xs text-nexabook-600">Total Earned</p>
        </CardContent></Card>
      </div>

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
          <Badge variant="outline" className="gap-1"><Trophy className="h-4 w-4" />{stats.successfulReferrals} Successful</Badge>
        </CardHeader>
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
      </Card>

      {/* Rewards Tiers */}
      <Card>
        <CardHeader><CardTitle>Rewards Tiers</CardTitle><CardDescription>Earn bonus rewards as you refer more people</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { tier: "Bronze", referrals: "1-5", reward: "Rs. 50/ref", color: "bg-amber-100 border-amber-300", achieved: true },
              { tier: "Silver", referrals: "6-15", reward: "Rs. 75/ref", color: "bg-gray-100 border-gray-300", achieved: true },
              { tier: "Gold", referrals: "16-30", reward: "Rs. 100/ref", color: "bg-yellow-100 border-yellow-300", achieved: false },
              { tier: "Platinum", referrals: "31+", reward: "Rs. 150/ref", color: "bg-purple-100 border-purple-300", achieved: false },
            ].map((tier, idx) => (
              <Card key={idx} className={`border-2 ${tier.color} ${tier.achieved ? "ring-2 ring-nexabook-400" : ""}`}>
                <CardContent className="p-4 text-center">
                  <Trophy className={`h-8 w-8 mx-auto mb-2 ${tier.achieved ? "text-nexabook-700" : "text-nexabook-400"}`} />
                  <h3 className="font-bold text-nexabook-900">{tier.tier}</h3>
                  <p className="text-xs text-nexabook-600 mt-1">{tier.referrals} referrals</p>
                  <p className="text-lg font-bold text-nexabook-900 mt-2">{tier.reward}</p>
                  {tier.achieved && <Badge className="mt-2 bg-green-600">Achieved</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
