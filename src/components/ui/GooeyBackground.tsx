import { motion } from 'framer-motion';

export const GooeyBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-white z-0">
      <div className="absolute inset-0 gooey flex items-center justify-center">

        {/* Blob 1 */}
        <motion.div
          animate={{
            x: [0, 150, -100, 0],
            y: [0, -150, 100, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.08) 0%, transparent 70%)' }}
          className="absolute w-96 h-96 md:w-[600px] md:h-[600px]"
        />

        {/* Blob 2 */}
        <motion.div
          animate={{
            x: [0, -200, 150, 0],
            y: [0, 200, -150, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%)' }}
          className="absolute w-[400px] h-[400px] md:w-[800px] md:h-[800px]"
        />

        {/* Blob 3 */}
        <motion.div
          animate={{
            x: [0, 100, -200, 0],
            y: [0, 100, -200, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.08) 0%, transparent 70%)' }}
          className="absolute w-80 h-80 md:w-[500px] md:h-[500px]"
        />

        {/* Center Static Anchor Blob */}
        <div
          style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%)' }}
          className="absolute w-64 h-64"
        />

      </div>

      {/* Overlay to dim the blobs slightly for text readability */}
      <div className="absolute inset-0 bg-white/40 z-10" />
    </div>
  );
};
