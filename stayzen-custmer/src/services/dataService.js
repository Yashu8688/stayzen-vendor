import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    setDoc,
    getDoc,
    limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// Collections
const PROPERTIES_COLLECTION = "properties";
const RENTERS_COLLECTION = "renters";
const POSTS_COLLECTION = "posts";
const PAYMENTS_COLLECTION = "payments";
const NOTIFICATIONS_COLLECTION = "notifications";
const USERS_COLLECTION = "users";
const PROPERTY_EDITS_COLLECTION = "property_edits";

// USERS & PROFILE
export const getOrCreateManagerProfile = async (user) => {
    try {
        console.log("DEBUG: Checking/Creating profile for UID:", user.uid);
        const userRef = doc(db, USERS_COLLECTION, user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.log("DEBUG: No profile found. Creating new Manager profile...");
            const newProfile = {
                uid: user.uid,
                fullName: user.displayName || "Google User",
                email: user.email,
                phoneNumber: user.phoneNumber || "",
                role: 'manager',
                status: 'Approved',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            await setDoc(userRef, newProfile);
            console.log("DEBUG: New profile created successfully.");
            return { ...newProfile, isNew: true };
        } else {
            console.log("DEBUG: Profile exists. Upgrading/Updating to Approved Manager...");
            const existingData = userSnap.data();
            const updateData = {
                lastLogin: new Date().toISOString(),
                role: 'manager',
                status: 'Approved'
            };
            await updateDoc(userRef, updateData);
            return { ...existingData, ...updateData, isNew: false };
        }
    } catch (error) {
        console.error("Error in getOrCreateManagerProfile:", error);
        throw error;
    }
};

/**
 * PROPERTY SERVICES
 */
export const requestPropertyEdit = async (propertyId, updatedData, ownerId) => {
    try {
        await addDoc(collection(db, PROPERTY_EDITS_COLLECTION), {
            propertyId,
            ...updatedData,
            ownerId,
            status: 'Pending',
            createdAt: new Date().toISOString()
        });

        // Notify Admin of edit request
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            type: 'PROPERTY_EDIT_REQUEST',
            title: 'Property Edit Request',
            message: `Owner has requested changes for property: ${updatedData.name || propertyId}`,
            targetId: 'admin',
            propertyId: propertyId,
            status: 'unread',
            createdAt: new Date().toISOString()
        });

        // Also update the property to indicate it has a pending edit
        await updateDoc(doc(db, PROPERTIES_COLLECTION, propertyId), {
            editStatus: 'Pending Approval'
        });

        return true;
    } catch (error) {
        console.error("Error requesting property edit:", error);
        throw error;
    }
};
export const addProperty = async (propertyData) => {
    try {
        const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
            ...propertyData,
            ownerId: propertyData.ownerId || null,
            createdAt: new Date().toISOString(),
            status: propertyData.status || "Processing"
        });

        // 🔔 Notify Vendor
        if (propertyData.ownerId) {
            await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
                type: 'PROPERTY_STATUS',
                title: 'Property Registered',
                message: `Your property "${propertyData.name}" is now in the processing stage. We will notify you once it's approved.`,
                targetId: propertyData.ownerId,
                propertyId: docRef.id,
                status: 'unread',
                createdAt: new Date().toISOString()
            });
        }

        // 🔔 Notify Admin
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            type: 'NEW_PROPERTY',
            title: 'New Property Registration',
            message: `${propertyData.manager} registered a new ${propertyData.type}: ${propertyData.name}`,
            targetId: 'admin',
            propertyId: docRef.id,
            status: 'unread',
            createdAt: new Date().toISOString()
        });

        // 📧 Trigger Email Notification (Requires Firebase "Trigger Email" Extension)
        await addDoc(collection(db, 'mail'), {
            to: propertyData.email,
            message: {
                subject: `Property Registration: ${propertyData.name} is in Progress`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: #1aa79c;">Hello ${propertyData.manager},</h2>
                        <p>Your ${propertyData.type} <strong>"${propertyData.name}"</strong> registration has been received successfully.</p>
                        <p>Your property is currently in the <strong>Processing Stage</strong> and has been sent to the admin for approval.</p>
                        <p>We will notify you via email once it is approved. Thank you for choosing StayZen!</p>
                        <br>
                        <p>Best regards,<br>The StayZen Team</p>
                    </div>
                `,
            }
        });

        console.log(`✅ Property and Notification registered: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error("Error adding property: ", error);
        throw error;
    }
};

export const subscribeToProperties = (ownerId, callback) => {
    if (!ownerId) {
        callback([]);
        return () => { };
    }
    const q = query(
        collection(db, PROPERTIES_COLLECTION),
        where("ownerId", "==", ownerId)
    );
    return onSnapshot(q,
        (querySnapshot) => {
            const properties = [];
            querySnapshot.forEach((doc) => {
                properties.push({ id: doc.id, ...doc.data() });
            });
            callback(properties);
        },
        (error) => {
            console.error("Properties Sync Error:", error);
        }
    );
};

export const deleteProperty = async (propertyId) => {
    try {
        // 1. Delete the property itself
        await deleteDoc(doc(db, PROPERTIES_COLLECTION, propertyId));

        // 2. Find and delete associated posts (Cascade Delete)
        const postsQuery = query(collection(db, POSTS_COLLECTION), where("propertyId", "==", propertyId));
        const postsSnapshot = await getDocs(postsQuery);

        const deletePromises = postsSnapshot.docs.map(postDoc =>
            deleteDoc(doc(db, POSTS_COLLECTION, postDoc.id))
        );

        await Promise.all(deletePromises);
    } catch (error) {
        console.error("Error deleting property: ", error);
        throw error;
    }
};

export const updatePropertyStatus = async (propertyId, newStatus) => {
    try {
        const propertyRef = doc(db, PROPERTIES_COLLECTION, propertyId);
        await updateDoc(propertyRef, {
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating property status: ", error);
        throw error;
    }
};

/**
 * RENTER SERVICES
 */
export const subscribeToRenters = (ownerId, callback) => {
    if (!ownerId) {
        callback([]);
        return () => { };
    }
    const q = query(
        collection(db, RENTERS_COLLECTION),
        where("ownerId", "==", ownerId)
    );
    return onSnapshot(q,
        (querySnapshot) => {
            const renters = [];
            querySnapshot.forEach((doc) => {
                renters.push({ id: doc.id, ...doc.data() });
            });
            callback(renters);
        },
        (error) => {
            console.error("Renters Sync Error:", error);
        }
    );
};

export const addRenter = async (renterData) => {
    try {
        const docRef = await addDoc(collection(db, RENTERS_COLLECTION), {
            ...renterData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding renter: ", error);
        throw error;
    }
};


export const updateRenterPayment = async (renterId, paidAmount, paymentType, rentAmount) => {
    try {
        const renterRef = doc(db, RENTERS_COLLECTION, renterId);
        const updateData = {
            paidAmount: Number(paidAmount),
            paymentType: paymentType,
            updatedAt: new Date().toISOString()
        };
        if (rentAmount !== undefined) {
            updateData.rentAmount = Number(rentAmount);
        }
        await updateDoc(renterRef, updateData);
        return true;
    } catch (error) {
        console.error("Error updating payment: ", error);
        throw error;
    }
};

export const updateRenter = async (renterId, renterData) => {
    try {
        const renterRef = doc(db, RENTERS_COLLECTION, renterId);
        await updateDoc(renterRef, {
            ...renterData,
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Error updating renter: ", error);
        throw error;
    }
};

/**
 * Robust Renter Payment Processing
 * Updates Renter doc AND syncs with the Payments collection for the User Dashboard
 */
export const processRenterPayment = async (renter, newPaidTotal, newRentAmount, paymentType, managerId) => {
    try {
        const oldPaidTotal = Number(renter.paidAmount || 0);
        const difference = Number(newPaidTotal) - oldPaidTotal;

        // 1. Update Renter Profile
        await updateRenterPayment(renter.id, newPaidTotal, paymentType, newRentAmount);

        // 2. Sync with User's "Pending" Payment Record
        if (difference > 0 && renter.userId) {
            await markRentAsPaid(renter.userId, renter.property, difference, managerId);
        }

        // 3. Create a transaction record in payments history
        if (difference !== 0) {
            await addDoc(collection(db, PAYMENTS_COLLECTION), {
                renterId: renter.id,
                userId: renter.userId || null,
                renterName: renter.name,
                propertyName: renter.property,
                property: renter.property,
                unit: renter.unit || '',
                amount: Math.abs(difference),
                type: difference > 0 ? 'Rent' : 'Correction',
                paymentMethod: paymentType,
                description: difference > 0 ? `${paymentType} Payment Received` : 'Payment Corrected',
                ownerId: managerId,
                status: 'Completed',
                statusText: 'Completed',
                createdAt: new Date().toISOString()
            });
        }

        return true;
    } catch (error) {
        console.error("Process Renter Payment Error:", error);
        throw error;
    }
};

export const deleteRenter = async (renterId) => {
    try {
        await deleteDoc(doc(db, RENTERS_COLLECTION, renterId));
    } catch (error) {
        console.error("Error deleting renter: ", error);
        throw error;
    }
};

/**
 * POST SERVICES
 */
export const addPost = async (postData) => {
    try {
        console.log("DEBUG: addPost called with data:", postData);
        const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
            ...postData,
            createdAt: new Date().toISOString()
        });
        console.log("DEBUG: addPost successful. DocId:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding post: ", error);
        throw error;
    }
};

export const subscribeToPosts = (ownerId, callback) => {
    if (!ownerId) {
        callback([]);
        return () => { };
    }
    const q = query(
        collection(db, POSTS_COLLECTION),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
    );
    return onSnapshot(q,
        (querySnapshot) => {
            const posts = [];
            querySnapshot.forEach((doc) => {
                posts.push({ id: doc.id, ...doc.data() });
            });
            callback(posts);
        },
        (error) => {
            console.error("Posts Sync Error:", error);
        }
    );
};

export const deletePost = async (postId) => {
    try {
        await deleteDoc(doc(db, POSTS_COLLECTION, postId));
    } catch (error) {
        console.error("Error deleting post: ", error);
        throw error;
    }
};

export const updatePost = async (postId, postData) => {
    try {
        const postRef = doc(db, POSTS_COLLECTION, postId);
        await updateDoc(postRef, {
            ...postData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating post: ", error);
        throw error;
    }
};

/**
 * PAYMENT SERVICES
 */
export const subscribeToPayments = (ownerId, callback) => {
    if (!ownerId) {
        callback([]);
        return () => { };
    }
    const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc")
    );
    return onSnapshot(q,
        (querySnapshot) => {
            const payments = [];
            querySnapshot.forEach((doc) => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            callback(payments);
        },
        (error) => {
            console.error("Payments Sync Error:", error);
        }
    );
};

export const addPayment = async (paymentData) => {
    try {
        const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
            ...paymentData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding payment: ", error);
        throw error;
    }
};

export const deletePayment = async (paymentId) => {
    try {
        await deleteDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
    } catch (error) {
        console.error("Error deleting payment: ", error);
        throw error;
    }
};

export const updatePayment = async (paymentId, updateData) => {
    try {
        const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);
        await updateDoc(paymentRef, {
            ...updateData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error updating payment: ", error);
        throw error;
    }
};

/**
 * Marks a payment as completed and automatically updates the renter's ledger
 */
export const collectPayment = async (payment) => {
    try {
        // 1. Update the payment record itself
        await updatePayment(payment.id, {
            status: 'Completed',
            type: 'Cash',
            description: 'Rent collected in cash (Synced)'
        });

        // 2. If this payment is linked to a renter, update their paidAmount
        if (payment.renterId) {
            const renterRef = doc(db, RENTERS_COLLECTION, payment.renterId);
            const renterSnap = await getDoc(renterRef);

            if (renterSnap.exists()) {
                const renterData = renterSnap.data();
                const currentPaid = Number(renterData.paidAmount || 0);
                const paymentAmount = Number(payment.amount || 0);

                await updateDoc(renterRef, {
                    paidAmount: currentPaid + paymentAmount,
                    updatedAt: new Date().toISOString()
                });
                console.log(`✅ Renter ledger updated for ${renterData.name}`);
            }
        }
        return true;
    } catch (error) {
        console.error("Error collecting payment:", error);
        throw error;
    }
};

export const markRentAsPaid = async (userId, propertyName, amountPaid = 0, ownerId = null) => {
    try {
        // Query for all pending rent payments for this user/owner
        let q = query(
            collection(db, PAYMENTS_COLLECTION),
            where("userId", "==", userId),
            where("status", "==", "Pending"),
            where("type", "==", "Rent")
        );

        if (ownerId) {
            q = query(q, where("ownerId", "==", ownerId));
        }

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Find the best matching record based on property name (case-insensitive)
            let paymentDoc = querySnapshot.docs.find(doc => {
                const pData = doc.data();
                const pName = (pData.propertyName || pData.property || '').toLowerCase();
                return pName === (propertyName || '').toLowerCase();
            });

            // Fallback to first pending rent if no property name matches exactly
            if (!paymentDoc) {
                paymentDoc = querySnapshot.docs[0];
            }

            if (paymentDoc) {
                const pData = paymentDoc.data();
                const currentAmount = Number(pData.amount || 0);

                // If it's a full payment or amountPaid covers the balance
                if (amountPaid === 0 || amountPaid >= currentAmount) {
                    await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentDoc.id), {
                        status: 'Completed',
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Partial payment: subtract from current pending amount
                    await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentDoc.id), {
                        amount: currentAmount - amountPaid,
                        updatedAt: new Date().toISOString()
                    });
                }
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error marking rent as paid: ", error);
        throw error;
    }
};

/**
 * BOOKING SERVICES
 */
const BOOKINGS_COLLECTION = "bookings";

export const subscribeToBookings = (ownerId, callback) => {
    if (!ownerId) {
        callback([]);
        return () => { };
    }

    // Step 1: Listen to bookings with matching ownerId (new bookings, correct flow)
    const qByOwner = query(
        collection(db, BOOKINGS_COLLECTION),
        where("ownerId", "==", ownerId)
    );

    // Step 2: Also fetch vendor's properties to find bookings linked by propertyId
    // (handles old bookings where ownerId=null was saved due to missing ownerId in posts)
    let propertyIds = [];
    let ownerBookings = [];
    let propBookings = [];

    const mergeAndReturn = () => {
        const allIds = new Set();
        const merged = [];
        [...ownerBookings, ...propBookings].forEach(b => {
            if (!allIds.has(b.id)) {
                allIds.add(b.id);
                merged.push(b);
            }
        });
        callback(merged);
    };

    // Subscribe to bookings by ownerId
    const unsubOwner = onSnapshot(qByOwner, (snap) => {
        ownerBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        mergeAndReturn();
    }, (error) => {
        console.error("Bookings (by ownerId) Sync Error:", error);
    });

    // Fetch vendor's properties then subscribe to bookings by propertyId
    let unsubPropBookings = () => { };
    getDocs(query(collection(db, "properties"), where("ownerId", "==", ownerId))).then(propSnap => {
        propertyIds = propSnap.docs.map(d => d.id);
        if (propertyIds.length === 0) return;

        // Firestore 'in' supports max 30 items
        const chunks = [];
        for (let i = 0; i < propertyIds.length; i += 30) {
            chunks.push(propertyIds.slice(i, i + 30));
        }

        const unsubs = chunks.map(chunk => {
            const qByProp = query(
                collection(db, BOOKINGS_COLLECTION),
                where("propertyId", "in", chunk)
            );
            return onSnapshot(qByProp, (snap) => {
                propBookings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                mergeAndReturn();
            }, (error) => {
                console.error("Bookings (by propertyId) Sync Error:", error);
            });
        });

        unsubPropBookings = () => unsubs.forEach(u => u());
    }).catch(err => {
        console.error("Could not fetch vendor properties for booking lookup:", err);
    });

    return () => {
        unsubOwner();
        unsubPropBookings();
    };
};


export const updateBookingStatus = async (bookingId, status, additionalData = {}) => {
    try {
        const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
        await updateDoc(bookingRef, {
            status: status,
            updatedAt: new Date().toISOString(),
            ...additionalData
        });
    } catch (error) {
        console.error("Error updating booking status: ", error);
        throw error;
    }
};
/**
 * NOTIFICATION SERVICES
 */
export const subscribeToNotifications = (userId, callback) => {
    // 🧹 Auto-cleanup old notifications (older than 24h)
    cleanupOldNotifications();

    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where("targetId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notifications);
    });
};

export const cleanupOldNotifications = async () => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where("createdAt", "<", twentyFourHoursAgo)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) return;

        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
        console.log(`🧹 Cleaned up ${snapshot.docs.length} old notifications.`);
    } catch (error) {
        console.error("Error cleaning up old notifications:", error);
    }
};

export const markNotificationAsRead = async (notificationId) => {
    try {
        const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(notificationRef, { status: 'read' });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
};

export const sendNotification = async (notifData) => {
    try {
        try {
            await cleanupOldNotifications();
        } catch (err) {
            console.warn("Cleanup failed, proceeding to send:", err);
        }

        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            ...notifData,
            status: 'unread',
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

/**
 * IMAGE UTILITIES (Firebase Storage + Compression)
 * Automatically resizes, compresses, and uploads images to Firebase Storage.
 */
export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

export const uploadImage = async (fileOrBlob, fileName = 'image.jpg', folder = 'posts') => {
    if (!fileOrBlob) return null;
    try {
        const uniqueName = `${Date.now()}_${fileName.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `${folder}/${uniqueName}`);
        const snapshot = await uploadBytes(storageRef, fileOrBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image: ", error);
        throw error;
    }
};

// Legacy support (still useful for some cases, but preferred to use uploadImage)
export const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * USER SERVICES
 */
export const getUserNotificationSettings = async (userId) => {
    try {
        const docSnap = await getDoc(doc(db, USERS_COLLECTION, userId, 'settings', 'notifications'));
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return { pushEnabled: true }; // Default
    } catch (error) {
        console.error("Error getting user settings:", error);
        return { pushEnabled: true };
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

export const getUserProfile = async (userId) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() };
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
 * AUTO-RENT GENERATION SYSTEM
 * Runs locally to check if recurring rents need induction
 */
export const checkAndGenerateMonthlyRents = async (ownerId) => {
    try {
        if (!ownerId) return;

        // 🚀 Optimization: Only run once per day per session to save resources
        const lastCheckKey = `last_rent_check_${ownerId}`;
        const today = new Date().toDateString();
        if (localStorage.getItem(lastCheckKey) === today) {
            console.log("📅 Rent generation already checked today. Skipping...");
            return;
        }

        console.log("⏳ Running monthly rent generation check...");

        // 1. Get all active renters for this owner
        const rentersQuery = query(collection(db, RENTERS_COLLECTION), where("ownerId", "==", ownerId));
        const rentersSnapshot = await getDocs(rentersQuery);

        if (rentersSnapshot.empty) {
            localStorage.setItem(lastCheckKey, today);
            return;
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentDay = now.getDate();

        // 2. Optimized: Get ALL rent payments for this owner for the current month in ONE query
        // This avoids querying inside the loop
        const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
        const paymentsQuery = query(
            collection(db, PAYMENTS_COLLECTION),
            where("ownerId", "==", ownerId),
            where("type", "==", "Rent"),
            where("createdAt", ">=", startOfMonth)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const existingRentUserIds = new Set(paymentsSnapshot.docs.map(p => p.data().userId));

        const generationPromises = [];

        for (const renterDoc of rentersSnapshot.docs) {
            const renter = { id: renterDoc.id, ...renterDoc.data() };
            const dueDay = parseInt(renter.rentDueDay) || 5;

            // Only generate if today is >= dueDay AND rent doesn't already exist for this user this month
            if (currentDay >= dueDay && !existingRentUserIds.has(renter.userId)) {
                console.log(`🚀 Queueing Auto-Rent for ${renter.name} (Day ${dueDay})`);
                generationPromises.push(addPayment({
                    userId: renter.userId,
                    propertyName: renter.property || 'StayZen Property',
                    amount: renter.rentAmount || 0,
                    status: 'Pending',
                    type: 'Rent',
                    description: `Monthly Rent - ${now.toLocaleString('default', { month: 'long' })} ${currentYear}`,
                    ownerId: ownerId,
                    createdAt: new Date().toISOString()
                }));
            }
        }

        if (generationPromises.length > 0) {
            await Promise.all(generationPromises);
            console.log(`✅ Generated ${generationPromises.length} monthly rents.`);
        }

        localStorage.setItem(lastCheckKey, today);
    } catch (error) {
        console.error("Auto-Rent Generation Error:", error);
    }
};
/**
 * MSG91 OTP SERVICES
 */
const MSG91_AUTH_KEY = "478809AuxvhiDf692434a5P1";
const MSG91_TEMPLATE_ID = "6921a3d5c37f1e344d2a2799"; // Please replace with your template ID

export const sendMsg91Otp = async (phoneNumber) => {
    if (MSG91_TEMPLATE_ID === "YOUR_TEMPLATE_ID_HERE") {
        throw new Error("MSG91 Template ID is missing!");
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const otpUrl = `https://control.msg91.com/api/v5/otp?template_id=${MSG91_TEMPLATE_ID}&mobile=${cleanPhone}&authkey=${MSG91_AUTH_KEY}`;

    console.log("[MSG91] Attempting to send OTP to:", cleanPhone);

    // List of proxies to try in order
    const proxies = [
        // 1. Direct API
        {
            name: "Direct API",
            url: otpUrl
        },
        // 2. CodeTabs Proxy
        {
            name: "CodeTabs",
            url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(otpUrl)}`
        },
        // 3. AllOrigins
        {
            name: "AllOrigins",
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(otpUrl)}`
        }
    ];

    let lastError = null;

    for (const proxy of proxies) {
        try {
            console.log(`[MSG91] Trying proxy: ${proxy.name}...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Fixed timeout

            const response = await fetch(proxy.url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const data = await response.json();
            console.log(`[MSG91] ${proxy.name} Response:`, data);

            if (data.type === "success" || data.request_id) {
                console.log(`✅ OTP sent successfully via ${proxy.name}`);
                return true;
            }
            throw new Error(data.message || "Failed to send");
        } catch (err) {
            console.warn(`[MSG91] ${proxy.name} failed:`, err.message);
            lastError = err;
            // Continue to next proxy
        }
    }

    // If all fail, throw final error with bypass hint
    throw new Error(`Failed to send OTP after trying all paths. (Last error: ${lastError?.message})`);
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
    throw new Error("Invalid OTP or verification failed");
};
