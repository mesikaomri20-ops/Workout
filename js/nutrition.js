import { saveNutritionLog, getDailyNutritionLogs, getNutritionLogsRange, deleteNutritionLog, getUserProfile } from "./db.js";
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    console.log("Calling Gemini 2.5 Flash (v1beta)...");
    console.log("URL:", url.replace(/key=.*$/, "key=HIDDEN"));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error Details:", errorData);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

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
    const datePicker = document.getElementById('nutrition-date-picker');
    
    const caloriesTotalEl = document.getElementById('today-calories-total');
    const remainingCaloriesEl = document.getElementById('remaining-calories');
    const proteinTotalEl = document.getElementById('today-protein-total');
    const carbsTotalEl = document.getElementById('today-carbs-total');
    const fatsTotalEl = document.getElementById('today-fats-total');

    if (!nutritionInput || !analyzeBtn || !resultDiv || !logsBody || !datePicker) return;

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    datePicker.value = today;

    const refreshDailySummary = async () => {
        const selectedDate = datePicker.value;
        
        // Calculate 7-day range
        const endDate = selectedDate;
        const startDateObj = new Date(selectedDate);
        startDateObj.setDate(startDateObj.getDate() - 7);
        const startDate = startDateObj.toISOString().split('T')[0];

        // Fetch logs for totals (Selected Day Only)
        const dailyLogs = await getDailyNutritionLogs(selectedDate);
        
        // Fetch logs for table (7-day range)
        const historyLogs = await getNutritionLogsRange(startDate, endDate);

        const profile = await getUserProfile();
        const targets = calculateMetrics(profile);

        // Sum totals for selected day
        const totals = dailyLogs.reduce((acc, log) => {
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

        // Render Table (History)
        logsBody.innerHTML = '';
        let lastDate = null;

        historyLogs.forEach(log => {
            // Add date separator
            if (log.logDate !== lastDate) {
                const separatorTr = document.createElement('tr');
                separatorTr.className = 'date-group-header';
                separatorTr.innerHTML = `<td colspan="7">${formatHebrewDate(log.logDate)}</td>`;
                logsBody.appendChild(separatorTr);
                lastDate = log.logDate;
            }

            const tr = document.createElement('tr');
            tr.className = log.logDate === selectedDate ? 'current-day-row' : '';
            tr.innerHTML = `
                <td class="date-cell">${formatDateCompact(log.logDate)}</td>
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
                const log = historyLogs.find(l => l.id === btn.dataset.id);
                if (log) {
                    nutritionInput.value = `תיקון: אכלתי ${log.meal} (${log.calories} קלוריות, ${log.protein} חלבון, ${log.carbs} פחמימות, ${log.fats} שומן)`;
                    datePicker.value = log.logDate; // Ensure we save to the original date
                    nutritionInput.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    };

    // Helper: Format date for separators
    const formatHebrewDate = (dateStr) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString('he-IL', options);
    };

    // Helper: Format date for cells
    const formatDateCompact = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    // Refresh when date changes
    datePicker.addEventListener('change', refreshDailySummary);

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
                const selectedDate = datePicker.value;
                await saveNutritionLog(result, selectedDate);
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
