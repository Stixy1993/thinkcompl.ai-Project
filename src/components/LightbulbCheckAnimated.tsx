"use client";
import { motion } from "framer-motion";

/**
 * Animated SVG lightbulb with checkmark.
 * - Bulb outline draws first, then base lines, then checkmark.
 * - Total animation duration: 2 seconds.
 */
export default function LightbulbCheckAnimated({ className = "w-40 h-40" }: { className?: string }) {
  // Animation timing (in seconds)
  const outlineDuration = 1.2;
  const baseDuration = 0.3;
  const checkDuration = 0.5;
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bulb outline */}
      <motion.path
        d="M40 80c0-33 27-60 60-60s60 27 60 60c0 22-12 41-30 52v8a10 10 0 0 1-10 10H80a10 10 0 0 1-10-10v-8C52 121 40 102 40 80z"
        stroke="#374151"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: outlineDuration, ease: "easeInOut" }}
      />
      {/* Base lines */}
      <motion.line
        x1="70" y1="140" x2="110" y2="140"
        stroke="#374151"
        strokeWidth={6}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: baseDuration,
          ease: "easeInOut",
          delay: outlineDuration
        }}
      />
      <motion.line
        x1="75" y1="150" x2="105" y2="150"
        stroke="#374151"
        strokeWidth={6}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: baseDuration,
          ease: "easeInOut",
          delay: outlineDuration + baseDuration
        }}
      />
      {/* Checkmark */}
      <motion.path
        d="M85 90l15 15 25-30"
        stroke="#22c7fa"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: checkDuration,
          ease: "easeInOut",
          delay: outlineDuration + 2 * baseDuration
        }}
      />
    </svg>
  );
} 