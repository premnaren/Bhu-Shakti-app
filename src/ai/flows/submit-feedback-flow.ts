
'use server';
/**
 * @fileOverview A flow for submitting user feedback to Firestore.
 */

import { z } from 'zod';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { getAppId } from '@/lib/firebase-client';
import { FieldValue } from 'firebase-admin/firestore';


const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().min(1, 'Feedback cannot be empty.'),
  userId: z.string(),
});

export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean }> {
  const validatedInput = SubmitFeedbackInputSchema.safeParse(input);
  if (!validatedInput.success) {
    throw new Error(validatedInput.error.message);
  }

  const { feedback, userId } = validatedInput.data;
  
  const db = getFirestoreAdmin();
  const appId = getAppId();

  if (!db || !appId) {
    throw new Error('Firebase is not initialized or app ID is missing.');
  }

  try {
    // We create a top-level `feedback` collection to store all feedback
    // across all users and apps. This makes it easy for an admin to query.
    const feedbackCollectionRef = db.collection('feedback');
    
    await feedbackCollectionRef.add({
      appId,
      userId,
      feedback,
      createdAt: FieldValue.serverTimestamp(),
      status: 'new', // Default status for new feedback
    });

    return { success: true };
  } catch (error) {
    console.error('Error writing feedback to Firestore:', error);
    throw new Error('Failed to save feedback.');
  }
}
