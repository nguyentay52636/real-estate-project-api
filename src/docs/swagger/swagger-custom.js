(function () {
  const initTheme = () => {
    const currentTheme = localStorage.getItem('swagger-theme') || 'light';
    if (currentTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
  };

  const addThemeToggleButton = () => {
    // Wait for Swagger UI topbar to load
    const interval = setInterval(() => {
      const topbarWrapper = document.querySelector('.swagger-ui .topbar .topbar-wrapper');
      if (topbarWrapper) {
        clearInterval(interval);

        // Check if button already exists to avoid duplicates
        if (document.getElementById('swagger-theme-toggle')) return;

        const button = document.createElement('button');
        button.id = 'swagger-theme-toggle';
        button.className = 'theme-toggle-btn';
        
        const updateButtonContent = () => {
          const isDark = document.body.classList.contains('dark-mode');
          button.innerHTML = isDark 
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-dasharray="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><circle cx="12" cy="12" r="5" fill="#ffca28"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="none"></path></svg> Dark Mode`;
        };

        updateButtonContent();

        button.addEventListener('click', () => {
          document.body.classList.toggle('dark-mode');
          const isDark = document.body.classList.contains('dark-mode');
          localStorage.setItem('swagger-theme', isDark ? 'dark' : 'light');
          updateButtonContent();
        });

        topbarWrapper.appendChild(button);
      }
    }, 100);
  };

  initTheme();
  
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    addThemeToggleButton();
  } else {
    document.addEventListener('DOMContentLoaded', addThemeToggleButton);
  }
})();
