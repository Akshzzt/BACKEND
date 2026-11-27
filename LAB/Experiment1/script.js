'use strict';

/* 1. Custom Element demonstrating <template> + <slot> + Shadow DOM */
class Html5Badge extends HTMLElement {
  constructor() {
    super();
    const tpl = document.getElementById('badge-template');
    if (tpl) {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(tpl.content.cloneNode(true));
    }
  }
}

if (!customElements.get('html5-badge')) {
  customElements.define('html5-badge', Html5Badge);
}

document.addEventListener('DOMContentLoaded', () => {
  /* 2. Live DOM HTML5 tag audit */
  const collectTags = (root, set) => {
    root.querySelectorAll('*').forEach((el) => {
      const name = el.tagName.toLowerCase();
      if (!name.includes('-')) {
        set.add(name);
      }
      if (el instanceof HTMLTemplateElement) {
        collectTags(el.content, set);
      }
    });
  };

  const uniqueTags = new Set();
  collectTags(document, uniqueTags);
  const tagCountEl = document.getElementById('tag-count');
  if (tagCountEl) {
    tagCountEl.textContent = String(uniqueTags.size);
  }

  /* 3. Search / section filter */
  const filterInput = document.getElementById('section-filter');
  const clearFilterBtn = document.getElementById('clear-filter');
  const sections = Array.from(document.querySelectorAll('main section.card'));

  const applyFilter = () => {
    const query = (filterInput?.value || '').trim().toLowerCase();
    sections.forEach((sec) => {
      if (!query) {
        sec.classList.remove('is-hidden');
        return;
      }
      const haystack = `${sec.dataset.tags || ''} ${sec.textContent || ''}`.toLowerCase();
      sec.classList.toggle('is-hidden', !haystack.includes(query));
    });
  };

  filterInput?.addEventListener('input', applyFilter);
  clearFilterBtn?.addEventListener('click', () => {
    if (filterInput) {
      filterInput.value = '';
      applyFilter();
      filterInput.focus();
    }
  });

  /* 4. <menu> toolbar actions */
  document.querySelectorAll('[data-menu-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-menu-action');
      const detailsList = document.querySelectorAll('details');
      if (action === 'Expand All') {
        detailsList.forEach((d) => { d.open = true; });
      } else if (action === 'Collapse All') {
        detailsList.forEach((d) => { d.open = false; });
      } else if (action === 'Scroll Top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  /* 5. <map> + <area> click readout */
  const mapStatus = document.getElementById('map-status');
  document.querySelectorAll('map[name="html5-map"] area').forEach((area) => {
    area.addEventListener('click', (event) => {
      event.preventDefault();
      const region = area.getAttribute('data-region') || area.alt;
      if (mapStatus) {
        mapStatus.textContent = `Selected <area>: ${region} (target ${area.getAttribute('href')})`;
      }
    });
  });

  /* 6. Interactive 2D <canvas> wave animation */
  const canvas = document.getElementById('wave-canvas');
  const toggleCanvasBtn = document.getElementById('toggle-canvas');
  let animating = true;
  let phase = 0;

  if (canvas instanceof HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    const drawFrame = () => {
      if (!ctx) return;
      const { width, height } = canvas;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 38) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Sine wave 1
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const y = height / 2 + Math.sin(x * 0.03 + phase) * 34;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Sine wave 2
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const y = height / 2 + Math.cos(x * 0.025 - phase * 1.3) * 24;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (animating) {
        phase += 0.05;
        requestAnimationFrame(drawFrame);
      }
    };

    requestAnimationFrame(drawFrame);
    toggleCanvasBtn?.addEventListener('click', () => {
      animating = !animating;
      if (animating) requestAnimationFrame(drawFrame);
    });
  }

  /* 7. Live <video> canvas captureStream demo */
  const videoEl = document.getElementById('demo-video');
  const startStreamBtn = document.getElementById('start-video-stream');
  startStreamBtn?.addEventListener('click', () => {
    if (!(videoEl instanceof HTMLVideoElement) || !(canvas instanceof HTMLCanvasElement)) return;
    if (typeof canvas.captureStream !== 'function') {
      startStreamBtn.textContent = 'captureStream() unsupported in this browser';
      return;
    }
    videoEl.srcObject = canvas.captureStream(30);
    videoEl.play().catch(() => {});
    startStreamBtn.textContent = 'Streaming Live Canvas to <video>';
  });

  /* 8. <template> + <slot> cloning */
  const mountEl = document.getElementById('template-mount');
  const cloneBtn = document.getElementById('clone-template');
  let cloneIndex = 1;
  cloneBtn?.addEventListener('click', () => {
    if (!mountEl) return;
    cloneIndex += 1;
    const badge = document.createElement('html5-badge');
    const titleSpan = document.createElement('span');
    titleSpan.slot = 'title';
    titleSpan.textContent = `Clone #${cloneIndex}`;
    badge.appendChild(titleSpan);
    badge.appendChild(document.createTextNode('Instantiated from <template>'));
    mountEl.appendChild(badge);
  });

  /* 9. Form <output>, color theme, and submit feedback */
  const form = document.getElementById('showcase-form');
  const calcA = document.getElementById('calc-a');
  const calcB = document.getElementById('calc-b');
  const calcResult = document.getElementById('calc-result');
  const colorInput = form?.querySelector('input[type="color"]');
  const pingBtn = document.getElementById('ping-btn');
  const formFeedback = document.getElementById('form-feedback');

  const updateProduct = () => {
    const a = Number(calcA?.value || 0);
    const b = Number(calcB?.value || 0);
    if (calcResult) calcResult.value = String(a * b);
  };

  calcA?.addEventListener('input', updateProduct);
  calcB?.addEventListener('input', updateProduct);

  colorInput?.addEventListener('input', (e) => {
    document.documentElement.style.setProperty('--accent', e.target.value);
  });

  pingBtn?.addEventListener('click', () => {
    if (formFeedback) {
      formFeedback.textContent = 'Clicked <input type="button"> cleanly without resetting or submitting the form.';
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('fullname') || 'Anonymous';
    const progressEl = document.getElementById('lab-progress');
    const progressLabel = document.getElementById('progress-label');
    if (progressEl) progressEl.value = 100;
    if (progressLabel) progressLabel.textContent = '100%';
    if (formFeedback) {
      formFeedback.textContent = `Form validated & captured for "${name}" (product = ${calcResult?.value}, mode = ${data.get('mode')}).`;
    }
  });

  /* 10. Native <dialog> modal */
  const dialog = document.getElementById('info-dialog');
  const openDialogBtn = document.getElementById('open-dialog');
  openDialogBtn?.addEventListener('click', () => {
    if (dialog instanceof HTMLDialogElement) {
      dialog.showModal();
    }
  });
  dialog?.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.close();
    }
  });
});
