import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, MicOff, Settings, ToggleRight, ToggleLeft, AlertCircle, X } from 'lucide-react';
import { saveVoiceLog } from '../services/hotelService';

export const VoiceRecorder: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false); // Permission/Feature State
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyPrompt, setShowDailyPrompt] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
     // 1. Load preference
     const pref = localStorage.getItem('nexus_mic_enabled');
     setIsEnabled(pref === 'true');

     // 2. Daily Prompt Logic
     const lastPromptDate = localStorage.getItem('nexus_mic_last_prompt');
     const today = new Date().toDateString();

     // If it's a new day AND the user hasn't explicitly enabled it, ask again.
     if (lastPromptDate !== today) {
        setShowDailyPrompt(true);
     }
  }, []);

  const handleDailyPromptResponse = (allow: boolean) => {
     const today = new Date().toDateString();
     localStorage.setItem('nexus_mic_last_prompt', today);
     setShowDailyPrompt(false);

     if (allow) {
        setIsEnabled(true);
        localStorage.setItem('nexus_mic_enabled', 'true');
        // Optionally try to trigger permission immediately to clear browser prompt
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => { 
             stream.getTracks().forEach(t => t.stop()); 
          })
          .catch(e => console.warn("Permission denied", e));
     } else {
        setIsEnabled(false);
        localStorage.setItem('nexus_mic_enabled', 'false');
     }
  };

  const toggleEnabled = () => {
     const newState = !isEnabled;
     setIsEnabled(newState);
     localStorage.setItem('nexus_mic_enabled', String(newState));
  };

  const startRecording = async () => {
    if (!isEnabled) {
        alert("Microphone is Disallowed. Please enable it in settings or reload for the daily prompt.");
        return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        try {
            await saveVoiceLog(blob, duration);
        } catch (e) {
            console.error("Failed to save log", e);
        }
        setIsProcessing(false);
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or not available", err);
      alert("System could not access microphone. Please check browser permissions.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // COMPLETE HIDE LOGIC: If disabled AND no daily prompt pending, hide the entire component.
  if (!isEnabled && !showDailyPrompt) {
      return null;
  }

  if (isProcessing) {
    return (
        <button disabled className="fixed bottom-4 left-4 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center cursor-not-allowed opacity-80">
            <Loader2 className="animate-spin" size={24} />
        </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
        {/* Daily Permission Request Banner */}
        {showDailyPrompt && (
           <div className="bg-slate-800 text-white p-4 rounded-xl shadow-2xl mb-2 max-w-xs animate-bounce-in border border-slate-600 z-50">
              <div className="flex justify-between items-start mb-2">
                 <h4 className="font-bold text-sm flex items-center"><AlertCircle size={16} className="mr-2 text-indigo-400"/> Daily Check</h4>
                 <button onClick={() => handleDailyPromptResponse(false)} className="text-slate-400 hover:text-white"><X size={16}/></button>
              </div>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                 Do you want to <strong>Allow</strong> or <strong>Disallow</strong> microphone usage for AI fraud detection today?
              </p>
              <div className="flex gap-2">
                 <button 
                    onClick={() => handleDailyPromptResponse(false)} 
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-red-300 border border-slate-600"
                 >
                    Disallow
                 </button>
                 <button 
                    onClick={() => handleDailyPromptResponse(true)} 
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/30"
                 >
                    Allow
                 </button>
              </div>
           </div>
        )}

        {/* ONLY Render Controls if Enabled */}
        {isEnabled && (
            <>
                {showSettings && (
                    <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200 mb-2 animate-slideUp w-48">
                        <h5 className="font-bold text-slate-800 text-xs uppercase mb-3 border-b pb-2">Recorder Settings</h5>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-xs font-bold ${isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isEnabled ? 'Allowed' : 'Disallowed'}
                            </span>
                            <button onClick={toggleEnabled} className={`transition-colors ${isEnabled ? 'text-emerald-500' : 'text-slate-300'}`}>
                                {isEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                            {isEnabled ? "Microphone is active for security logs." : "Microphone input is completely blocked."}
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-3 rounded-full shadow-xl transition-all duration-300 flex items-center gap-2 ${
                        isRecording ? 'bg-red-500 hover:bg-red-600 pr-4 animate-pulse text-white' : 'bg-slate-800 hover:bg-indigo-600 text-white'
                    }`}
                    title={isRecording ? "Stop & Save Log" : "Record Voice Log"}
                    >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                    {isRecording && <span className="text-xs font-bold uppercase tracking-wider">Recording</span>}
                    </button>

                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`bg-white p-2 rounded-full shadow-md border border-slate-200 hover:bg-slate-50 ${showSettings ? 'text-indigo-600 ring-2 ring-indigo-100' : 'text-slate-500'}`}
                        title="Microphone Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </>
        )}
    </div>
  );
};