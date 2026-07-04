"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Menu,
  X,
  FileText,
  Package,
  Monitor,
  Users,
  Factory,
  Handshake,
  Building2,
  MapPin,
  ArrowRight,
  Check,
  Flag,
  Github,
  Twitter,
  Linkedin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: FileText,
    title: "Sales & Invoicing",
    description: "Create professional invoices, quotations, and manage recurring billing effortlessly.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Real-time stock tracking, multi-warehouse support, and automated reorder alerts.",
  },
  {
    icon: Monitor,
    title: "Point of Sale",
    description: "Lightning-fast checkout with shift management and real-time sales reporting.",
  },
  {
    icon: Users,
    title: "HR & Payroll",
    description: "Complete employee lifecycle management with automated payroll processing.",
  },
  {
    icon: Factory,
    title: "Manufacturing",
    description: "BOM management, job orders, and production planning made simple.",
  },
  {
    icon: Handshake,
    title: "CRM",
    description: "Lead tracking, support tickets, and customer loyalty programs in one place.",
  },
  {
    icon: Building2,
    title: "Fixed Assets",
    description: "Asset register management with automated depreciation calculations.",
  },
  {
    icon: MapPin,
    title: "Multi-Branch",
    description: "Manage multiple locations with consolidated reporting and branch-wise analytics.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for freelancers and small businesses getting started",
    features: [
      "Up to 50 invoices/month",
      "Basic inventory tracking",
      "1 user account",
      "Email support",
      "Basic reports",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Professional",
    price: "Rs. 2,999",
    period: "/month",
    description: "Ideal for growing businesses that need more power",
    features: [
      "Unlimited invoices",
      "Advanced inventory & POS",
      "Up to 10 users",
      "HR & Payroll module",
      "100+ reports",
      "Priority support",
      "FBR & SRB compliance",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with complex requirements",
    features: [
      "Everything in Professional",
      "Unlimited users",
      "Multi-branch support",
      "Manufacturing module",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise deployment option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-nexabook-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-nexabook-900 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-nexabook-900">NexaBook</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-nexabook-600 hover:text-nexabook-900 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-nexabook-600 hover:text-nexabook-900 transition-colors">
                Pricing
              </a>
              <a href="#compliance" className="text-nexabook-600 hover:text-nexabook-900 transition-colors">
                Compliance
              </a>
              <Link href="/login">
                <Button variant="ghost" className="text-nexabook-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-nexabook-900 hover:bg-nexabook-800 text-white">
                  Try NexaBook Free
                </Button>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-nexabook-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-nexabook-100 bg-white"
          >
            <div className="px-4 py-4 space-y-3">
              <a
                href="#features"
                className="block text-nexabook-600 hover:text-nexabook-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="block text-nexabook-600 hover:text-nexabook-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#compliance"
                className="block text-nexabook-600 hover:text-nexabook-900 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Compliance
              </a>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-nexabook-900 hover:bg-nexabook-800">
                  Try NexaBook Free
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-nexabook-900 via-nexabook-800 to-nexabook-900 text-white py-20 lg:py-32">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium border border-white/20">
                <Star className="h-4 w-4 text-yellow-400" />
                Built for Pakistani Businesses — Now in Early Access

              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            >
              The All-in-One Operating System for Your Business.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-nexabook-200 mb-8 max-w-2xl mx-auto"
            >
              Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register">
                <Button size="lg" className="bg-white text-nexabook-900 hover:bg-nexabook-100 w-full sm:w-auto px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto px-8"
              >
                Book Demo
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8"
          >
           {[
              { value: "Beta", label: "Early Access" },
              { value: "Free", label: "Starter Plan Always" },
              { value: "PKR", label: "Pakistan First" },
              { value: "99.9%", label: "Uptime SLA Target" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                className="text-center"
              >
                <div className="text-3xl lg:text-4xl font-bold text-nexabook-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-nexabook-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-nexabook-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-4xl font-bold text-nexabook-900 mb-4"
            >
              Everything You Need to Run Your Business
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-nexabook-600 max-w-2xl mx-auto"
            >
              From sales to payroll, inventory to manufacturing — all modules seamlessly integrated.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full hover:shadow-lg transition-shadow border-nexabook-100">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-nexabook-900 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg text-nexabook-900">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-nexabook-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardContent className="py-12">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                      <Flag className="h-12 w-12 text-green-600" />
                    </div>
                  </div>
                  <div className="text-center lg:text-left">
                   <h3 className="text-2xl lg:text-3xl font-bold text-nexabook-900 mb-4">
                      FBR & SRB Compliance — Designed for Pakistan
                    </h3>
                    <p className="text-lg text-nexabook-600 mb-6">
                      NexaBook is being built with Pakistan&apos;s Federal Board of Revenue (FBR) and Sindh Revenue Board (SRB) regulations in mind. Tax-compliant invoices, structured tax calculations, and audit-ready reports — coming in our next release.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium">
                        <Check className="h-4 w-4" />
                        FBR Ready (Roadmap)
                      </span>
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium">
                        <Check className="h-4 w-4" />
                        SRB Structured
                      </span>
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-medium">
                        <Check className="h-4 w-4" />
                        Tax Calculation Built-in
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-nexabook-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-4xl font-bold text-nexabook-900 mb-4"
            >
              Simple, Transparent Pricing
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-nexabook-600 max-w-2xl mx-auto"
            >
              Start free and scale as your business grows. No hidden fees.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {pricingPlans.map((plan) => (
              <motion.div key={plan.name} variants={fadeInUp}>
                <Card
                  className={`h-full relative ${
                    plan.popular
                      ? "border-2 border-nexabook-900 shadow-xl scale-105"
                      : "border-nexabook-200"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-nexabook-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl text-nexabook-900">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-nexabook-900">{plan.price}</span>
                      {plan.period && (
                        <span className="text-nexabook-600">{plan.period}</span>
                      )}
                    </div>
                    <CardDescription className="mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-nexabook-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className="block">
                      <Button
                        className={`w-full ${
                          plan.popular
                            ? "bg-nexabook-900 hover:bg-nexabook-800"
                            : "bg-white border-nexabook-900 text-nexabook-900 hover:bg-nexabook-50"
                        }`}
                        variant={plan.popular ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-nexabook-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl lg:text-4xl font-bold mb-4">
              Ready to Transform Your Business?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-nexabook-200 mb-8">
              Be among the first to experience NexaBook — Pakistan&apos;s modern accounting platform built for real businesses.
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-nexabook-900 hover:bg-nexabook-100 w-full sm:w-auto px-8">
                  Start Free Trial
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto px-8"
              >
                Schedule a Demo
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-nexabook-950 text-nexabook-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-nexabook-900" />
                </div>
                <span className="text-xl font-bold text-white">NexaBook</span>
              </div>
              <p className="text-nexabook-400 mb-4 max-w-md">
                The all-in-one operating system for your business. Invoicing, inventory, payroll, and accounting — localized for Pakistan and built for the world.
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  <Github className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#compliance" className="hover:text-white transition-colors">Compliance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-nexabook-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-nexabook-500">
              © 2026 NexaBook. All rights reserved.
            </p>
            <p className="text-sm text-nexabook-500 flex items-center gap-2">
              Made with ❤️ for Accountants by <span className="text-white font-medium">NexaBook</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
