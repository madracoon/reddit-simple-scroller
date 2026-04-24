document.addEventListener('DOMContentLoaded', function() {
  function initImageFullscreen() {
    document.addEventListener("click", (e) => {
      const img = e.target.closest(".slide img, .viewport__post img");
      if (!img) return;

      openFullscreen(img.src);
    });
  }

  function openFullscreen(src) {
    const opened = document.querySelector(".img-fullscreen");
    if (opened) opened.remove();

    document.body.style.overflow = "hidden";

    const fullescreenOverlay = document.createElement("div");
    fullescreenOverlay.className = "img-fullscreen";

    const image = document.createElement("img");
    const fullSrc = `https://i.redd.it/${src.match(/(?<=\/)([\d\w.]+)(?=\?)/)[0]}`;
    image.src = fullSrc;

    fullescreenOverlay.appendChild(image);
    document.body.appendChild(fullescreenOverlay);

    fullescreenOverlay.addEventListener("click", () => {
      fullescreenOverlay.remove();

      document.body.style.removeProperty("overflow");

    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        fullescreenOverlay.remove();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  initImageFullscreen();
});

