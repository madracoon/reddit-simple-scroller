document.addEventListener('DOMContentLoaded', function() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          initSliders(node);
        }
      });
    });
  });

  observer.observe(document.querySelector(".viewport"), {
    childList: true,
    subtree: true
  });
}); 

function initSliders(root = document) {
  const sliders = root.querySelectorAll(".slider:not(.slider-initialized)");

  sliders.forEach(slider => {
    slider.classList.add("slider-initialized");

    const slides = slider.querySelectorAll(".slide");

    // Slider track
    const track = document.createElement("div");
    track.className = "slider-track";

    slides.forEach(slide => track.appendChild(slide));
    slider.appendChild(track);

    let index = 0;

    // NavButtons
    const prev = document.createElement("button");
    const next = document.createElement("button");

    prev.className = "slider-btn prev";
    next.className = "slider-btn next";

    prev.textContent = "‹";
    next.textContent = "›";

    slider.appendChild(prev);
    slider.appendChild(next);

    prev.onclick = () => move(index - 1);
    next.onclick = () => move(index + 1);

    // Dots
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "slider-dots";

    const dots = [];

    slides.forEach((_, i) => {
      const dot = document.createElement("div");
      dot.className = "slider-dot";
      dot.onclick = () => move(i);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    slider.appendChild(dotsWrap);

    // Move logic 
    function move(i) {
      index = Math.max(0, Math.min(i, slides.length - 1));
      track.style.transform = `translateX(-${index * 100}%)`;

      dots.forEach((d, idx) =>
        d.classList.toggle("active", idx === index)
      );
    }

    move(0);

    // Swipe logic
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    track.addEventListener("touchstart", e => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    track.addEventListener("touchmove", e => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX;
    });

    track.addEventListener("touchend", () => {
      const diff = startX - currentX;

      if (Math.abs(diff) > 50) {
        if (diff > 0) move(index + 1);
        else move(index - 1);
      }

      isDragging = false;
    });
  });
}