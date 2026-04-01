import { saveNutritionLog, getDailyNutritionLogs, deleteNutritionLog, getUserProfile } from "./db.js";
import { geminiConfig } from "./config.js";
import { calculateMetrics } from "./profile.js";

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

    const apiKey = geminiConfig.apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error("Could not parse AI response");
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
};

export const initNutritionModule = async () => {
    const nutritionInput = document.getElementById('nutrition-input');
    const analyzeBtn = document.getElementById('analyze-nutrition');
    const resultDiv = document.getElementById('nutrition-result');
    const logsBody = document.getElementById('nutrition-logs-body');
    
    const caloriesTotalEl = document.getElementById('today-calories-total');
    const remainingCaloriesEl = document.getElementById('remaining-calories');
    const proteinTotalEl = document.getElementById('today-protein-total');
    const carbsTotalEl = document.getElementById('today-carbs-total');
    const fatsTotalEl = document.getElementById('today-fats-total');

    if (!nutritionInput || !analyzeBtn || !resultDiv || !logsBody) return;

    const refreshDailySummary = async () => {
        const today = new Date().toISOString().split('T')[0];
        const logs = await getDailyNutritionLogs(today);
        const profile = await getUserProfile();
        const targets = calculateMetrics(profile);

        // Sum totals
        const totals = logs.reduce((acc, log) => {
            acc.calories += log.calories || 0;
            acc.protein += log.protein || 0;
            acc.carbs += log.carbs || 0;
            acc.fats += log.fats || 0;
            return acc;
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        // Update Totals UI
        caloriesTotalEl.textContent = Math.round(totals.calories);
        proteinTotalEl.textContent = `${Math.round(totals.protein)}g`;
        carbsTotalEl.textContent = `${Math.round(totals.carbs)}g`;
        fatsTotalEl.textContent = `${Math.round(totals.fats)}g`;

        // Update Remaining UI
        if (targets.tdee !== '-') {
            const remaining = targets.tdee - totals.calories;
            remainingCaloriesEl.textContent = Math.round(remaining);
            remainingCaloriesEl.className = remaining >= 0 ? 'value text-success' : 'value text-danger';
        } else {
            remainingCaloriesEl.textContent = '-';
        }

        // Render Table
        logsBody.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.meal}</td>
                <td>${Math.round(log.calories)}</td>
                <td>${Math.round(log.protein)}g</td>
                <td>${Math.round(log.carbs)}g</td>
                <td>${Math.round(log.fats)}g</td>
                <td>
                    <button class="btn-edit" data-id="${log.id}">ערוך</button>
                    <button class="btn-delete" data-id="${log.id}">מחק</button>
                </td>
            `;
            logsBody.appendChild(tr);
        });

        // Add Listeners
        logsBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('למחוק רישום זה?')) {
                    await deleteNutritionLog(btn.dataset.id);
                    await refreshDailySummary();
                }
            });
        });

        logsBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                const log = logs.find(l => l.id === btn.dataset.id);
                if (log) {
                    nutritionInput.value = `תיקון: אכלתי ${log.meal} (${log.calories} קלוריות, ${log.protein} חלבון, ${log.carbs} פחמימות, ${log.fats} שומן)`;
                    nutritionInput.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    };

    await refreshDailySummary();

    analyzeBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        const text = nutritionInput.value.trim();
        if (!text) return;

        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'מנתח...';

        try {
            const result = await analyzeNutritionNLP(text);
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = `
                <div class="luxury-card result-card">
                    <h3>סיכום ארוחה</h3>
                    <p><strong>ארוחה:</strong> ${result.meal}</p>
                    <div class="summary-stats">
                        <div class="stat-item"><span class="label">קלוריות</span><span class="value">${result.calories}</span></div>
                        <div class="stat-item"><span class="label">חלבון</span><span class="value">${result.protein}g</span></div>
                    </div>
                    <div class="summary-stats">
                        <div class="stat-item"><span class="label">פחמימות</span><span class="value">${result.carbs}g</span></div>
                        <div class="stat-item"><span class="label">שומן</span><span class="value">${result.fats}g</span></div>
                    </div>
                    <button id="save-log-btn" class="btn-primary" style="margin-top: 1rem;">שמור ביומן</button>
                </div>
            `;

            document.getElementById('save-log-btn').addEventListener('click', async () => {
                await saveNutritionLog(result);
                alert('הארוחה נשמרה');
                nutritionInput.value = '';
                resultDiv.style.display = 'none';
                await refreshDailySummary();
            });
        } catch (error) {
            alert('שגיאה בניתוח הארוחה');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'נתח ארוחה';
        }
    });
};
