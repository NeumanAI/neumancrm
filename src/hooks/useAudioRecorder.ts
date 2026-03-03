import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  blob: Blob | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    blob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000);
      setState(s => ({ ...s, duration: elapsed }));
    }, 1000);
  }, [clearTimer]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setState(s => ({ ...s, blob, isRecording: false, isPaused: false }));
        stream.getTracks().forEach(t => t.stop());
        clearTimer();
      };

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      setState({ isRecording: true, isPaused: false, duration: 0, blob: null });
      startTimer();
    } catch (err) {
      console.error('Microphone access denied', err);
      throw err;
    }
  }, [startTimer, clearTimer]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearTimer();
      setState(s => ({ ...s, isPaused: true }));
    }
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      setState(s => ({ ...s, isPaused: false }));
    }
  }, [startTimer]);

  const reset = useCallback(() => {
    stop();
    clearTimer();
    setState({ isRecording: false, isPaused: false, duration: 0, blob: null });
  }, [stop, clearTimer]);

  const blobToBase64 = useCallback(async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  useEffect(() => {
    return () => { clearTimer(); };
  }, [clearTimer]);

  return {
    ...state,
    start,
    stop,
    pause,
    resume,
    reset,
    blobToBase64,
  };
}
