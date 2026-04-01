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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiConfig.apiKey}`;
    const body = {
        contents: [
            { role: "user", parts: [{ text: SYSTEM_PROMPT + "\n\n" + context }] }
        ]
    };

    console.log("Calling Gemini API (Coach)...");
    console.log("URL:", url.replace(/key=.*$/, "key=HIDDEN"));
    console.log("Request Body:", JSON.stringify(body, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

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
