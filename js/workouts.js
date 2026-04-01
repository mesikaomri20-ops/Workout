import { saveWorkout, getWorkouts, getWorkoutTypes, saveWorkoutType, deleteWorkoutType } from "./db.js";

// Strength Score = Reps * (Total Band Power || 1)
export const calculateStrengthScore = (reps, bandPower = 1) => {
    return reps * (bandPower || 1);
};

export const initWorkoutModule = async () => {
    const workoutForm = document.getElementById('workout-form');
    const saveBtn = document.getElementById('save-workout-btn');
    const workoutDateInput = document.getElementById('workout-date');
    const typeSelect = document.getElementById('workout-type-select');
    const manageTypesBtn = document.getElementById('manage-types-btn');
    const typesModal = document.getElementById('manage-types-modal');
    const closeTypesBtn = document.getElementById('close-types-modal');
    const addTypeBtn = document.getElementById('add-workout-type-btn');
    const newTypeInput = document.getElementById('new-workout-type');
    const typesList = document.getElementById('workout-types-list');
    
    if (!workoutForm || !saveBtn || !workoutDateInput || !typeSelect) return;

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    workoutDateInput.value = today;

    // Load and populate workout types
    const refreshTypes = async () => {
        const types = await getWorkoutTypes();
        
        // Populate Select
        typeSelect.innerHTML = '<option value="">בחר סוג אימון...</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.name;
            option.textContent = type.name;
            typeSelect.appendChild(option);
        });

        // Populate List in Modal
        if (typesList) {
            typesList.innerHTML = '';
            types.forEach(type => {
                const li = document.createElement('li');
                li.className = 'list-item';
                li.innerHTML = `
                    <span>${type.name}</span>
                    <button type="button" class="btn-delete" data-id="${type.id}">מחק</button>
                `;
                typesList.appendChild(li);
            });

            // Add delete listeners
            typesList.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('האם אתה בטוח שברצונך למחוק סוג אימון זה?')) {
                        await deleteWorkoutType(id);
                        await refreshTypes();
                    }
                });
            });
        }
    };

    await refreshTypes();

    // Manage Types Modal Logic
    if (manageTypesBtn && typesModal && closeTypesBtn) {
        manageTypesBtn.addEventListener('click', () => typesModal.classList.add('active'));
        closeTypesBtn.addEventListener('click', () => typesModal.classList.remove('active'));
        
        if (addTypeBtn && newTypeInput) {
            addTypeBtn.addEventListener('click', async () => {
                const name = newTypeInput.value.trim();
                if (name) {
                    await saveWorkoutType(name);
                    newTypeInput.value = '';
                    await refreshTypes();
                }
            });
        }
    }

    saveBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        
        const type = typeSelect.value;
        const date = workoutDateInput.value;

        if (!type) {
            alert('אנא בחר סוג אימון');
            return;
        }

        // Sample logic for bodyweight/band sets
        const reps = 10; 
        const bandPower = 0; 
        const strengthScore = calculateStrengthScore(reps, bandPower);

        const workoutData = {
            type: type,
            date: date,
            hrAvg: parseInt(document.getElementById('hr-avg').value) || 0,
            hrMax: parseInt(document.getElementById('hr-max').value) || 0,
            teAerobic: parseFloat(document.getElementById('te-aerobic').value) || 0,
            teAnaerobic: parseFloat(document.getElementById('te-anaerobic').value) || 0,
            trainingLoad: parseInt(document.getElementById('training-load').value) || 0,
            strengthScore: strengthScore,
            timestamp: new Date()
        };

        try {
            await saveWorkout(workoutData);
            alert('האימון נשמר בהצלחה');
            workoutForm.reset();
            workoutDateInput.value = today; // Reset date to today
        } catch (error) {
            console.error("Error saving workout:", error);
            alert('שגיאה בשמירת האימון');
        }
    });
};

export const loadWorkoutHistory = async () => {
    const workouts = await getWorkouts(5);
};
