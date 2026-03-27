import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseConfig } from "./config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Auth Error:", error);
        throw error;
    }
};

export const logout = () => signOut(auth);

export const observeAuth = (callback) => {
    onAuthStateChanged(auth, callback);
};

export { auth };
