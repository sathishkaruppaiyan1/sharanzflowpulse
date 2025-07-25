
import { useCallback } from 'react';

// Audio context for sound management
let audioContext: AudioContext | null = null;

// Initialize audio context
const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Generate different types of beep sounds
const generateBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  return new Promise<void>((resolve) => {
    const context = initAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
    
    setTimeout(() => resolve(), duration * 1000);
  });
};

export const useSoundNotifications = () => {
  // Error sound - low frequency, harsh tone
  const playErrorSound = useCallback(async () => {
    try {
      await generateBeep(200, 0.3, 'square');
      await new Promise(resolve => setTimeout(resolve, 100));
      await generateBeep(150, 0.3, 'square');
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, []);

  // Success sound - higher frequency, pleasant tone
  const playSuccessSound = useCallback(async () => {
    try {
      await generateBeep(800, 0.2, 'sine');
      await new Promise(resolve => setTimeout(resolve, 50));
      await generateBeep(1000, 0.2, 'sine');
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, []);

  // Warning sound - medium frequency
  const playWarningSound = useCallback(async () => {
    try {
      await generateBeep(400, 0.4, 'triangle');
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, []);

  // Complete sound - ascending tones
  const playCompleteSound = useCallback(async () => {
    try {
      await generateBeep(600, 0.15, 'sine');
      await new Promise(resolve => setTimeout(resolve, 50));
      await generateBeep(800, 0.15, 'sine');
      await new Promise(resolve => setTimeout(resolve, 50));
      await generateBeep(1000, 0.2, 'sine');
    } catch (error) {
      console.log('Audio playback failed:', error);
    }
  }, []);

  return {
    playErrorSound,
    playSuccessSound,
    playWarningSound,
    playCompleteSound
  };
};
