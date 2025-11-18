document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = document.getElementById("contactMsg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 4000);
  });
});
