import { auth, provider, signInWithPopup } from './db.js';
import { onAuthStateChanged, signOut } from "firebase/auth";

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Auth Error:", error);
        alert("שגיאת התחברות: " + error.code + "\n" + error.message);
        throw error;
    }
};

export const logout = () => {
    return signOut(auth);
};

export const observeAuth = (callback) => {
    onAuthStateChanged(auth, callback);
};
