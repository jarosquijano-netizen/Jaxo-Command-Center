// ============================================
// NAVIGATION MANAGER
// ============================================

class NavigationManager {
    constructor() {
        this.currentSection = 'dashboard';
        this.sections = document.querySelectorAll('.module-section');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showSection(this.currentSection);
    }

    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                if (targetSection) {
                    this.navigateToSection(targetSection);
                }
            });
        });
    }

    navigateToSection(sectionId) {
        console.log('🔗 Click en navegación hacia:', sectionId);
        
        // Hide all sections
        this.sections.forEach(section => {
            console.log('🔗 Quitando clase active de:', section.id);
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            console.log('🔗 Activando sección:', sectionId);
            console.log('🔗 Clases de la sección:', targetSection.className);
            targetSection.classList.add('active');
            
            // Log computed display
            const computedStyle = window.getComputedStyle(targetSection);
            console.log('🔗 Estilo computed display:', computedStyle.display);
        }

        // Add active class to clicked nav link
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentSection = sectionId;

        // Load data for specific sections
        this.loadSectionData(sectionId);
    }

    showSection(sectionId) {
        this.navigateToSection(sectionId);
    }

    loadSectionData(sectionId) {
        // Load data based on section
        switch(sectionId) {
            case 'menu':
                if (typeof menuManager !== 'undefined') {
                    setTimeout(() => menuManager.loadCurrentWeek(), 100);
                }
                break;
            case 'family':
                if (typeof familyManager !== 'undefined') {
                    setTimeout(() => familyManager.loadMembers(), 100);
                }
                break;
            case 'cleaning':
                if (typeof cleaningManager !== 'undefined') {
                    setTimeout(() => cleaningManager.loadCurrentWeek(), 100);
                }
                break;
            case 'calendar':
                if (typeof calendarManager !== 'undefined') {
                    setTimeout(() => {
                        console.log('🔗 Llamando a calendarManager.loadCurrentWeek()');
                        calendarManager.loadCurrentWeek();
                    }, 100);
                }
                break;
            case 'dashboard':
                if (typeof dashboardManager !== 'undefined') {
                    setTimeout(() => dashboardManager.loadRealData(), 100);
                }
                break;
        }
    }

    getCurrentSection() {
        return this.currentSection;
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});
