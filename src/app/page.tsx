"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { FaBolt, FaFileAlt, FaChevronDown, FaHardHat } from "react-icons/fa";
import { motion } from "framer-motion";

export default function LandingPage() {
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // FAQ state: which index is open
  const [openFaq, setOpenFaq] = useState<number | null>(null);


  return (
    <>
      <header className="bg-blue-600 text-white fixed w-full z-50 shadow">
        <nav className="flex justify-between items-center px-6 py-2 w-full relative">
          <div className="flex items-center gap-2">
            <Image src="/Compl.ai Logo sign in.svg" alt="Compl.ai Logo" width={32} height={32} />
            <span className="font-bold text-lg md:text-3xl leading-tight">thinkcompl.<span className="text-blue-200">ai</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-lg">
            <a href="#features" className="hover:underline text-white">Features</a>
            <a href="#pricing" className="hover:underline text-white">Pricing</a>
            <a href="#testimonials" className="hover:underline text-white">Testimonials</a>
            <a href="#faq" className="hover:underline text-white">FAQ</a>
          </div>
          {/* Mobile menu button */}
          <button
            className="md:hidden text-2xl text-white"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <span><FaChevronDown /></span>
          </button>
          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white text-blue-600 rounded shadow-lg flex flex-col z-50 md:hidden">
              <a href="#features" className="px-6 py-3 hover:bg-blue-50 text-blue-600" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="px-6 py-3 hover:bg-blue-50 text-blue-600" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#testimonials" className="px-6 py-3 hover:bg-blue-50 text-blue-600" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
              <a href="#faq" className="px-6 py-3 hover:bg-blue-50 text-blue-600" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </div>
          )}
        </nav>
      </header>
      <main className="pt-12 text-gray-900" style={{ scrollBehavior: 'smooth' }}>
        {/* Hero Section */}
        <motion.section
          id="hero"
          className="text-center py-24 bg-white relative"
          style={{
            backgroundImage: "url('/landing-page-background-with-bulbs.svg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% auto",
            backgroundPosition: "top center",
          }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">Built to think. Designed to comply</h1>
          <p className="text-xl md:text-2xl font-medium text-gray-700 mb-10 max-w-2xl mx-auto">Automated QA/QC with smart documentation and real-time progress — no paperwork, no delays.</p>
          <Link href="/signin" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-lg transition-all duration-150 hover:shadow-blue-400/40 hover:scale-105 hover:text-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Sign in Here</Link>
        </motion.section>
        {/* Features Section */}
        <motion.section id="features" className="py-20 bg-white text-gray-900"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0,1,2].map(idx => (
                <motion.div
                  key={idx}
                  className="bg-gray-50 rounded-lg shadow p-8 text-center cursor-pointer hover:outline hover:outline-blue-600 hover:outline-2 hover:shadow-xl will-change-transform"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  {idx === 0 && <div className="text-blue-600 text-4xl mb-4 flex justify-center"><FaBolt /></div>}
                  {idx === 1 && <div className="text-blue-600 text-4xl mb-4 flex justify-center"><FaHardHat /></div>}
                  {idx === 2 && <div className="text-blue-600 text-4xl mb-4 flex justify-center"><FaFileAlt /></div>}
                  <h3 className="text-xl font-semibold mb-2">
                    {idx === 0 && "Live QA Tracking"}
                    {idx === 1 && "Built for the Field"}
                    {idx === 2 && "Smart Document Control"}
                  </h3>
                  <p>
                    {idx === 0 && <>See real-time progress by system, area, or discipline<br /><span className="italic text-gray-500">Clear oversight from day one to completion.</span></>}
                    {idx === 1 && <>Designed for work in the real world<br /><span className="italic text-gray-500">Fast, intuitive forms that keep technicians moving.</span></>}
                    {idx === 2 && <>Keep QA forms, redlines, and revisions in sync<br /><span className="italic text-gray-500">No more outdated drawings or missing records.</span></>}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        {/* Pricing Section */}
        <motion.section id="pricing" className="py-20 bg-gray-50 text-gray-900"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Pricing Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0,1,2].map(idx => (
                <motion.div
                  key={idx}
                  className={`bg-white rounded-lg shadow p-8 text-center cursor-pointer hover:outline hover:outline-blue-600 hover:outline-2 hover:shadow-xl will-change-transform${idx === 1 ? ' border-blue-600 scale-105' : ''}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  <h3 className="text-xl font-semibold mb-2">
                    {idx === 0 && "Starter"}
                    {idx === 1 && "Professional"}
                    {idx === 2 && "Enterprise"}
                  </h3>
                  <div className="text-3xl font-bold mb-4">
                    {idx === 0 && <>$29<span className="text-base font-normal">/month</span></>}
                    {idx === 1 && <>$79<span className="text-base font-normal">/month</span></>}
                    {idx === 2 && <>$199<span className="text-base font-normal">/month</span></>}
                  </div>
                  <ul className="mb-6 text-gray-600">
                    {idx === 0 && <><li>Basic Features</li><li>2 Team Members</li><li>5GB Storage</li><li>Basic Support</li></>}
                    {idx === 1 && <><li>Advanced Features</li><li>5 Team Members</li><li>20GB Storage</li><li>Priority Support</li></>}
                    {idx === 2 && <><li>All Features</li><li>Unlimited Members</li><li>100GB Storage</li><li>24/7 Support</li></>}
                  </ul>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded transition-all duration-150 hover:shadow-blue-400/40 hover:scale-105 hover:text-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">Choose Plan</button>
                </motion.div>
              ))}
            </div>
        </div>
        </motion.section>
        {/* Testimonials Section */}
        <motion.section id="testimonials" className="py-20 bg-white text-gray-900"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What Our Clients Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[0,1].map(idx => (
                <motion.div
                  key={idx}
                  className="bg-gray-50 rounded-lg shadow p-8 text-center cursor-pointer hover:outline hover:outline-blue-600 hover:outline-2 hover:shadow-xl will-change-transform"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                >
                  {idx === 0 && <Image src="/ceo.jpg" alt="CEO headshot" width={80} height={80} className="rounded-full mx-auto mb-4" />}
                  {idx === 1 && <Image src="/testimonial-1.jpg" alt="Testimonial headshot" width={80} height={80} className="rounded-full mx-auto mb-4" />}
                  <p className="mb-4">
                    {idx === 0 && '"The best investment we\'ve made for our business growth."'}
                    {idx === 1 && '"This platform has revolutionised how we manage our projects."'}
                  </p>
                  <h4 className="font-semibold">
                    {idx === 0 && "Michael Chen"}
                    {idx === 1 && "Diane Whitmore"}
                  </h4>
                  <span className="text-gray-500">
                    {idx === 0 && "CEO, ConstructIT"}
                    {idx === 1 && "Project Manager, InnovateX"}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
        {/* FAQ Section */}
        <motion.section id="faq" className="py-20 bg-gray-50 text-gray-900"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "How does the free trial work?",
                  a: "Our free trial gives you full access to all features for 14 days, no credit card required.",
                },
                {
                  q: "Can I change plans later?",
                  a: "Yes, you can upgrade or downgrade your plan at any time from your account dashboard.",
                },
              ].map((item, idx) => (
                <div key={item.q} className="bg-white rounded-lg shadow p-6">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  >
                    <h3 className="text-lg font-semibold">{item.q}</h3>
                    <span className={`transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`}><FaChevronDown /></span>
                  </div>
                  <div
                    className={`mt-2 text-gray-600 overflow-hidden transition-all duration-300 ${openFaq === idx ? "max-h-40" : "max-h-0"}`}
                    style={{ maxHeight: openFaq === idx ? 160 : 0 }}
                  >
                    {openFaq === idx && <div>{item.a}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
        {/* Contact Section */}
        <section id="contact" className="py-20 bg-white text-gray-900">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Get in Touch</h2>
            <form className="space-y-6">
              <div>
                <input type="text" placeholder="Name" required className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <input type="email" placeholder="Email" required className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <textarea placeholder="Message" required className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[120px]" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition">Send Message</button>
            </form>
          </div>
        </section>
      </main>
      <footer className="bg-blue-600 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <span className="font-bold text-lg md:text-xl leading-tight">thinkcompl.<span className="text-blue-200">ai</span></span>
            <p className="text-gray-200 mt-2">Automated QA/QC and smart documentation for the real world.</p>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </div>
    </div>
        <div className="text-center text-xs text-gray-200 mt-8">&copy; 2025 compl.ai. All rights reserved.</div>
      </footer>
    </>
  );
}
