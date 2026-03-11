import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    limit,
    startAfter
} from "firebase/firestore";
import { db, auth } from "../firebase";

// Collections
const PROPERTIES_COLLECTION = "properties";
const RENTERS_COLLECTION = "renters";
const PAYMENTS_COLLECTION = "payments";
const NOTIFICATIONS_COLLECTION = "notifications";
const BOOKINGS_COLLECTION = "bookings";
const FAVORITES_COLLECTION = "favorites";
const SETTINGS_COLLECTION = "settings";
const FAQS_COLLECTION = "faqs";
const CHATS_COLLECTION = "chats";
export const POSTS_COLLECTION = "posts";
export const ROOMMATE_REQUESTS_COLLECTION = "roommate_requests";

const formatPost = (doc) => {
    const post = doc.data();
    let propertyImages = [];
    if (post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0) {
        propertyImages = post.imageUrls;
    } else if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        propertyImages = post.images;
    } else {
        propertyImages = [post.imageUrl || post.img || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600'];
    }

    const priceValue = post.dailyRent || post.monthlyRent || post.rent || post.price || post.amount || "0";
    const hasValue = priceValue.toString().trim() !== "" && priceValue.toString().trim() !== "0";

    const formattedRent = hasValue
        ? (priceValue.toString().includes('₹') ? priceValue : `₹${priceValue}`)
        : 'Price on request';

    return {
        id: doc.id,
        ...post,
        name: post.propertyName || post.name || 'Property',
        type: post.propertyType || post.type || 'Stay',
        location: post.colonyArea ? `${post.colonyArea}, ${post.city}` : `${post.city || 'Location'}`,
        rent: formattedRent,
        images: propertyImages,
        rating: post.rating || '4.8'
    };
};

const expandPost = (post) => {
    const isPG = post.propertyType?.toUpperCase().includes('PG') || post.propertyType?.toLowerCase().includes('hostel');
    const isApartment = post.propertyType === 'Apartment';

    if (isApartment && post.bhkAllocations && post.bhkAllocations.length > 0) {
        return post.bhkAllocations.map((alloc, idx) => ({
            ...post,
            id: `${post.id}-bhk-${idx}`,
            originalId: post.id,
            name: `${alloc.bhkType} - ${post.propertyName || post.name}`,
            rent: alloc.pricePerUnit ? (alloc.pricePerUnit.toString().includes('₹') ? alloc.pricePerUnit : `₹${alloc.pricePerUnit}`) : post.rent,
            rentType: alloc.rentType,
            images: (alloc.imageUrls && alloc.imageUrls.length > 0) ? alloc.imageUrls : post.images,
            unitType: alloc.bhkType,
            configIndex: idx,
            configType: 'bhk'
        }));
    } else if (isPG && post.roomConfigurations && post.roomConfigurations.length > 0) {
        return post.roomConfigurations.map((config, idx) => ({
            ...post,
            id: `${post.id}-pg-${idx}`,
            originalId: post.id,
            name: `${config.type === 'Custom' ? config.customType : config.type} - ${post.propertyName || post.name}`,
            rent: config.rentAmount ? (config.rentAmount.toString().includes('₹') ? config.rentAmount : `₹${config.rentAmount}`) : post.rent,
            rentType: config.rentType,
            images: (config.imageUrls && config.imageUrls.length > 0) ? config.imageUrls : post.images,
            roomType: config.type === 'Custom' ? config.customType : config.type,
            configIndex: idx,
            configType: 'pg'
        }));
    }
    return [{ ...post, originalId: post.id }];
};

export const subscribeToPosts = (callback, maxLimit = 20) => {
    const q = query(
        collection(db, POSTS_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(maxLimit)
    );
    return onSnapshot(q, (snapshot) => {
        const allItems = [];
        snapshot.docs.forEach(doc => {
            const formatted = formatPost(doc);
            const expanded = expandPost(formatted);
            allItems.push(...expanded);
        });
        callback(allItems);
    }, (error) => {
        console.error("Posts Sync Error:", error);
    });
};

export const getPostsPaginated = async (lastVisible = null, batchSize = 12) => {
    try {
        let q;
        if (lastVisible) {
            q = query(
                collection(db, POSTS_COLLECTION),
                orderBy("createdAt", "desc"),
                startAfter(lastVisible),
                limit(batchSize)
            );
        } else {
            q = query(
                collection(db, POSTS_COLLECTION),
                limit(batchSize)
            );
        }

        const snapshot = await getDocs(q);
        const allItems = [];
        snapshot.docs.forEach(doc => {
            const formatted = formatPost(doc);
            const expanded = expandPost(formatted);
            allItems.push(...expanded);
        });

        return {
            posts: allItems,
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error) {
        console.error("Pagination Error:", error);
        try {
            const q = query(collection(db, POSTS_COLLECTION), limit(batchSize));
            const snapshot = await getDocs(q);
            const allItems = [];
            snapshot.docs.forEach(doc => {
                const formatted = formatPost(doc);
                const expanded = expandPost(formatted);
                allItems.push(...expanded);
            });
            return { posts: allItems, lastVisible: snapshot.docs[snapshot.docs.length - 1] };
        } catch (err) {
            console.error("Critical Fetch Error:", err);
            throw err;
        }
    }
};

export const getPropertyById = async (id) => {
    try {
        // Handle flattened IDs like "postId-bhk-0" or "postId-pg-1"
        let realId = id;
        let configIdx = -1;
        let cType = null;

        if (id.includes('-bhk-')) {
            const parts = id.split('-bhk-');
            realId = parts[0];
            configIdx = parseInt(parts[1]);
            cType = 'bhk';
        } else if (id.includes('-pg-')) {
            const parts = id.split('-pg-');
            realId = parts[0];
            configIdx = parseInt(parts[1]);
            cType = 'pg';
        }

        const docRef = doc(db, POSTS_COLLECTION, realId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const postData = docSnap.data();

            // 🔑 CRITICAL FIX: If ownerId is missing from the posts doc,
            // look it up from the properties collection via propertyId
            let ownerId = postData.ownerId || null;
            if (!ownerId && postData.propertyId) {
                try {
                    const propSnap = await getDoc(doc(db, PROPERTIES_COLLECTION, postData.propertyId));
                    if (propSnap.exists()) {
                        ownerId = propSnap.data().ownerId || null;
                    }
                } catch (e) {
                    console.warn("Could not resolve ownerId from properties:", e);
                }
            }

            const basePost = formatPost({ id: docSnap.id, data: () => ({ ...postData, ownerId }) });
            const expanded = expandPost(basePost);

            if (configIdx !== -1) {
                const specific = expanded.find(p => p.id === id);
                return specific || expanded[0];
            }

            return expanded[0];
        }
        return null;
    } catch (error) {
        console.error("Fetch Property Error:", error);
        throw error;
    }
};


/**
 * BOOKINGS SERVICES
 */
export const subscribeToUserBookings = (userId, callback) => {
    // 💡 Performance Tip: Removed orderBy to avoid mandatory composite index. 
    // We sort client-side in the callback for zero-index overhead.
    const q = query(
        collection(db, BOOKINGS_COLLECTION),
        where('userId', '==', userId),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(data);
    }, (error) => {
        console.error("Bookings Sync Protocol Interrupted:", error);
    });
};

export const getBookingsPaginated = async (userId = null, lastVisible = null, batchSize = 10) => {
    try {
        let q = collection(db, BOOKINGS_COLLECTION);
        const constraints = [orderBy("createdAt", "desc"), limit(batchSize)];

        if (userId) constraints.unshift(where('userId', '==', userId));
        if (lastVisible) constraints.push(startAfter(lastVisible));

        const snapshot = await getDocs(query(q, ...constraints));
        return {
            bookings: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error) {
        console.error("Bookings Pagination Error:", error);
        throw error;
    }
};

export const deleteBooking = async (bookingId) => {
    try {
        await deleteDoc(doc(db, BOOKINGS_COLLECTION, bookingId));
    } catch (error) {
        console.error("Error deleting booking: ", error);
        throw error;
    }
};

export const createBooking = async (bookingData) => {
    try {
        const docRef = await addDoc(collection(db, BOOKINGS_COLLECTION), {
            ...bookingData,
            status: bookingData.status || 'Upcoming',
            createdAt: new Date().toISOString()
        });

        // Also create a notification
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            title: 'New Booking Request',
            message: `You have requested a stay at ${bookingData.propertyName}`,
            type: 'booking',
            targetId: bookingData.userId,
            createdAt: new Date().toISOString(),
            read: false
        });

        // Notify admin as well
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            title: 'New Customer Booking',
            message: `${bookingData.userName} requested ${bookingData.propertyName}`,
            type: 'admin_booking',
            targetId: 'admin',
            createdAt: new Date().toISOString(),
            read: false,
            emailTrigger: true // Signal for cloud function to send email
        });

        // If it's an advance payment booking, create a payment record for the vendor/owner
        if (bookingData.status === 'Advance Paid') {
            await addDoc(collection(db, PAYMENTS_COLLECTION), {
                bookingId: docRef.id,
                userId: bookingData.userId,
                userName: bookingData.userName,
                propertyName: bookingData.propertyName,
                property: bookingData.propertyName, // Compatibility field
                amount: bookingData.advance || 0,
                status: 'Completed',
                type: 'Advance Payment',
                paymentMethod: 'Razorpay',
                paymentId: bookingData.paymentId || null,
                ownerId: bookingData.ownerId || null,
                createdAt: new Date().toISOString()
            });
        }

        return docRef.id;
    } catch (error) {
        console.error("Error creating booking:", error);
        throw error;
    }
};

export const notifyAdmin = async (title, message, additionalData = {}) => {
    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            title,
            message,
            type: 'admin_alert',
            targetId: 'admin',
            createdAt: new Date().toISOString(),
            read: false,
            emailTrigger: true,
            ...additionalData
        });
    } catch (error) {
        console.error("Error notifying admin:", error);
    }
};

export const notifyUser = async (userId, title, message, additionalData = {}) => {
    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            title,
            message,
            type: 'user_alert',
            targetId: userId,
            createdAt: new Date().toISOString(),
            read: false,
            emailTrigger: true,
            ...additionalData
        });
    } catch (error) {
        console.error("Error notifying user:", error);
    }
};

export const requestAvailabilityNotification = async (userId, propertyId, propertyName) => {
    try {
        await addDoc(collection(db, "availability_requests"), {
            userId,
            propertyId,
            propertyName,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        await notifyAdmin(
            'New Availability Request',
            `User ${userId} wants to be notified when ${propertyName} becomes available.`
        );

        return true;
    } catch (error) {
        console.error("Error requesting availability notification:", error);
        throw error;
    }
};

/**
 * FAVORITES SERVICES
 */
export const subscribeToUserFavorites = (userId, callback) => {
    const q = query(
        collection(db, FAVORITES_COLLECTION),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(data);
    }, (error) => {
        console.error("Favorites Fetch Error:", error);
    });
};

export const toggleFavorite = async (userId, prop) => {
    try {
        const q = query(
            collection(db, FAVORITES_COLLECTION),
            where('userId', '==', userId),
            where('propertyId', '==', prop.id)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            await deleteDoc(doc(db, FAVORITES_COLLECTION, docId));
        } else {
            await addDoc(collection(db, FAVORITES_COLLECTION), {
                userId: userId,
                propertyId: prop.id,
                propertyData: {
                    name: prop.name,
                    location: prop.location,
                    rent: prop.rent,
                    image: prop.images[0],
                    type: prop.type
                },
                createdAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
        throw error;
    }
};

/**
 * NOTIFICATION SERVICES
 */
export const subscribeToNotifications = (userId, callback) => {
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where("targetId", "==", userId)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(notifications);
    });
};

/**
 * PAYMENT SERVICES
 */
export const addPaymentRecord = async (paymentData) => {
    try {
        await addDoc(collection(db, PAYMENTS_COLLECTION), {
            ...paymentData,
            createdAt: new Date().toISOString()
        });

        // If it's a booking payment, update booking status and details
        if (paymentData.bookingId) {
            const bookingRef = doc(db, BOOKINGS_COLLECTION, paymentData.bookingId);
            const bookingSnap = await getDoc(bookingRef);

            if (bookingSnap.exists()) {
                const bookingData = bookingSnap.data();

                // 1. Update Booking to 'Advance Paid' (Awaiting admin approval)
                await updateDoc(bookingRef, {
                    status: 'Advance Paid',
                    paymentStatus: 'Completed',
                    paymentId: paymentData.paymentId || null,
                    paidAmount: paymentData.amount,
                    advancePaid: true,
                    paymentDate: new Date().toISOString()
                });
            }
        }
    } catch (error) {
        console.error("Error adding payment record:", error);
        throw error;
    }
};
export const subscribeToUserPayments = (userId, callback) => {
    // 💡 Performance Tip: Removed orderBy to avoid mandatory composite index.
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where('userId', '==', userId),
        limit(50)
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        callback(data);
    }, (error) => {
        console.error("Payments Sync Protocol Interrupted:", error);
    });
};
export const subscribeToUserRenterDetails = (userId, callback) => {
    if (!userId) {
        callback(null);
        return () => { };
    }
    const q = query(
        collection(db, RENTERS_COLLECTION),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Renter Details Sync Error:", error);
    });
};

export const updateRenterPaidAmount = async (identifier, propertyName, amountToAdd) => {
    try {
        let renterDoc = null;
        let renterRef = null;

        // Strategy 1: Direct ID lookup (If identifier is a likely renterId)
        if (identifier && identifier.length > 15 && !identifier.includes('@')) {
            const docRef = doc(db, RENTERS_COLLECTION, identifier);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                renterDoc = { id: docSnap.id, ...docSnap.data() };
                renterRef = docRef;
            }
        }

        // Strategy 2: Query fallback using userId + propertyName
        if (!renterDoc) {
            const q = query(
                collection(db, RENTERS_COLLECTION),
                where('userId', '==', identifier)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Try to find the exact property match (case-insensitive + trim)
                let foundMatch = querySnapshot.docs.find(doc => {
                    const data = doc.data();
                    const pName = (data.property || data.propertyName || '').toLowerCase().trim();
                    const targetName = (propertyName || '').toLowerCase().trim();
                    return pName === targetName;
                });

                // Ultimate fallback: first record for this user
                const finalDoc = foundMatch || querySnapshot.docs[0];
                renterRef = doc(db, RENTERS_COLLECTION, finalDoc.id);
                renterDoc = { id: finalDoc.id, ...finalDoc.data() };
            }
        }

        if (renterRef && renterDoc) {
            const currentPaid = Number(renterDoc.paidAmount || 0);
            await updateDoc(renterRef, {
                paidAmount: currentPaid + Number(amountToAdd),
                updatedAt: new Date().toISOString()
            });
            return true;
        }

        console.warn("Could not find renter to update paidAmount for:", identifier, propertyName);
        return false;
    } catch (error) {
        console.error("Error updating renter paid amount:", error);
        throw error;
    }
};

export const decrementAvailableUnits = async (postId) => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const currentEmpty = Number(postSnap.data().emptyUnits || 0);
            if (currentEmpty > 0) {
                await updateDoc(postRef, {
                    emptyUnits: currentEmpty - 1,
                    updatedAt: new Date().toISOString()
                });
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error decrementing units:", error);
        throw error;
    }
};

export const getPaymentByBookingId = async (bookingId) => {
    try {
        const q = query(
            collection(db, PAYMENTS_COLLECTION),
            where('bookingId', '==', bookingId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching payment for booking:", error);
        throw error;
    }
};
export const updateUserPayment = async (paymentId, updateData) => {
    try {
        const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
        await updateDoc(paymentRef, {
            ...updateData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating user payment:", error);
        throw error;
    }
};

/**
 * USER PROFILE SERVICES
 */
const USERS_COLLECTION = "users";

export const getUserProfile = async (userId) => {
    try {
        const docRef = doc(db, USERS_COLLECTION, userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching user profile:", error);
        throw error;
    }
};

export const updateUserProfile = async (userId, profileData) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            ...profileData,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};

export const subscribeToUserProfile = (userId, callback) => {
    if (!userId) {
        callback(null);
        return () => { };
    }
    const userRef = doc(db, USERS_COLLECTION, userId);
    return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("User Profile Sync Error:", error);
    });
};

export const findUserByPhone = async (phoneNumber) => {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("phoneNumber", "==", phoneNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        }
        return null;
    } catch (error) {
        console.error("Error finding user by phone:", error);
        throw error;
    }
};

/**
 * MSG91 OTP SERVICES
 */
const MSG91_AUTH_KEY = "478809AuxvhiDf692434a5P1";
const MSG91_TEMPLATE_ID = "6921a3d5c37f1e344d2a2799"; // Please replace with your template ID

export const sendMsg91Otp = async (phoneNumber) => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const otpUrl = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${cleanPhone}&authkey=${MSG91_AUTH_KEY}&otp_length=6`;

    // Priority: 1. Direct API 2. Codetabs Proxy 3. AllOrigins Proxy
    const proxies = [
        otpUrl,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(otpUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(otpUrl)}`
    ];

    for (const url of proxies) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data.type === "success" || data.request_id) return true;
        } catch (e) { continue; }
    }
    throw new Error("Failed to send OTP via all available paths. Please try again later.");
};

export const verifyMsg91Otp = async (phoneNumber, otp) => {
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const verifyUrl = `https://control.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=${cleanPhone}&authkey=${MSG91_AUTH_KEY}`;

    const proxies = [
        verifyUrl,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(verifyUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(verifyUrl)}`
    ];

    for (const url of proxies) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data.type === "success") return true;
        } catch (e) { continue; }
    }
    throw new Error("Invalid OTP");
};
/**
 * SUPPORT/SETTINGS SERVICES
 */
export const getSupportSettings = async () => {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, "support");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error("Error fetching support settings:", error);
        return null;
    }
};

export const subscribeToFaqs = (callback) => {
    const q = query(collection(db, FAQS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const faqs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(faqs);
    }, (error) => {
        console.error("FAQs Sync Error:", error);
    });
};


export const subscribeToRoommateRequests = (callback, maxLimit = 30) => {
    const q = query(
        collection(db, ROOMMATE_REQUESTS_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(maxLimit)
    );
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    });
};

export const createRoommateRequest = async (requestData) => {
    try {
        const docRef = await addDoc(collection(db, ROOMMATE_REQUESTS_COLLECTION), {
            ...requestData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating roommate request:", error);
        throw error;
    }
};

export const updateRoommateRequest = async (requestId, updateData) => {
    try {
        const docRef = doc(db, ROOMMATE_REQUESTS_COLLECTION, requestId);
        await updateDoc(docRef, {
            ...updateData,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error updating roommate request:", error);
        throw error;
    }
};

export const deleteRoommateRequest = async (requestId) => {
    try {
        await deleteDoc(doc(db, ROOMMATE_REQUESTS_COLLECTION, requestId));

        // 1. Delete by searching originalId property
        const q = query(collection(db, POSTS_COLLECTION), where("originalId", "==", requestId));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(item => deleteDoc(doc(db, POSTS_COLLECTION, item.id)));
        await Promise.all(deletePromises);

        // 2. Fallback: Check if the post itself has the same ID
        try {
            const postRef = doc(db, POSTS_COLLECTION, requestId);
            const postSnap = await getDoc(postRef);
            if (postSnap.exists()) {
                await deleteDoc(postRef);
            }
        } catch (e) {
            console.warn("Secondary delete check failed:", e);
        }

        return true;
    } catch (error) {
        console.error("Error deleting roommate request:", error);
        throw error;
    }
};

export const subscribeToMessages = (chatId, callback, maxLimit = 50) => {
    const q = query(
        collection(db, CHATS_COLLECTION, chatId, "messages"),
        orderBy("createdAt", "desc"),
        limit(maxLimit)
    );
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .reverse(); // Newest at bottom for UI
        callback(messages);
    });
};

export const getMessagesPaginated = async (chatId, lastVisible = null, batchSize = 50) => {
    try {
        const constraints = [orderBy("createdAt", "desc"), limit(batchSize)];
        if (lastVisible) constraints.push(startAfter(lastVisible));

        const q = query(collection(db, CHATS_COLLECTION, chatId, "messages"), ...constraints);
        const snapshot = await getDocs(q);
        return {
            messages: snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error) {
        console.error("Messages Pagination Error:", error);
        throw error;
    }
};

export const sendMessage = async (chatId, messageData) => {
    try {
        await addDoc(collection(db, CHATS_COLLECTION, chatId, "messages"), {
            ...messageData,
            createdAt: new Date().toISOString()
        });
        // Update the chat document with last message
        await setDoc(doc(db, CHATS_COLLECTION, chatId), {
            lastMessage: messageData.text,
            lastMessageAt: new Date().toISOString(),
            participants: messageData.participants
        }, { merge: true });
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
};

/**
 * CHAT & MESSAGING SERVICES
 */
export const reportChatProtocol = async (reportData) => {
    try {
        await addDoc(collection(db, "reports"), {
            ...reportData,
            status: 'pending',
            createdAt: new Date().toISOString()
        });

        // Push alert to Admin Dashboard
        await addDoc(collection(db, "notifications"), {
            targetId: 'admin',
            title: 'Chat Protocol Violation Report',
            message: `Resident ${reportData.reporterName || 'Unknown'} reported a chat: "${reportData.reason}"`,
            type: 'USER_REPORT',
            read: false,
            createdAt: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error("Report Protocol Failed:", error);
        throw error;
    }
};

export const clearChatHistory = async (chatId) => {
    try {
        const q = query(collection(db, CHATS_COLLECTION, chatId, "messages"));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        await updateDoc(doc(db, CHATS_COLLECTION, chatId), {
            lastMessage: "Conversation cleared",
            lastMessageAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Clear Chat Protocol Interrupted:", error);
        throw error;
    }
};

export const findOrCreateChat = async (user1Id, user2Id, user1Name = "Resident", user2Name = "Resident") => {
    const chatId = [user1Id, user2Id].sort().join('_');
    const chatRef = doc(db, CHATS_COLLECTION, chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        await setDoc(chatRef, {
            participants: [user1Id, user2Id],
            participantNames: {
                [user1Id]: user1Name,
                [user2Id]: user2Name
            },
            createdAt: new Date().toISOString()
        });
    } else {
        // Update names if they changed or are missing
        await updateDoc(chatRef, {
            [`participantNames.${user1Id}`]: user1Name,
            [`participantNames.${user2Id}`]: user2Name
        });
    }
    return chatId;
};

export const subscribeToUserChats = (userId, callback, maxLimit = 20) => {
    // Removed orderBy to prevent mandatory composite index error
    const q = query(
        collection(db, CHATS_COLLECTION),
        where("participants", "array-contains", userId),
        limit(maxLimit)
    );
    return onSnapshot(q, (snapshot) => {
        const chats = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        callback(chats);
    });
};

/**
 * EMAIL & NOTIFICATION DISPATCH (Trigger Email from Firestore Extension)
 */
export const triggerEmailProtocol = async (toEmail, subject, htmlBody) => {
    try {
        await addDoc(collection(db, 'mail'), {
            to: toEmail,
            message: {
                subject: subject,
                html: htmlBody,
            }
        });
        console.log(`Email dispatched to queue: ${toEmail}`);
        return true;
    } catch (error) {
        console.error("Email Dispatch Interrupted:", error);
        return false;
    }
};
