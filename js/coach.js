import { geminiConfig } from "./config.js";
import { getUserProfile, getWorkouts, getNutritionHistory } from "./db.js";

const SYSTEM_PROMPT = `
Act as a performance coach for Omri, a finance analyst with an Economics background.
Analyze his combined data (workouts, nutrition, Garmin Load) to provide concise, data-driven, motivational advice in Hebrew.
Reference his Dec 2026 wedding goal.
Be professional, minimal, and elite in your tone.
`;

export const getCoachResponse = async (userMessage) => {
    // Gather context
    const profile = await getUserProfile();
    const recentWorkouts = await getWorkouts(3);
    const recentNutrition = await getNutritionHistory(3);

    const context = `
    Omri's Profile: ${JSON.stringify(profile)}
    Recent Workouts: ${JSON.stringify(recentWorkouts)}
    Recent Nutrition: ${JSON.stringify(recentNutrition)}
    User Query: "${userMessage}"
    `;

    const body = {
        contents: [
            { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + context }] }
        ]
    };

    const tryGeminiRequest = async (modelName) => {
        const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${geminiConfig.apiKey.trim()}`;
        console.log(`Calling Gemini API v1 (${modelName})...`);
        console.log("URL:", url.replace(/key=.*$/, "key=HIDDEN"));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return response;
    };

    try {
        let response = await tryGeminiRequest('gemini-3-flash');

        // Fallback if 404
        if (response.status === 404) {
            console.warn("gemini-3-flash returned 404. Trying fallback gemini-3-7b...");
            response = await tryGeminiRequest('gemini-3-7b');
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini Coach API Error Details:", errorData);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error("Unexpected Gemini Coach response structure:", data);
            throw new Error("Invalid response from Gemini API");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Coach Error:", error);
        return `מצטער, הייתה לי שגיאה בחיבור למערכת ה-AI: ${error.message}. אנא בדוק את הקונסול לפרטים נוספים.`;
    }
};

export const initCoachModule = () => {
    const coachInput = document.getElementById('coach-input');
    const sendBtn = document.getElementById('send-to-coach');
    const chatContainer = document.getElementById('coach-chat');

    if (!coachInput || !sendBtn || !chatContainer) return;

    const appendMessage = (text, type) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.textContent = text;
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    sendBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        const text = coachInput.value.trim();
        if (!text) return;

        appendMessage(text, 'user');
        coachInput.value = '';
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message coach loading';
        loadingDiv.textContent = 'מנתח נתונים...';
        chatContainer.appendChild(loadingDiv);

        const response = await getCoachResponse(text);
        
        loadingDiv.remove();
        appendMessage(response, 'coach');
    });

    coachInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });
};
