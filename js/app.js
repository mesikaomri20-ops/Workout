import { observeAuth, loginWithGoogle, logout } from "./auth.js";
import { initProfileModule, calculateMetrics, updateUIWithMetrics } from "./profile.js";
import { initWorkoutModule } from "./workouts.js";
import { initNutritionModule } from "./nutrition.js";
import { initCoachModule } from "./coach.js";
import { getUserProfile } from "./db.js";

document.addEventListener('DOMContentLoaded', () => {
    // Auth State Handling
    const authModal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('google-login');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name-display');

    observeAuth(async (user) => {
        if (user) {
            authModal.classList.remove('active');
            userNameDisplay.textContent = user.displayName.split(' ')[0];
            
            // Initialize Modules
            await initProfileModule();
            initWorkoutModule();
            initNutritionModule();
            initCoachModule();

            // Initial UI Update
            const profile = await getUserProfile();
            if (profile) {
                const metrics = calculateMetrics(profile);
                updateUIWithMetrics(metrics);
            }
        } else {
            authModal.classList.add('active');
        }
    });

    loginBtn.addEventListener('click', loginWithGoogle);
    logoutBtn.addEventListener('click', logout);

    // View Switching
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            
            // Update Nav
            navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');

            // Update Views
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${viewId}`).classList.add('active');

            // Scroll to top
            window.scrollTo(0, 0);
        });
    });

    // Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    }

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.replace('dark-theme', 'light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.replace('light-theme', 'dark-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered', reg))
                .catch(err => console.log('SW Registration failed', err));
        });
    }
});
