import { saveUserProfile, getUserProfile } from "./db.js";

export const calculateMetrics = (profile) => {
    if (!profile || !profile.weight || !profile.height || !profile.age || !profile.gender || !profile.activity) {
        return {
            bmi: '-',
            bmr: '-',
            tdee: '-',
            proteinTarget: '-'
        };
    }

    const { weight, height, age, gender, activity } = profile;
    
    // BMI: weight / (height/100)^2
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    // BMR (Mifflin-St Jeor Equation)
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    // TDEE: BMR * Activity Factor
    const tdee = bmr * parseFloat(activity);

    // Protein Goal: weight * 1.8
    const proteinTarget = weight * 1.8;

    return {
        bmi: bmi.toFixed(1),
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        proteinTarget: Math.round(proteinTarget)
    };
};

export const updateUIWithMetrics = (metrics) => {
    const dailyCalories = document.getElementById('daily-calories-target');
    const dailyProtein = document.getElementById('daily-protein-target');
    const homeBmi = document.getElementById('home-bmi');
    const homeBmr = document.getElementById('home-bmr');

    if (dailyCalories) dailyCalories.textContent = metrics.tdee;
    if (dailyProtein) dailyProtein.textContent = metrics.proteinTarget === '-' ? '-' : `${metrics.proteinTarget}g`;
    if (homeBmi) homeBmi.textContent = metrics.bmi;
    if (homeBmr) homeBmr.textContent = metrics.bmr;
};

export const initProfileModule = async () => {
    const profileForm = document.getElementById('profile-form');
    const saveBtn = document.getElementById('save-profile-btn');
    
    if (!profileForm || !saveBtn) return;

    // Load existing profile
    const profile = await getUserProfile();
    if (profile) {
        document.getElementById('profile-height').value = profile.height || '';
        document.getElementById('profile-weight').value = profile.weight || '';
        document.getElementById('profile-age').value = profile.age || "";
        document.getElementById('profile-gender').value = profile.gender || "male";
        document.getElementById('profile-activity').value = profile.activity || "1.2";
        
        const metrics = calculateMetrics(profile);
        updateUIWithMetrics(metrics);
    } else {
        // If no profile, still call update to show default state ('-')
        updateUIWithMetrics(calculateMetrics(null));
    }

    saveBtn.addEventListener('click', async (e) => {
        if (e) e.preventDefault();
        
        const profileData = {
            height: parseFloat(document.getElementById('profile-height').value),
            weight: parseFloat(document.getElementById('profile-weight').value),
            age: parseInt(document.getElementById('profile-age').value),
            gender: document.getElementById('profile-gender').value,
            activity: document.getElementById('profile-activity').value,
        };

        await saveUserProfile(profileData);
        const metrics = calculateMetrics(profileData);
        updateUIWithMetrics(metrics);
        alert('הפרופיל עודכן בהצלחה');
    });
};
