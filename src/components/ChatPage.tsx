'use client';
import { useState, useRef, useEffect, Dispatch, SetStateAction, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Icons } from './icons';
import {
  chatWithFarmhand,
  ChatWithFarmhandInput,
  ChatWithFarmhandOutput,
} from '@/ai/flows/conversational-chat-flow';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useLanguage } from '@/contexts/language-context';
import ChatMessageChart from './ChatMessageChart';
import {Content, Part} from 'genkit/model';
import { Badge } from './ui/badge';

export type Message = {
  id: string;
  role: 'user' | 'model' | 'tool';
  type: 'text' | 'chart' | 'thinking' | 'tool';
  content: string | Extract<ChatWithFarmhandOutput, { type: 'chart' }>['data'] | Part[];
  audio?: string;
};

interface ChatPageProps {
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
}

const languageToLocaleMap: Record<string, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    te: 'te-IN',
};


export default function ChatPage({ messages, setMessages }: ChatPageProps) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [currentCapability, setCurrentCapability] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { t, language } = useLanguage();

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
  
  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isSending) return;

    stopAudioPlayback();
    setInput('');
    setIsSending(true);
    setSuggestedQuestions([]);
    setCurrentCapability(null);

    const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = { id: userMessageId, role: 'user', type: 'text', content: messageText };
    
    const aiMessageId = `model-${Date.now()}`;
    const thinkingMessage: Message = { id: aiMessageId, role: 'model', type: 'thinking', content: '...' };
    
    const currentMessages = [...messages, userMessage];
    setMessages([...currentMessages, thinkingMessage]);

    try {
      const history = currentMessages
        .filter(msg => msg.type !== 'thinking') // Exclude thinking messages from history
        .map(msg => {
            if (msg.role === 'model' && msg.type === 'chart') {
                return {
                    role: 'model',
                    content: [
                        { text: `Chart generated: ${JSON.stringify(msg.content)}` }
                    ],
                } as Content;
            }
            if(Array.isArray(msg.content)) {
                return {
                    role: msg.role as 'user' | 'model' | 'tool',
                    content: msg.content,
                } as Content;
            }
            return {
                role: msg.role as 'user' | 'model' | 'tool',
                content: [{ text: msg.content as string }],
            } as Content;
        });

      const chatInput: ChatWithFarmhandInput = {
        message: messageText,
        language: language,
        history: history,
      };

      const response = await chatWithFarmhand(chatInput);

       if (response.type === 'text' && (response.data as string).includes('503 Service Unavailable')) {
          const busyResponse = {
            type: 'text',
            data: "I'm sorry, the AI service is currently very busy. Please try again in a moment.",
            audio: undefined,
          };
          const newAiMessage: Message = {
                id: aiMessageId,
                role: 'model',
                type: 'text',
                content: busyResponse.data,
                audio: busyResponse.audio,
          };
           setMessages((prev) =>
                prev.map((m) => (m.id === aiMessageId ? newAiMessage : m))
            );
          return;
      }
      
      const newAiMessage: Message = {
        id: aiMessageId,
        role: 'model',
        type: response.type as 'text' | 'chart',
        content: response.data as any,
        audio: response.audio
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? newAiMessage : m))
      );

    } catch (error: any) {
      console.error('Error during conversation:', error);
      toast({
        variant: 'destructive',
        title: t('errorToastTitle'),
        description: error.message || t('aiErrorToast'),
      });
      // Remove the thinking message on error, but keep the user message
      setMessages((prev) => prev.filter((m) => m.id !== aiMessageId));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [language, messages, setMessages, toast, t, stopAudioPlayback, isSending]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  // Main effect for initializing and managing speech recognition lifecycle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("Speech recognition not supported in this browser.");
        return;
      };

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false; 
      recognition.interimResults = false;
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'aborted' || event.error === 'no-speech') {
              return;
          }
        
          console.error('Speech recognition error:', event.error);
          let description = 'Voice recognition failed. Please try again or type your message.';
          if (event.error === 'network') {
              description = 'Voice recognition failed due to a network issue. Please check your connection.';
          } else if (event.error === 'not-allowed') {
              description = 'Microphone access was denied. Please allow microphone access in your browser settings.';
          }
          toast({ variant: 'destructive', title: t('errorToastTitle'), description });
      };

      return () => {
          if(recognitionRef.current) {
              recognitionRef.current.abort();
          }
      }
    }
  }, [toast, t, handleSendMessage]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        stopAudioPlayback();
        recognitionRef.current.lang = languageToLocaleMap[language] || 'en-US';
        recognitionRef.current.start();
      } catch(e) {
        console.warn('Speech recognition start failed, likely already starting:', e);
      }
    }
  }, [isListening, stopAudioPlayback, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
         console.warn('Speech recognition stop failed:', e);
      }
    }
  }, [isListening]);

   useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'model' && lastMessage.audio) {
            playAudio(lastMessage.audio);
        }
   }, [messages, playAudio]);


  const handleVoiceInputToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const capabilities = [
    { 
        label: "Weather Forecasts", 
        icon: <Icons.thermometer />,
        relatedQuestions: [
            "What is the 7-day weather forecast for my district?",
            "Will it rain tomorrow?",
            "How windy will it be this afternoon?",
            "What is the humidity level for the next 3 days?",
            "Is there a weather alert for my area?",
            "Show me the temperature trend for the week."
        ]
    },
    { 
        label: "Market Prices", 
        icon: <Icons.market />,
        relatedQuestions: [
            "What is the current market price for wheat?",
            "Which mandi has the best price for tomatoes near me?",
            "Show me the price trend for corn.",
            "Compare market prices for soybean in my district and a neighboring one.",
            "What is the demand for cotton right now?",
            "Find the highest price for my crops nearby."
        ]
    },
    { 
        label: "Farming Suggestions", 
        icon: <Icons.solution />,
        relatedQuestions: [
            "Give me suggestions for pest control.",
            "How can I improve my soil health?",
            "What are the best crop rotation practices?",
            "Tell me about efficient irrigation techniques.",
            "What should I do to prepare for harvesting?",
            "Suggest some organic farming methods."
        ]
    },
    { 
        label: "Seed Information", 
        icon: <Icons.sprout />,
        relatedQuestions: [
            "Tell me about IR-64 rice seeds.",
            "What are some good tomato varieties for my area?",
            "Compare Pioneer 3396 and Syngenta NK30 corn seeds.",
            "What is the average price for wheat seeds?",
            "What are the common diseases for soybean crops?",
            "Find a high-yield, drought-resistant seed."
        ]
    },
  ];

  const handleCapabilityClick = (capability: typeof capabilities[0]) => {
    setCurrentCapability(capability.label);
    const shuffled = [...capability.relatedQuestions].sort(() => 0.5 - Math.random());
    setSuggestedQuestions(shuffled.slice(0, 3));
  };
  
  const handleRefreshSuggestions = () => {
    let capabilityToRefresh = capabilities.find(c => c.label === currentCapability);
    if (!capabilityToRefresh) {
        const randomIndex = Math.floor(Math.random() * capabilities.length);
        capabilityToRefresh = capabilities[randomIndex];
    }
    const shuffled = [...capabilityToRefresh.relatedQuestions].sort(() => 0.5 - Math.random());
    setSuggestedQuestions(shuffled.slice(0, 3));
    setCurrentCapability(capabilityToRefresh.label);
  };


  return (
    <Card className="flex flex-col h-[80vh] shadow-lg">
      <CardHeader>
        <h2 className="text-lg font-semibold text-primary">{t('conversationalAi')}</h2>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Capabilities:</span>
          {capabilities.map(cap => (
             <Button variant="outline" key={cap.label} className="gap-1 py-0.5 px-1.5 h-auto text-xs" onClick={() => handleCapabilityClick(cap)}>
                {cap.icon} {cap.label}
             </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="space-y-6 pr-4">
            {messages.length === 0 && !isSending ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                    <Icons.logo className="w-16 h-16 mb-4 text-primary" />
                    <p className="text-lg font-semibold">{t('askMeAnything')}</p>
                    <p className="text-sm mt-2 mb-4">Click a capability above or type your own question to get started.</p>
                </div>
            ) : (
                messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'model' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback><Icons.logo className="w-5 h-5"/></AvatarFallback>
                  </Avatar>
                )}
                
                {message.type === 'thinking' ? (
                     <div className="max-w-md rounded-lg px-4 py-3 text-sm bg-muted flex items-center">
                        <Icons.spinner className="animate-spin h-5 w-5 mr-2" />
                        {t('thinking')}
                    </div>
                ) : message.type === 'chart' ? (
                    <ChatMessageChart chartData={message.content as any} />
                ) : message.type === 'tool' ? null : (
                    <div
                        className={cn(
                            'max-w-md rounded-lg px-4 py-3 text-sm',
                            message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                        >
                        {message.content as string}
                    </div>
                )}

                 {message.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{t('you')}</AvatarFallback>

                  </Avatar>
                )}
              </div>
            ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4 flex flex-col items-start gap-4">
        {suggestedQuestions.length > 0 && (
            <div className="w-full space-y-2 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Suggestions</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefreshSuggestions}>
                        <Icons.refresh className="h-4 w-4"/>
                        <span className="sr-only">Refresh suggestions</span>
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                        <Button key={i} variant="outline" size="sm" className="text-xs h-auto py-1 px-2" onClick={() => handleSendMessage(q)}>
                           {q}
                         </Button>
                    ))}
                </div>
            </div>
        )}
        <div className="flex w-full items-center gap-2">
            <div className="relative w-full">
              <Input
                ref={inputRef}
                type="text"
                placeholder={isListening ? t('listening') : t('typeYourMessage')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSendMessage(input)}
                disabled={isSending}
                className="pr-12"
              />
               <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1">
                 <Button type="button" variant={isListening ? "destructive" : "ghost"} size="icon" className="h-8 w-8" onClick={handleVoiceInputToggle} disabled={isSending}>
                    {isListening ? <Icons.micOff/> : <Icons.mic/>}
                    <span className="sr-only">Use microphone</span>
                </Button>
               </div>
            </div>
            <Button onClick={() => handleSendMessage(input)} disabled={isSending || !input.trim()} size="icon">
                {isSending ? <Icons.spinner className="animate-spin" /> : <Icons.send/>}
                <span className="sr-only">{t('send')}</span>
            </Button>
        </div>
      </CardFooter>
       <audio ref={audioRef} className="hidden" />
    </Card>
  );
}
