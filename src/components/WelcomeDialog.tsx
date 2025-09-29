
'use client';

import { ChangeEvent, Dispatch, SetStateAction, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from './ui/button';
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
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { buttonVariants } from './ui/button';

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

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  setUser: Dispatch<SetStateAction<User>>;
}

export default function WelcomeDialog({ open, onOpenChange, user, setUser }: WelcomeDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { toast } = useToast();

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

  const handleSave = () => {
    if (!user.displayName || !user.state || !user.district) {
        toast({
            variant: 'destructive',
            title: "Incomplete Details",
            description: "Please fill in your name, state, and district to continue."
        });
        return;
    }
    // Use a user-specific key for localStorage
    localStorage.setItem(`bhu-shakti-profile-complete-${user.uid}`, 'true');
    onOpenChange(false);
    toast({
        title: "Profile Updated",
        description: "Your details have been saved successfully."
    });
  }

  const handleInteractOutside = (e: Event) => {
    // Only prevent closing if the profile has never been completed for this user
    if (!localStorage.getItem(`bhu-shakti-profile-complete-${user.uid}`)) {
        e.preventDefault();
        toast({
            variant: 'destructive',
            title: "Action Required",
            description: "Please complete your profile before proceeding.",
        });
    }
  };
  
  const states = Object.keys(indianStatesAndDistricts);
  const districts = user.state ? indianStatesAndDistricts[user.state as keyof typeof indianStatesAndDistricts] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]" onInteractOutside={handleInteractOutside}>
        <DialogHeader>
          <DialogTitle>Welcome to Bhu-Shakti!</DialogTitle>
          <DialogDescription>
            Let's set up your profile to personalize your experience.
          </DialogDescription>
        </DialogHeader>
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
                    {t('username')} <span className="text-destructive">*</span>
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
                    <Label htmlFor="email" className="text-right">
                    {t('email')}
                    </Label>
                    <Input id="email" value={user.email} onChange={handleInputChange} className="col-span-3" type="email" />
                </div>
                
                <Separator />

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('location')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="state" className="text-right">
                      {t('state')} <span className="text-destructive">*</span>
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
                      {t('district')} <span className="text-destructive">*</span>
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

                <h3 className="text-sm font-medium text-muted-foreground px-1">{t('preferences')}</h3>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="language" className="text-right">
                    {t('language')}
                  </Label>
                  <Select
                    value={language}
                    onValueChange={(value: string) => (useLanguage as any).setLanguage(value)}
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

            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="pt-4 border-t">
            <Button onClick={handleSave}>Save and Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
