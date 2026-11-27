// Section 6: Interactive To-Do List combining ES6, DOM Manipulation, and Event Handling

let nextTaskId = 1;
let tasks = [];

const input = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('taskList');
const stats = document.getElementById('taskStats');
const emptyState = document.getElementById('emptyState');

class Task {
  constructor(title) {
    this.id = nextTaskId++;
    this.title = title;
    this.completed = false;
  }
}

const renderTasks = () => {
  list.innerHTML = '';

  const completedCount = tasks.filter((t) => t.completed).length;
  stats.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'} (${completedCount} done)`;
  emptyState.hidden = tasks.length > 0;

  tasks.forEach(({ id, title, completed }) => {
    const li = document.createElement('li');
    li.dataset.id = String(id);

    const span = document.createElement('span');
    span.textContent = title;
    if (completed) {
      span.classList.add('done');
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.classList.add('delete-btn');

    li.append(span, delBtn);
    list.appendChild(li);
  });
};

const addTask = () => {
  const title = input.value.trim();
  if (!title) return;
  tasks = [...tasks, new Task(title)];
  input.value = '';
  input.focus();
  renderTasks();
};

addBtn.addEventListener('click', addTask);

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    addTask();
  }
});

// Event delegation for toggling completion and deleting tasks
list.addEventListener('click', (event) => {
  const li = event.target.closest('li');
  if (!li) return;
  const id = Number(li.dataset.id);

  if (event.target.classList.contains('delete-btn')) {
    tasks = tasks.filter((t) => t.id !== id);
  } else {
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  }
  renderTasks();
});

renderTasks();
