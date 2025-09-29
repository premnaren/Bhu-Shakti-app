'use client';
import { useState, useRef, ChangeEvent, KeyboardEvent, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CollectionReference, addDoc, serverTimestamp } from 'firebase/firestore';
import { DiagnoseFarmProblemInput, diagnoseFarmProblem } from '@/ai/flows/diagnose-farm-problem';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { Card } from './ui/card';
import Image from 'next/image';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';
import { buttonVariants } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useLanguage } from '@/contexts/language-context';

const formSchema = z.object({
  problemDescription: z.string().trim().min(10, { message: 'Please describe the problem in at least 10 characters.' }).max(1000, { message: 'Description must be 1000 characters or less.' }),
});

interface AddItemFormProps {
  collectionRef: CollectionReference | null;
}

const languageToLocaleMap: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN',
};

export default function AddItemForm({ collectionRef }: AddItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      problemDescription: '',
    },
  });

  const examplePlaceholders = useMemo(() => [
    t('examplePlaceholder1'),
    t('examplePlaceholder2'),
    t('examplePlaceholder3'),
    t('examplePlaceholder4'),
    t('examplePlaceholder5'),
  ], [t]);

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const playAudio = useCallback((audioDataUri: string) => {
    stopAudioPlayback();
    if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        try {
            audioRef.current.play().catch(e => {
                console.warn("Audio playback failed (likely interrupted):", e);
            });
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }
  }, [stopAudioPlayback]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = languageToLocaleMap[language] || 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          form.setValue('problemDescription', transcript, { shouldValidate: true });
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            let description = 'Voice recognition failed. Please try again or type your message.';
            if (event.error === 'network') {
                description = 'Voice recognition failed due to a network issue. Please check your connection.';
            } else if (event.error === 'no-speech') {
                description = 'No speech was detected. Please try again.';
            } else if (event.error === 'not-allowed') {
                description = 'Microphone access was denied. Please allow microphone access in your browser settings.';
            }
            toast({
                variant: 'destructive',
                title: t('errorToastTitle'),
                description: description,
            });
            setIsListening(false);
        };
        recognitionRef.current = recognition;
      }
    }
  }, [language, form, toast, t]);


  useEffect(() => {
    const interval = setInterval(() => {
        setCurrentExampleIndex(prevIndex => (prevIndex + 1) % examplePlaceholders.length);
    }, 5000); // Change example every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [examplePlaceholders.length]);

  const currentExample = examplePlaceholders[currentExampleIndex];

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setFileName(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !form.getValues('problemDescription')) {
      e.preventDefault();
      form.setValue('problemDescription', currentExample, { shouldValidate: true });
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (form.formState.isValid) {
        form.handleSubmit(onSubmit)();
      }
    }
  };

  const handleVoiceInput = () => {
    stopAudioPlayback();
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } else {
         toast({
            variant: 'destructive',
            title: 'Browser Not Supported',
            description: 'Your browser does not support voice recognition.',
        });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    stopAudioPlayback();
    
    try {
      const input: DiagnoseFarmProblemInput = {
        problemDescription: values.problemDescription,
        language: language,
      };

      if (photo) {
        input.photoDataUri = photo;
      }

      const { diagnosis, solution, audioDataUri } = await diagnoseFarmProblem(input);
      
      let toastDescription = t('diagnosisCompleteToast');

      if (collectionRef) {
        await addDoc(collectionRef, {
          problemDescription: values.problemDescription,
          photo,
          diagnosis,
          solution,
          audioDataUri: audioDataUri || null,
          createdAt: serverTimestamp(),
        });
        toastDescription += ` ${t('diagnosisSavedToast')}`;
      } else {
        toastDescription += ` ${t('diagnosisNotSavedToast')}`;
      }

      toast({
        title: t('diagnosisCompleteTitle'),
        description: toastDescription,
      });

      if (audioDataUri) {
        playAudio(audioDataUri);
      }

      form.reset();
      setPhoto(null);
      setFileName(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error diagnosing problem: ', error);
      toast({
        variant: 'destructive',
        title: t('errorToastTitle'),
        description: t('diagnosisErrorToast'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const problemDescriptionValue = form.watch('problemDescription');

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          {!collectionRef && (
             <Alert variant="default" className="bg-secondary">
                <Icons.info className="h-4 w-4" />
                <AlertTitle>{t('workingOffline')}</AlertTitle>
                <AlertDescription>
                    {t('offlineDiagnosisMessage')}
                </AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="problemDescription"
            render={({ field }) => (
              <FormItem>
                 <div className="flex justify-between items-center">
                    <FormLabel>{t('describeTheProblem')}</FormLabel>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {t('press')}
                    <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground opacity-100">
                        Tab
                    </kbd>
                     {t('forAnExample')}
                </div>
                <FormControl>
                    <div className="relative">
                       {!problemDescriptionValue && !isListening && (
                         <span
                          key={currentExample}
                          className="pointer-events-none absolute top-2.5 left-3 text-sm text-muted-foreground/60 animate-slide-up"
                        >
                          {currentExample}
                        </span>
                       )}
                       {isListening && (
                         <span
                          className="pointer-events-none absolute top-2.5 left-3 text-sm text-primary/80 animate-pulse flex items-center gap-2"
                        >
                          <Icons.mic className="h-4 w-4"/> Listening...
                        </span>
                       )}
                        <Textarea
                            placeholder=""
                            className="resize-none bg-background pr-24"
                            rows={4}
                            {...field}
                            onKeyDown={handleKeyDown}
                        />
                         <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <Button type="button" variant={isListening ? "destructive" : "outline"} size="icon" className="h-8 w-8" onClick={handleVoiceInput}>
                                {isListening ? <Icons.micOff/> : <Icons.mic/>}
                                <span className="sr-only">Use microphone</span>
                            </Button>
                            <Button type="submit" size="icon" className="h-8 w-8" disabled={isSubmitting || !form.formState.isValid}>
                                {isSubmitting ? <Icons.spinner className="animate-spin" /> : <Icons.send/>}
                                <span className="sr-only">{t('getSolution')}</span>
                            </Button>
                        </div>
                    </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid md:grid-cols-2 gap-6">
            <FormItem>
              <FormLabel>{t('uploadAPhoto')}</FormLabel>
              <FormControl>
                  <div className="flex items-center gap-2">
                      <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                      <label htmlFor="file-upload" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
                          <Icons.upload />
                          <span>{t('chooseFile')}</span>
                      </label>
                      {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
                  </div>
              </FormControl>
            </FormItem>

            {photo && (
              <div className="relative w-48 h-32 rounded-md overflow-hidden border self-end">
                <Image src={photo} alt="Upload preview" fill={true} className="object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={handleRemovePhoto}
                >
                  <Icons.trash className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>
      <audio ref={audioRef} className="hidden" />
    </Card>
  );
}
