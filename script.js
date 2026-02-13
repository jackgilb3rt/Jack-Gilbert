// Scroll-triggered fade-in animations
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.add('fade-in');
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Smooth active nav link highlighting
  const navLinks = document.querySelectorAll('.nav-links a');
  const sectionElements = document.querySelectorAll('.section');

  const navObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            link.style.color = link.getAttribute('href') === `#${id}`
              ? '#e4e4e7'
              : '';
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sectionElements.forEach(section => navObserver.observe(section));
});
