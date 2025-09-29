'use client';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, CollectionReference, DocumentData } from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase-client';
import DataItem from './DataItem';
import AddItemForm from './AddItemForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from './ui/card';
import { useLanguage } from '@/contexts/language-context';

interface DataGridProps {
    user: { uid: string }; // Accept a simulated user object
    appId: string;
}

export default function DataGrid({ user, appId }: DataGridProps) {
    const [dataItems, setDataItems] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState(false);
    const { t } = useLanguage();
    
    const collectionRef = useMemo(() => {
        if (user && appId) {
            try {
                const db = getFirebaseFirestore();
                if (!db) {
                    setDbError(true);
                    return null;
                }
                return collection(db, `artifacts/${appId}/users/${user.uid}/diagnoses`);
            } catch (e) {
                console.warn(e);
                setDbError(true);
                return null;
            }
        }
        return null;
    }, [user, appId]);

    useEffect(() => {
        if (collectionRef) {
            setLoading(true);
            const q = query(collectionRef, orderBy('createdAt', 'desc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
                setDataItems(items);
                setLoading(false);
                setDbError(false);
            }, (error) => {
                console.error("Error fetching data:", error);
                setLoading(false);
                setDbError(true);
            });

            return () => unsubscribe();
        } else {
            setLoading(false);
            if (getFirebaseFirestore) {
                setDbError(true);
            }
        }
    }, [collectionRef]);

    return (
        <div className="space-y-8">
            <AddItemForm collectionRef={collectionRef} />
            
            {dbError ? (
                 <div className="text-center text-muted-foreground p-8 bg-muted rounded-lg">
                    {t('couldNotLoadSavedDiagnoses')}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading && dataItems.length === 0 && (
                        null
                    )}
                    {!loading && dataItems.length === 0 && (
                        <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground p-8">
                            {t('noDiagnosesFound')}
                        </div>
                    )}
                    {dataItems.map(item => (
                        <DataItem key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
