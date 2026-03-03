import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import {
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useSignClinicalNote,
  useGenerateClinicalNote,
  useTranscribeAudio,
  useUploadClinicalAudio,
} from '@/hooks/useClinicalNotes';
import { toast } from 'sonner';
import {
  Mic, MicOff, Pause, Play, Square, FileText, Wand2,
  Copy, Save, PenLine, Loader2, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  contactId: string;
  contactName?: string;
  onSaved?: () => void;
}

type Step = 'capture' | 'transcription' | 'review';
type InputMode = 'recording' | 'dictation' | 'text';
type Template = 'soap' | 'narrative';

export function ClinicalNoteRecorder({ contactId, contactName, onSaved }: Props) {
  const [step, setStep] = useState<Step>('capture');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [template, setTemplate] = useState<Template>('soap');
  const [transcript, setTranscript] = useState('');
  const [soapData, setSoapData] = useState({ subjective: '', objective: '', analysis: '', plan: '' });
  const [fullNote, setFullNote] = useState('');
  const [noteId, setNoteId] = useState<string | null>(null);

  const recorder = useAudioRecorder();
  const createNote = useCreateClinicalNote();
  const updateNote = useUpdateClinicalNote();
  const signNote = useSignClinicalNote();
  const generateNote = useGenerateClinicalNote();
  const transcribeAudio = useTranscribeAudio();
  const uploadAudio = useUploadClinicalAudio();

  const isGenerating = generateNote.isPending;
  const isTranscribing = transcribeAudio.isPending;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStopRecording = async () => {
    recorder.stop();
  };

  const handleTranscribe = async () => {
    const blob = recorder.blob;
    if (!blob) return;

    try {
      // Upload audio
      const audioPath = await uploadAudio.mutateAsync(blob);

      // Convert to base64 and transcribe
      const base64 = await recorder.blobToBase64(blob);
      const result = await transcribeAudio.mutateAsync({
        audio_base64: base64,
        mime_type: 'audio/webm',
      });

      setTranscript(result.transcript);
      setStep('transcription');
    } catch {
      // errors handled by mutation hooks
    }
  };

  const handleTextNext = () => {
    if (!transcript.trim()) {
      toast.error('Escribe o pega la transcripción');
      return;
    }
    setStep('transcription');
  };

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      toast.error('No hay transcripción para generar la nota');
      return;
    }

    try {
      const result = await generateNote.mutateAsync({
        transcript,
        template,
        patient_context: contactName ? `Paciente: ${contactName}` : undefined,
      });

      if (template === 'soap') {
        setSoapData({
          subjective: result.subjective || '',
          objective: result.objective || '',
          analysis: result.analysis || '',
          plan: result.plan || '',
        });
      } else {
        setFullNote(result.full_note || '');
      }

      setStep('review');
    } catch {
      // handled
    }
  };

  const handleSaveDraft = async () => {
    try {
      if (!noteId) {
        const note = await createNote.mutateAsync({
          contact_id: contactId,
          input_mode: inputMode,
          template_used: template,
          raw_transcript: transcript,
        });
        setNoteId(note.id);

        const updates: any = { status: 'completed' };
        if (template === 'soap') {
          Object.assign(updates, soapData);
        } else {
          updates.full_note = fullNote;
        }
        await updateNote.mutateAsync({ noteId: note.id, updates });
      } else {
        const updates: any = { raw_transcript: transcript, status: 'completed' };
        if (template === 'soap') {
          Object.assign(updates, soapData);
        } else {
          updates.full_note = fullNote;
        }
        await updateNote.mutateAsync({ noteId, updates });
      }
      toast.success('Nota guardada como borrador');
      onSaved?.();
    } catch {
      // handled
    }
  };

  const handleSign = async () => {
    if (!noteId) await handleSaveDraft();
    if (noteId) {
      await signNote.mutateAsync(noteId);
      onSaved?.();
    }
  };

  const handleCopy = () => {
    let text = '';
    if (template === 'soap') {
      text = `S: ${soapData.subjective}\n\nO: ${soapData.objective}\n\nA: ${soapData.analysis}\n\nP: ${soapData.plan}`;
    } else {
      text = fullNote;
    }
    navigator.clipboard.writeText(text);
    toast.success('Nota copiada al portapapeles');
  };

  const soapSections = [
    { key: 'subjective', label: 'S — Subjetivo', color: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' },
    { key: 'objective', label: 'O — Objetivo', color: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' },
    { key: 'analysis', label: 'A — Análisis', color: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20' },
    { key: 'plan', label: 'P — Plan', color: 'border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['Captura', 'Transcripción', 'Revisión'].map((label, i) => {
          const steps: Step[] = ['capture', 'transcription', 'review'];
          const isActive = step === steps[i];
          const isDone = steps.indexOf(step) > i;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : null}
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Template selector */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={template === 'soap' ? 'default' : 'outline'}
          onClick={() => setTemplate('soap')}
        >
          SOAP
        </Button>
        <Button
          size="sm"
          variant={template === 'narrative' ? 'default' : 'outline'}
          onClick={() => setTemplate('narrative')}
        >
          Narrativo
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: CAPTURE */}
        {step === 'capture' && (
          <motion.div key="capture" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as InputMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="recording" className="gap-1"><Mic className="h-3 w-3" />Grabar</TabsTrigger>
                <TabsTrigger value="dictation" className="gap-1"><PenLine className="h-3 w-3" />Dictar</TabsTrigger>
                <TabsTrigger value="text" className="gap-1"><FileText className="h-3 w-3" />Texto</TabsTrigger>
              </TabsList>

              <TabsContent value="recording" className="mt-4">
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center gap-4">
                    <div className="text-4xl font-mono tabular-nums">{formatTime(recorder.duration)}</div>
                    <div className="flex gap-3">
                      {!recorder.isRecording && !recorder.blob && (
                        <Button onClick={recorder.start} size="lg" className="gap-2">
                          <Mic className="h-5 w-5" />Iniciar grabación
                        </Button>
                      )}
                      {recorder.isRecording && (
                        <>
                          <Button variant="outline" size="icon" onClick={recorder.isPaused ? recorder.resume : recorder.pause}>
                            {recorder.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                          <Button variant="destructive" size="icon" onClick={handleStopRecording}>
                            <Square className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {recorder.blob && !recorder.isRecording && (
                        <>
                          <Button onClick={handleTranscribe} disabled={isTranscribing} className="gap-2">
                            {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            Transcribir con IA
                          </Button>
                          <Button variant="outline" onClick={recorder.reset}>Reiniciar</Button>
                        </>
                      )}
                    </div>
                    {recorder.isRecording && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        Grabando...
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dictation" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">Usa el dictado de tu dispositivo para transcribir la consulta.</p>
                    <Textarea
                      placeholder="Presiona el ícono de micrófono en tu teclado y comienza a hablar..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={10}
                    />
                    <Button onClick={handleTextNext} disabled={!transcript.trim()}>Continuar</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Textarea
                      placeholder="Escribe o pega la transcripción de la consulta médica..."
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={10}
                    />
                    <Button onClick={handleTextNext} disabled={!transcript.trim()}>Continuar</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* STEP 2: TRANSCRIPTION REVIEW */}
        {step === 'transcription' && (
          <motion.div key="transcription" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transcripción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={12}
                  placeholder="Transcripción de la consulta..."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('capture')}>Atrás</Button>
                  <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Generar Nota con IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            {template === 'soap' ? (
              soapSections.map((section) => (
                <div key={section.key} className={`border-l-4 rounded-lg p-4 ${section.color}`}>
                  <label className="text-sm font-semibold mb-2 block">{section.label}</label>
                  <Textarea
                    value={soapData[section.key]}
                    onChange={(e) => setSoapData({ ...soapData, [section.key]: e.target.value })}
                    rows={4}
                    className="bg-background/80"
                  />
                </div>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nota Narrativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={fullNote}
                    onChange={(e) => setFullNote(e.target.value)}
                    rows={16}
                  />
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setStep('transcription')}>Atrás</Button>
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />Copiar
              </Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={createNote.isPending || updateNote.isPending} className="gap-2">
                <Save className="h-4 w-4" />Guardar borrador
              </Button>
              <Button onClick={handleSign} disabled={signNote.isPending} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />Firmar nota
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
