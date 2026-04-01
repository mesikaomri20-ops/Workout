import { auth, provider, signInWithPopup } from './db.js';

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Auth Error:", error);
        // זה יקפיץ הודעה אם גוגל עדיין חוסם אותנו
        alert("שגיאת התחברות: " + error.code + "\n" + error.message);
        throw error;
    }
};

export const logoutUser = () => {
    return auth.signOut();
};