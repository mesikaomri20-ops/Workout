import { saveWorkout, getWorkouts } from "./db.js";

// Strength Score = Reps * (Total Band Power || 1)
export const calculateStrengthScore = (reps, bandPower = 1) => {
    return reps * (bandPower || 1);
};

export const initWorkoutModule = () => {
    const workoutForm = document.getElementById('workout-form');
    if (!workoutForm) return;

    workoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Sample logic for bodyweight/band sets
        const reps = 10; // This would normally come from a dynamic list of sets
        const bandPower = 0; // 0 for bodyweight
        const strengthScore = calculateStrengthScore(reps, bandPower);

        const workoutData = {
            type: document.getElementById('workout-type').value,
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
        } catch (error) {
            console.error("Error saving workout:", error);
            alert('שגיאה בשמירת האימון');
        }
    });
};

export const loadWorkoutHistory = async () => {
    const workouts = await getWorkouts(5);
    // Logic to display workout history in the UI
};
