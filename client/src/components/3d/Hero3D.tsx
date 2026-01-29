import { motion } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  Zap,
  CheckCircle2,
  Play,
  BarChart3
} from 'lucide-react';

const FloatingBadge = ({ children, delay = 0, x, y, className = "" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: y + 20, x }}
    animate={{
      opacity: 1,
      y: [y, y - 10, y],
      x: x
    }}
    transition={{
      y: {
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay: delay
      },
      opacity: { duration: 0.5, delay: delay }
    }}
    className={`absolute bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-xl flex items-center gap-2 ${className}`}
  >
    {children}
  </motion.div>
);

const Hero3D = () => {
  return (
    <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[80px]" />
      </div>

      {/* Main Central Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <div className="relative w-80 rounded-3xl bg-gradient-to-b from-gray-900/80 to-black/80 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Trend Alert</span>
            </div>
            <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded-full">
              LIVE
            </span>
          </div>

          {/* Content Mock */}
          <div className="space-y-4">
            <div className="h-32 rounded-xl bg-gradient-to-tr from-blue-900/40 to-purple-900/40 border border-white/5 relative overflow-hidden group">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-3/4 rounded-full bg-gray-700/50" />
              <div className="h-2 w-1/2 rounded-full bg-gray-700/30" />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/5">
              <div className="text-center">
                <p className="text-xs text-gray-400">Viral Score</p>
                <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">98%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Growth</p>
                <p className="text-lg font-bold text-green-400">+450%</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Elements */}
      <FloatingBadge x={-160} y={-100} delay={0.2} className="z-20">
        <div className="p-2 rounded-lg bg-orange-500/20">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <p className="text-xs text-gray-300">Trend Detected</p>
          <p className="text-sm font-bold text-white">#AIRevolution</p>
        </div>
      </FloatingBadge>

      <FloatingBadge x={150} y={-60} delay={0.5} className="z-0">
        <div className="p-2 rounded-lg bg-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>
        <p className="text-sm font-medium text-white">Script Generated</p>
      </FloatingBadge>

      <FloatingBadge x={-140} y={120} delay={0.8} className="z-20">
        <div className="p-2 rounded-lg bg-blue-500/20">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-gray-300">Engagement</p>
          <p className="text-sm font-bold text-white">2.4M Views</p>
        </div>
      </FloatingBadge>

      <FloatingBadge x={160} y={80} delay={1.1} className="z-20">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="text-xs text-gray-300">Revenue</p>
          <p className="text-sm font-bold text-white">$12,450</p>
        </div>
      </FloatingBadge>

    </div>
  );
};

export default Hero3D;
