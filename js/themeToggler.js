document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById("themeToggle");

  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateIcon(savedTheme);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    updateIcon(prefersDark ? "dark" : "light");
  }

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");

    const newTheme = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    updateIcon(newTheme);
  });

  function updateIcon(theme) {
    toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}); 

document.addEventListener('DOMContentLoaded', function() {
  const fitContent = document.getElementById("fit-content");

  fitContent.addEventListener('change', () => {
    if (fitContent.checked) {
      document.documentElement.style.setProperty('--content-height', '80vh');
    } else {
      document.documentElement.style.setProperty('--content-height', '100%');
    }
  })
});
