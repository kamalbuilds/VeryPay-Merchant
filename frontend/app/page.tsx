'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Trees, Shield, Users, TrendingUp, ArrowRight, Leaf, Globe, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [impactStats, setImpactStats] = useState({
    carbonOffset: 0,
    communitiesSupported: 0,
    hectaresProtected: 0,
    creditsTraded: 0
  });

  useEffect(() => {
    // Animate counter effect
    const animateValue = (start: number, end: number, duration: number, setter: (value: number) => void) => {
      const range = end - start;
      const increment = range / (duration / 16);
      let current = start;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setter(end);
          clearInterval(timer);
        } else {
          setter(Math.floor(current));
        }
      }, 16);
    };

    animateValue(0, 15420, 2000, (val) => setImpactStats(prev => ({ ...prev, carbonOffset: val })));
    animateValue(0, 127, 2000, (val) => setImpactStats(prev => ({ ...prev, communitiesSupported: val })));
    animateValue(0, 48500, 2000, (val) => setImpactStats(prev => ({ ...prev, hectaresProtected: val })));
    animateValue(0, 3842, 2000, (val) => setImpactStats(prev => ({ ...prev, creditsTraded: val })));
  }, []);

  const features = [
    {
      icon: <Trees className="w-6 h-6" />,
      title: 'Community Impact Zones',
      description: 'Register and monitor conservation areas with AI-powered satellite and sensor analysis',
      color: 'from-green-400 to-emerald-600'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Verified Credits',
      description: 'Generate carbon, biodiversity, water, and soil credits through Hedera Guardian',
      color: 'from-blue-400 to-indigo-600'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'ReFi Marketplace',
      description: 'Trade environmental assets and stake in conservation pools for sustainable yields',
      color: 'from-purple-400 to-pink-600'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Real-time Impact',
      description: 'Track environmental improvements and community benefits with transparent metrics',
      color: 'from-amber-400 to-orange-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-green-950 dark:via-blue-950 dark:to-purple-950 opacity-50" />
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -top-20 -left-20 w-96 h-96 bg-green-300 dark:bg-green-700 rounded-full opacity-10 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-300 dark:bg-blue-700 rounded-full opacity-10 blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent mb-6">
              EcoNexus
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              The Regenerative Impact Marketplace connecting local environmental actions to global ReFi markets
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
                >
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link href="/marketplace">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  Explore Marketplace
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                {impactStats.carbonOffset.toLocaleString()}t
              </div>
              <div className="text-gray-600 dark:text-gray-400">CO₂ Sequestered</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {impactStats.communitiesSupported}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Communities Supported</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                {impactStats.hectaresProtected.toLocaleString()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Hectares Protected</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {impactStats.creditsTraded.toLocaleString()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Credits Traded</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Transforming Conservation with Technology
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Leverage AI, blockchain, and community engagement to create measurable environmental impact
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-500 to-blue-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Join the Regenerative Revolution
            </h2>
            <p className="text-xl text-green-50 mb-8">
              Start making a measurable impact on our planet today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-green-600 font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              >
                Register Your Zone
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-green-600 text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-shadow border-2 border-white"
              >
                Become an Investor
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How EcoNexus Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Register & Monitor
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Communities register conservation zones and our AI monitors environmental health 24/7
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Generate Credits
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Verified environmental improvements generate tradeable carbon and biodiversity credits
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Trade & Earn
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Trade credits on the marketplace or stake in ReFi pools for sustainable yields
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
