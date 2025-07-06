(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const toggle = document.getElementById('theme-toggle');
        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        if (toggle) {
            toggle.addEventListener('click', function() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                setTheme(next);
            });
        }
        function setTheme(mode) {
            document.documentElement.setAttribute('data-theme', mode);
            localStorage.setItem('theme', mode);
            if (toggle) toggle.textContent = mode === 'dark' ? 'Светъл режим' : 'Тъмен режим';
        }
    });
})();

