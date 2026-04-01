import { saveNutritionLog } from "./db.js";
import { geminiConfig } from "./config.js";

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
      "fats": number (in grams)
    }
    If you're unsure, provide your best estimate. Do not include any text other than the JSON.
    `;

    // Force Local Config Usage
    const apiKey = geminiConfig.apiKey.trim();
    console.log("API Key Source: config.js");
    console.log("Attempting stable login to Gemini 1.5 Flash (v1beta)...");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    console.log("URL:", url.replace(/key=.*$/, "key=HIDDEN"));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Details:", errorData);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error("Unexpected Gemini response structure:", data);
            throw new Error("Invalid response from Gemini API");
        }

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

    analyzeBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
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
                            <span class="value">${result.fats}g</span>
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
            console.error("Detailed Nutrition Error:", error);
            alert(`שגיאה בניתוח הארוחה: ${error.message}. בדוק את הקונסול לפרטים נוספים.`);
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'נתח ארוחה';
        }
    });
};
