
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber, updateProfile } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { getFirebaseAuth } from '@/lib/firebase-client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';

const phoneAuthSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    phoneNumber: z.string().regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit mobile number.' }),
});

const otpSchema = z.object({
    otp: z.string().min(6, { message: 'OTP must be 6 characters.' }),
});

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
    grecaptcha?: any;
  }
}

export default function AuthPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [userName, setUserName] = useState('');
    const [isRecaptchaVerified, setIsRecaptchaVerified] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const phoneAuthForm = useForm<z.infer<typeof phoneAuthSchema>>({
        resolver: zodResolver(phoneAuthSchema),
        defaultValues: { name: '', phoneNumber: '' },
    });

    const otpForm = useForm<z.infer<typeof otpSchema>>({
        resolver: zodResolver(otpSchema),
        defaultValues: { otp: '' },
    });
    
    const setupRecaptcha = () => {
        const auth = getFirebaseAuth();
        if (!auth) return null;

        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
        }

        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal', // Use a visible reCAPTCHA
            'callback': (response: any) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                setIsRecaptchaVerified(true);
                toast({ title: "reCAPTCHA Verified", description: "You can now send the OTP." });
            },
            'expired-callback': () => {
                 setIsRecaptchaVerified(false);
                 toast({ variant: 'destructive', title: 'reCAPTCHA Expired', description: 'Please solve the reCAPTCHA again.' });
            }
        });
        window.recaptchaVerifier = recaptchaVerifier;
        recaptchaVerifier.render(); // Explicitly render the reCAPTCHA widget
    };

    // Initialize reCAPTCHA on component mount
    useState(() => {
        // Using useState for on-mount effect to avoid double-execution in strict mode
        setTimeout(() => {
           if (!window.grecaptcha || !window.recaptchaVerifier) {
               setupRecaptcha();
           }
        }, 100);
    });

    const handleSendOtp = async (values: z.infer<typeof phoneAuthSchema>) => {
        setIsLoading(true);
        const auth = getFirebaseAuth();
        const appVerifier = window.recaptchaVerifier;

        if (!auth || !appVerifier) {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'The authentication service or reCAPTCHA is not ready. Please refresh.',
            });
            setIsLoading(false);
            return;
        }

        try {
            const formattedPhoneNumber = `+91${values.phoneNumber}`;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            
            window.confirmationResult = confirmationResult;
            setUserName(values.name);
            setIsOtpSent(true);
            toast({ title: 'OTP Sent', description: `A verification code has been sent to ${formattedPhoneNumber}.` });
        } catch (error: any) {
             console.error("Error sending OTP:", error);
             // Reset reCAPTCHA for the user to try again
             if (window.grecaptcha && appVerifier.widgetId !== undefined) {
                window.grecaptcha.reset(appVerifier.widgetId);
             }
             setIsRecaptchaVerified(false);

             toast({
                variant: 'destructive',
                title: 'OTP Send Failed',
                description: error.code === 'auth/invalid-phone-number' ? 'The phone number is not valid.' : 'Could not send verification code. Please check the number and try again.',
             });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (values: z.infer<typeof otpSchema>) => {
        setIsLoading(true);
        try {
            const confirmationResult = window.confirmationResult;
            if (!confirmationResult) {
                throw new Error("No confirmation result found. Please request a new OTP.");
            }
            const result = await confirmationResult.confirm(values.otp);
            const user = result.user;

            if (user && userName) {
                await updateProfile(user, { displayName: userName });
            }
            
            toast({ title: 'Signed In', description: "Welcome to Bhu-Shakti!" });
            router.push('/dashboard');

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Sign In Failed',
                description: 'The OTP is invalid or has expired. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center mb-6 gap-2">
                    <Icons.logo className="h-10 w-10 text-primary" />
                    <h1 className="text-3xl font-bold text-foreground font-headline">
                        Bhu-Shakti
                    </h1>
                </div>

                <Card>
                    {!isOtpSent ? (
                        <>
                            <CardHeader>
                                <CardTitle>Login or Sign Up</CardTitle>
                                <CardDescription>Enter your name and mobile number to receive a verification code.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...phoneAuthForm}>
                                    <form onSubmit={phoneAuthForm.handleSubmit(handleSendOtp)} className="space-y-6">
                                        <FormField
                                            control={phoneAuthForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Bhuvan" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={phoneAuthForm.control}
                                            name="phoneNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mobile Number</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-10 flex items-center justify-center px-3 rounded-md border border-input bg-background">
                                                                <span className="text-sm text-muted-foreground">+91</span>
                                                            </div>
                                                            <Input placeholder="98765 43210" {...field} type="tel" />
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div id="recaptcha-container" className="flex justify-center"></div>
                                        <Button type="submit" className="w-full" disabled={isLoading || !isRecaptchaVerified}>
                                            {isLoading && <Icons.spinner className="mr-2 animate-spin" />}
                                            Send OTP
                                        </Button>
                                    </form>
                                </Form>
                            </CardContent>
                        </>
                    ) : (
                         <>
                            <CardHeader>
                                <CardTitle>Verify Your Phone</CardTitle>
                                <CardDescription>Enter the 6-digit code sent to your mobile number.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...otpForm}>
                                     <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-6 flex flex-col items-center">
                                         <FormField
                                            control={otpForm.control}
                                            name="otp"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>One-Time Password</FormLabel>
                                                    <FormControl>
                                                        <InputOTP maxLength={6} {...field} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
                                                            <InputOTPGroup>
                                                                <InputOTPSlot index={0} />
                                                                <InputOTPSlot index={1} />
                                                                <InputOTPSlot index={2} />
                                                                <InputOTPSlot index={3} />
                                                                <InputOTPSlot index={4} />
                                                                <InputOTPSlot index={5} />
                                                            </InputOTPGroup>
                                                        </InputOTP>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" className="w-full" disabled={isLoading}>
                                            {isLoading && <Icons.spinner className="mr-2 animate-spin" />}
                                            Verify and Login
                                        </Button>
                                    </form>
                                </Form>
                                <div className="mt-4 text-center">
                                    <Button variant="link" onClick={() => { setIsRecaptchaVerified(false); setIsOtpSent(false); setupRecaptcha(); }} disabled={isLoading}>
                                        Use a different number
                                    </Button>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}

    