import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, getDocs, limit } from "firebase/firestore";
import { firebaseConfig } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

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
export const saveNutritionLog = async (logData, customDate = null) => {
    const user = auth.currentUser;
    if (!user) return;
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutritionLogs");
    const dataToSave = { 
        ...logData, 
        timestamp: new Date(),
        logDate: customDate || new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };
    await addDoc(nutritionCollectionRef, dataToSave);
};

export const getDailyNutritionLogs = async (dateStr) => {
    const user = auth.currentUser;
    if (!user) return [];
    
    const { where } = await import("firebase/firestore");
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutritionLogs");
    const q = query(
        nutritionCollectionRef, 
        where("logDate", "==", dateStr),
        orderBy("timestamp", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getNutritionLogsRange = async (startDate, endDate) => {
    const user = auth.currentUser;
    if (!user) return [];
    
    const { where } = await import("firebase/firestore");
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutritionLogs");
    const q = query(
        nutritionCollectionRef, 
        where("logDate", ">=", startDate),
        where("logDate", "<=", endDate),
        orderBy("logDate", "desc"),
        orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteNutritionLog = async (logId) => {
    const user = auth.currentUser;
    if (!user) return;
    const logDocRef = doc(db, "users", user.uid, "nutritionLogs", logId);
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(logDocRef);
};

export const updateNutritionLog = async (logId, updatedData) => {
    const user = auth.currentUser;
    if (!user) return;
    const logDocRef = doc(db, "users", user.uid, "nutritionLogs", logId);
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(logDocRef, { ...updatedData, updatedAt: new Date() });
};

export const getNutritionHistory = async (limitCount = 10) => {
    const user = auth.currentUser;
    if (!user) return [];
    const nutritionCollectionRef = collection(db, "users", user.uid, "nutrition");
    const q = query(nutritionCollectionRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Workout Types Functions
export const saveWorkoutType = async (typeName) => {
    const user = auth.currentUser;
    if (!user) return;
    const typesCollectionRef = collection(db, "users", user.uid, "workout_types");
    await addDoc(typesCollectionRef, { name: typeName, createdAt: new Date() });
};

export const getWorkoutTypes = async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const typesCollectionRef = collection(db, "users", user.uid, "workout_types");
    const q = query(typesCollectionRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteWorkoutType = async (typeId) => {
    const user = auth.currentUser;
    if (!user) return;
    const typeDocRef = doc(db, "users", user.uid, "workout_types", typeId);
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(typeDocRef);
};

export { auth, db, provider, signInWithPopup };
