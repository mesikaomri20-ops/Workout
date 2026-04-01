import { observeAuth, loginWithGoogle, logout } from "./auth.js";
import { initProfileModule, calculateMetrics, updateUIWithMetrics } from "./profile.js";
import { initWorkoutModule } from "./workouts.js";
import { initNutritionModule } from "./nutrition.js";
import { initCoachModule } from "./coach.js";
import { getUserProfile, auth } from "./db.js";

document.addEventListener('DOMContentLoaded', () => {
    // Auth State Handling
    const authModal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('google-login');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name-display');
    const loadingOverlay = document.getElementById('loading-overlay');

    let isInitialized = false;

    // Initial check: if Firebase already has a user, hide the modal immediately
    // but we still rely on observeAuth for the source of truth
    // Check if user is already logged in (for faster UI response)
    if (auth.currentUser) {
        authModal.classList.remove('active');
    }

    observeAuth(async (user) => {
        // Hide loading overlay once auth state is determined
        if (loadingOverlay) loadingOverlay.classList.add('hidden');

        if (user) {
            // Hide login modal if user is authenticated
            authModal.classList.remove('active');
            userNameDisplay.textContent = user.displayName ? user.displayName.split(' ')[0] : 'עומרי';
            
            // Initialize Modules ONLY ONCE
            if (!isInitialized) {
                isInitialized = true;
                try {
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
                } catch (err) {
                    console.error("Initialization error:", err);
                }
            }
        } else {
            // Only show modal if user is definitely NOT logged in
            // and we're not currently initializing or something
            authModal.classList.add('active');
            isInitialized = false; 
        }
    });

    if (loginBtn) loginBtn.addEventListener('click', loginWithGoogle);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

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

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.classList.contains('dark-theme')) {
                body.classList.replace('dark-theme', 'light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.replace('light-theme', 'dark-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW Registered', reg))
                .catch(err => console.log('SW Registration failed', err));
        });
    }
});
