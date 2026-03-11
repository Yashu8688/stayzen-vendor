/**
 * seedGlobalStats.js
 * 
 * Run this ONCE from the browser console or as a one-off script to bootstrap
 * the analytics/global_stats document in Firestore.
 * 
 * This document is updated by Firebase cloud triggers or periodic scripts
 * as the system scales. It lets the admin dashboard read ONE document
 * instead of scanning millions of docs every reload.
 * 
 * To run: import this function in App.jsx temporarily and call it once.
 */

import { db } from '../firebase';
import {
    collection, getDocs, doc, setDoc, getCountFromServer
} from 'firebase/firestore';

export const seedGlobalStats = async () => {
    try {
        console.log("🌱 Seeding global_stats document...");

        // Count collections using Firestore aggregation (efficient, doesn't read all docs)
        const [usersSnap, propertiesSnap, bookingsSnap, paymentsSnap] = await Promise.all([
            getCountFromServer(collection(db, 'users')),
            getCountFromServer(collection(db, 'properties')),
            getCountFromServer(collection(db, 'bookings')),
            getCountFromServer(collection(db, 'payments'))
        ]);

        // Get revenue total (lightweight summary)
        const paymentsData = await getDocs(collection(db, 'payments'));
        const totalRevenue = paymentsData.docs.reduce(
            (sum, d) => sum + (Number(d.data().amount) || 0), 0
        );

        // Aggregate property types
        const propertiesData = await getDocs(collection(db, 'properties'));
        const propertyTypes = {};
        let pendingCount = 0;
        propertiesData.docs.forEach(d => {
            const data = d.data();
            const t = data.type || 'Other';
            propertyTypes[t] = (propertyTypes[t] || 0) + 1;
            if (data.status === 'Processing') pendingCount++;
        });

        const statsPayload = {
            totalUsers: usersSnap.data().count,
            totalProperties: propertiesSnap.data().count,
            totalBookings: bookingsSnap.data().count,
            totalRevenue,
            pendingProperties: pendingCount,
            propertyTypes,
            lastUpdated: new Date().toISOString()
        };

        await setDoc(doc(db, 'analytics', 'global_stats'), statsPayload, { merge: true });

        console.log("✅ global_stats seeded successfully:", statsPayload);
        return statsPayload;
    } catch (error) {
        console.error("❌ Failed to seed global_stats:", error);
    }
};
