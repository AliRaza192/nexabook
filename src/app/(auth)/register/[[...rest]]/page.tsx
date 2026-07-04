"use client";

import { motion } from "framer-motion";
import { SignUp } from "@clerk/nextjs";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-nexabook-100">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-4"
          >
            <div className="h-14 w-14 rounded-xl bg-nexabook-900 flex items-center justify-center shadow-lg">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold text-nexabook-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-nexabook-600">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Clerk SignUp Component */}
        <div className="px-8 pb-8">
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0",
                headerTitle: "text-2xl font-bold text-nexabook-900",
                headerSubtitle: "text-nexabook-600",
                formButtonPrimary:
                  "bg-nexabook-900 hover:bg-nexabook-800 text-sm font-medium",
                footerActionLink: "text-nexabook-900 hover:text-nexabook-700",
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-8 pb-6 text-center">
          <p className="text-sm text-nexabook-600">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-nexabook-900 font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
