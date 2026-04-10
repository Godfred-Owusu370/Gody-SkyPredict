import { motion } from 'motion/react';

export const RainAnimation = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-0.5 h-4 bg-blue-400/40 rounded-full"
        initial={{ top: -20, left: `${Math.random() * 100}%` }}
        animate={{
          top: '110%',
        }}
        transition={{
          duration: 0.5 + Math.random() * 0.5,
          repeat: Infinity,
          delay: Math.random() * 2,
          ease: "linear"
        }}
      />
    ))}
  </div>
);

export const SunAnimation = () => (
  <div className="absolute top-10 right-10 pointer-events-none">
    <motion.div
      className="w-24 h-24 bg-yellow-400 rounded-full blur-xl opacity-50"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.4, 0.6, 0.4],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div
      className="absolute inset-0 w-24 h-24 bg-yellow-300 rounded-full shadow-[0_0_50px_rgba(253,224,71,0.5)]"
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  </div>
);

export const CloudAnimation = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute bg-white/30 blur-2xl rounded-full"
        style={{
          width: 200 + Math.random() * 200,
          height: 100 + Math.random() * 100,
          top: `${10 + Math.random() * 40}%`,
        }}
        initial={{ left: '-30%' }}
        animate={{
          left: '110%',
        }}
        transition={{
          duration: 20 + Math.random() * 20,
          repeat: Infinity,
          delay: Math.random() * 10,
          ease: "linear"
        }}
      />
    ))}
  </div>
);
