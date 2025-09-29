
'use client';

import { ChangeEvent, Dispatch, SetStateAction, useRef, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button, buttonVariants } from './ui/button';
import { Icons } from './icons';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { indianStatesAndDistricts } from '@/lib/indian-states-districts';
import { SidebarMenuButton } from './ui/sidebar';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { submitFeedback } from '@/ai/flows/submit-feedback-flow';

interface User {
  uid: string;
  displayName: string;
  bio: string;
  photoURL: string;
  phoneNumber: string;
  email: string;
  village: string;
  district: string;
  state: string;
  landNumber: string;
}

interface SettingsSheetProps {
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
}

export default function SettingsSheet({ user, setUser }: SettingsSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUser((prevUser) => ({ ...prevUser, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setUser((prevUser) => ({
      ...prevUser,
      [id]: value,
    }));
  };
  
  const handleSelectChange = (id: string, value: string) => {
     setUser((prevUser) => {
        const newState = {
            ...prevUser,
            [id]: value,
        };
        if (id === 'state') {
            newState.district = ''; // Reset district when state changes
        }
        return newState;
    });
  }

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        variant: 'destructive',
        title: 'Feedback cannot be empty',
        description: 'Please write your feedback before submitting.',
      });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({ feedback, userId: user.uid });
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your valuable input! It has been saved.',
      });
      setFeedback('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'There was a problem saving your feedback. Please try again.',
      });
    } finally {
        setIsSubmittingFeedback(false);
    }
  };
  
  const states = Object.keys(indianStatesAndDistricts);
  const districts = user.state ? indianStatesAndDistricts[user.state as keyof typeof indianStatesAndDistricts] : [];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <SidebarMenuButton tooltip={t('settings')}>
            <Icons.settings />
            <span>{t('settings')}</span>
        </SidebarMenuButton>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('settings')}</SheetTitle>
          <SheetDescription>
            {t('manageProfilePreferences')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-6">
            <ScrollBar />
            <div className="grid gap-6 py-6">
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="hidden"
                    />
                    <label htmlFor="photo-upload" className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}>
                        <Icons.camera />
                        <span>{t('changePhoto')}</span>
                    </label>
                </div>
                
                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('userDetails')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="displayName" className="text-right">
                    {t('username')}
                    </Label>
                    <Input id="displayName" value={user.displayName} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="bio" className="text-right pt-2">
                    {t('bio')}
                    </Label>
                    <Textarea id="bio" value={user.bio} onChange={handleInputChange} className="col-span-3" rows={3}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="uid" className="text-right">
                    {t('farmerId')}
                    </Label>
                    <Input id="uid" value={user.uid} readOnly disabled className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phoneNumber" className="text-right">
                    {t('phone')}
                    </Label>
                    <Input id="phoneNumber" value={user.phoneNumber} onChange={handleInputChange} className="col-span-3" type="tel" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                    {t('email')}
                    </Label>
                    <Input id="email" value={user.email} onChange={handleInputChange} className="col-span-3" type="email" />
                </div>
                
                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('location')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="state" className="text-right">
                      {t('state')}
                    </Label>
                     <Select value={user.state} onValueChange={(value) => handleSelectChange('state', value)}>
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder={t('selectAState')} />
                          </SelectTrigger>
                          <SelectContent>
                              {states.map(state => (
                                  <SelectItem key={state} value={state}>{state}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="district" className="text-right">
                      {t('district')}
                    </Label>
                     <Select value={user.district} onValueChange={(value) => handleSelectChange('district', value)} disabled={!user.state}>
                          <SelectTrigger className="col-span-3">
                              <SelectValue placeholder={t('selectADistrict')} />
                          </SelectTrigger>
                          <SelectContent>
                              {districts.map(district => (
                                  <SelectItem key={district} value={district}>{district}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="village" className="text-right">
                    {t('village')}
                    </Label>
                    <Input id="village" value={user.village} onChange={handleInputChange} className="col-span-3" />
                </div>
                
                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('landDetails')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="landNumber" className="text-right">
                    {t('landNumber')}
                    </Label>
                    <Input id="landNumber" value={user.landNumber} onChange={handleInputChange} className="col-span-3" />
                </div>

                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('preferences')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="language" className="text-right">
                    {t('language')}
                  </Label>
                  <Select
                    value={language}
                    onValueChange={setLanguage}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t('selectALanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t('english')}</SelectItem>
                      <SelectItem value="te">{t('telugu')}</SelectItem>
                      <SelectItem value="hi">{t('hindi')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">Feedback</h3>
                 <div className="grid w-full gap-2">
                  <Label htmlFor="feedback">Share your thoughts</Label>
                  <Textarea 
                    id="feedback" 
                    placeholder="Tell us how we can improve..." 
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={isSubmittingFeedback}
                  />
                  <Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback} className="justify-self-end">
                    {isSubmittingFeedback && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Feedback
                  </Button>
                </div>

            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
