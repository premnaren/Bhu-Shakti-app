'use client';
import { useState, useRef, useCallback } from 'react';
import { DocumentData, doc, deleteDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { enUS, hi, te } from 'date-fns/locale';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useLanguage } from '@/contexts/language-context';


interface DataItemProps {
  item: DocumentData;
}

const locales: Record<string, Locale> = {
    en: enUS,
    hi: hi,
    te: te,
};


export default function DataItem({ item }: DataItemProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const currentLocale = locales[language] || enUS;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudioPlayback = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const playAudio = useCallback((audioDataUri: string) => {
    stopAudioPlayback();
    if (audioRef.current) {
        audioRef.current.src = audioDataUri;
        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(e => {
            console.warn("Audio playback failed:", e);
            toast({ variant: 'destructive', title: "Playback Error", description: "Could not play audio." });
        });
        audioRef.current.onended = () => {
            setIsPlaying(false);
        };
    }
  }, [stopAudioPlayback, toast]);


  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const db = getFirebaseFirestore();
      if (!db) {
          toast({
            variant: 'destructive',
            title: t('deletionFailed'),
            description: "Database not available.",
          });
          setIsDeleting(false);
          return;
      }
      const docRef = doc(db, item.ref.path);
      await deleteDoc(docRef);
      toast({
        title: t('deleted'),
        description: t('diagnosisDeleted'),
      });
      setIsDeleteDialogOpen(false); 
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        variant: 'destructive',
        title: t('deletionFailed'),
        description: t('deletionFailedDescription'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePlayAudio = () => {
    if (isPlaying) {
        stopAudioPlayback();
    } else if (item.audioDataUri) {
        playAudio(item.audioDataUri);
    } else {
        toast({ variant: 'destructive', title: "No Audio", description: "No audio is available for this diagnosis." });
    }
  }

  const createdAt = item.createdAt?.toDate();

  return (
    <>
      <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 animate-in fade-in-50">
        <CardHeader className="flex-row justify-between items-start">
            <div>
                <CardTitle>{t('aiDiagnosis')}</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePlayAudio}>
                {isPlaying ? <Icons.x className="h-4 w-4" /> : <Icons.headphones className="h-4 w-4 text-primary" />}
                <span className="sr-only">Play Diagnosis</span>
            </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0 flex-grow space-y-4">
            {item.photo && (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                <Image src={item.photo} alt="Farm problem" fill={true} className="object-cover" />
              </div>
            )}
            
            <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{t('problemDescription')}</p>
                <p className="text-sm">{item.problemDescription}</p>
            </div>
            
            <Separator/>

            <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('diagnosis')}</p>
                <div className="flex items-center gap-2">
                     <Badge variant={item.diagnosis.isHealthy ? 'default' : 'destructive'}>
                        {item.diagnosis.isHealthy ? t('healthy') : t('unhealthy')}
                     </Badge>
                     <p className="font-semibold">{item.diagnosis.isHealthy ? t('noIssuesFound') : item.diagnosis.issue}</p>
                </div>
                <p className="text-sm">{item.diagnosis.details}</p>
            </div>

            <Separator/>

             <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t('recommendedSolution')}</p>
                <p className="font-semibold">{item.solution.recommendation}</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                    {item.solution.steps.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                </ul>
            </div>

        </CardContent>
        <CardFooter className="p-4 bg-muted/50 border-t flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {createdAt ? `${formatDistanceToNow(createdAt, { addSuffix: true, locale: currentLocale })}` : t('justNow')}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
            aria-label={t('deleteItem')}
          >
            <Icons.trash className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <audio ref={audioRef} className="hidden" />
    </>
  );
}
