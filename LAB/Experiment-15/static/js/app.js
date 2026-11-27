// Static JS served from static/js/app.js via Django {% static %}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-confirm-delete]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!window.confirm('Are you sure you want to delete this task?')) {
        event.preventDefault();
      }
    });
  });
});
