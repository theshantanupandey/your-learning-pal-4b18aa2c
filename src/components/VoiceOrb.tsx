import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

type Props = {
  isConnected: boolean;
  isConnecting: boolean;
  status: 'idle' | 'connecting' | 'listening' | 'speaking';
};

export default function VoiceOrb({ isConnected, isConnecting, status }: Props) {
  const statusLabels: Record<string, string> = {
    idle: 'Ready to start',
    connecting: 'Connecting…',
    listening: 'Listening…',
    speaking: 'Speaking…',
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        {/* Pulse rings */}
        {isConnected && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            />
          </>
        )}

        {/* Main orb */}
        <motion.div
          className={`w-40 h-40 rounded-full flex items-center justify-center transition-colors duration-500 ${
            isConnected
              ? 'bg-primary shadow-[0_0_60px_hsl(239_84%_67%/0.3)]'
              : isConnecting
              ? 'bg-primary/60'
              : 'bg-muted'
          }`}
          animate={isConnecting ? { scale: [1, 1.05, 1] } : {}}
          transition={isConnecting ? { duration: 1.5, repeat: Infinity } : {}}
        >
          {isConnected ? (
            <div className="flex items-end gap-1.5 h-12">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-primary-foreground rounded-full"
                  animate={{
                    height: status === 'speaking' ? [12, 32 + i * 8, 12] : [8, 16, 8],
                  }}
                  transition={{
                    duration: status === 'speaking' ? 0.5 : 1.2,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          ) : (
            <Phone className="w-12 h-12 text-muted-foreground" />
          )}
        </motion.div>
      </div>

      <p className="text-sm font-medium text-muted-foreground">{statusLabels[status]}</p>
    </div>
  );
}
