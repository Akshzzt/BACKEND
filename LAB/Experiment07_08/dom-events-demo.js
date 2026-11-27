// Part B & C: DOM Manipulation and Event Handling Interactive Demo

document.addEventListener('DOMContentLoaded', () => {
  const demoBox = document.getElementById('demoBox');
  const nodeList = document.getElementById('nodeList');
  const eventLog = document.getElementById('eventLog');
  const liveInput = document.getElementById('liveInput');
  const livePreview = document.getElementById('livePreview');
  let itemCounter = 3;

  const log = (message) => {
    eventLog.textContent += `[${new Date().toLocaleTimeString()}] ${message}\n`;
    eventLog.scrollTop = eventLog.scrollHeight;
  };

  // Part B: Content, classList, createElement/append, remove
  document.getElementById('changeTextBtn').addEventListener('click', () => {
    demoBox.textContent = `Updated via textContent at ${new Date().toLocaleTimeString()}`;
    log('DOM: Modified textContent on #demoBox');
  });

  document.getElementById('toggleClassBtn').addEventListener('click', () => {
    demoBox.classList.toggle('highlight');
    log(`DOM: Toggled .highlight (active=${demoBox.classList.contains('highlight')})`);
  });

  document.getElementById('addNodeBtn').addEventListener('click', () => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = `Item ${itemCounter++} (click via delegation)`;
    nodeList.append(pill);
    log(`DOM: Created and appended "${pill.textContent}"`);
  });

  document.getElementById('removeNodeBtn').addEventListener('click', () => {
    const last = nodeList.lastElementChild;
    if (!last) {
      log('DOM: No elements left to remove');
      return;
    }
    const text = last.textContent;
    last.remove();
    log(`DOM: Removed "${text}"`);
  });

  // Part C: Event delegation on dynamically added elements
  nodeList.addEventListener('click', (event) => {
    if (event.target.classList.contains('pill')) {
      event.target.classList.toggle('done');
      log(`Delegation: Toggled "${event.target.textContent}"`);
    }
  });

  // Part C: Form submit & input events
  liveInput.addEventListener('input', (event) => {
    livePreview.textContent = `Live value: ${event.target.value || '(empty)'}`;
  });

  liveInput.addEventListener('keydown', (event) => {
    log(`Keydown: key="${event.key}", code="${event.code}"`);
  });

  document.getElementById('demoForm').addEventListener('submit', (event) => {
    event.preventDefault();
    log(`Form submit prevented default reload; value="${liveInput.value}"`);
  });

  // Part C: Event bubbling vs stopPropagation
  document.getElementById('outerZone').addEventListener('click', () => {
    log('Bubbling: Outer container handler fired');
  });

  document.getElementById('bubbleBtn').addEventListener('click', (event) => {
    log(`Button clicked at (${event.clientX}, ${event.clientY}) — allowing bubble`);
  });

  document.getElementById('stopBtn').addEventListener('click', (event) => {
    event.stopPropagation();
    log('Button clicked — event.stopPropagation() stopped bubbling to outer container');
  });

  document.getElementById('clearLogBtn').addEventListener('click', () => {
    eventLog.textContent = '';
  });
});
