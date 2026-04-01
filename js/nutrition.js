import { saveNutritionLog } from "./db.js";
import { geminiConfig } from "./config.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export const analyzeNutritionNLP = async (text) => {
    const prompt = `
    Analyze the following Hebrew text describing a meal and return a structured JSON object.
    The text is: "${text}"
    
    Return ONLY a JSON object with this exact structure:
    {
      "meal": "brief description in Hebrew",
      "calories": number,
      "protein": number (in grams),
      "carbs": number (in grams),
      "fat": number (in grams)
    }
    If you're unsure, provide your best estimate. Do not include any text other than the JSON.
    `;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${geminiConfig.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Extract JSON (sometimes Gemini wraps it in code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Could not parse AI response");
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
};

export const initNutritionModule = () => {
    const nutritionInput = document.getElementById('nutrition-input');
    const analyzeBtn = document.getElementById('analyze-nutrition');
    const resultDiv = document.getElementById('nutrition-result');

    if (!nutritionInput || !analyzeBtn || !resultDiv) return;

    analyzeBtn.addEventListener('click', async () => {
        const text = nutritionInput.value.trim();
        if (!text) return;

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'מנתח...';

        try {
            const result = await analyzeNutritionNLP(text);
            
            // Display result
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="luxury-card result-card">
                    <h3>סיכום ארוחה</h3>
                    <p><strong>ארוחה:</strong> ${result.meal}</p>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="label">קלוריות</span>
                            <span class="value">${result.calories}</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">חלבון</span>
                            <span class="value">${result.protein}g</span>
                        </div>
                    </div>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="label">פחמימות</span>
                            <span class="value">${result.carbs}g</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">שומן</span>
                            <span class="value">${result.fat}g</span>
                        </div>
                    </div>
                    <button id="save-log" class="btn-primary" style="margin-top: 1rem;">שמור ביומן</button>
                </div>
            `;

            document.getElementById('save-log').addEventListener('click', async () => {
                await saveNutritionLog(result);
                alert('הארוחה נשמרה ביומן');
                nutritionInput.value = '';
                resultDiv.style.display = 'none';
            });

        } catch (error) {
            alert('שגיאה בניתוח הארוחה. וודא שמפתח ה-API תקין.');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'נתח ארוחה';
        }
    });
};
