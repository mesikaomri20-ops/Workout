import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { auth } from "./auth.js";

const db = getFirestore();

// User Profile Functions
export const saveUserProfile = async (profileData) => {
    const user = auth.currentUser;
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { ...profileData, updatedAt: new Date() }, { merge: true });
};

export const getUserProfile = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data() : null;
};

// Workout Functions
export const saveWorkout = async (workoutData) => {
    const user = auth.currentUser;
    if (!user) return;
    const workoutCollectionRef = collection(db, "users", user.uid, "workouts");
    await addDoc(workoutCollectionRef, { ...workoutData, timestamp: new Date() });
};

export const getWorkouts = async (limitCount = 10) => {
    const user = auth.currentUser;
    if (!user) return [];
    const workoutCollectionRef = collection(db, "users", user.uid, "workouts");
    const q = query(workoutCollectionRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Nutrition Functions
export const saveNutritionLog = async (logData) => {
    const user = auth.currentUser;
    if (!user) return;
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutrition");
    await addDoc(nutritionCollectionRef, { ...logData, timestamp: new Date() });
};

export const getNutritionHistory = async (limitCount = 10) => {
    const user = auth.currentUser;
    if (!user) return [];
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutrition");
    const q = query(nutritionCollectionRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export { db };
