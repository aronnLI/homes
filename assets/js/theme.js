(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const pref = () => {
    try {
      return localStorage.getItem('theme') || 'auto';
    } catch (e) {
      return 'auto';
    }
  };

  const apply = (value) => {
    const dark = value === 'dark' || (value !== 'light' && media.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };

  apply(pref());

  media.addEventListener('change', () => {
    if (pref() === 'auto') apply('auto');
  });

  window.setTheme = (value) => {
    try {
      localStorage.setItem('theme', value);
    } catch (e) {
      /* приватный режим — тема останется до перезагрузки */
    }
    apply(value);
  };
})();
