// Experiment 09, 10 & 11: AJAX (Fetch & jQuery), XML, JSON, and Filtering

const studentTableBody = document.querySelector('#studentTable');
const courseTableBody = document.querySelector('#courseTable');
const statusMessage = document.querySelector('#status');
const searchInput = document.querySelector('#searchInput');
const courseSelect = document.querySelector('#courseSelect');

let loadedStudents = [];

/**
 * Updates the status banner text and error state.
 * @param {string} message - Status text to display.
 * @param {boolean} isError - Whether the message represents an error.
 */
function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle('error', isError);
}

/**
 * Safely renders rows into a target tbody using textContent.
 * @param {HTMLElement} tbody - Target table body element.
 * @param {Array<Array<string|number>>} rows - Row cell values.
 */
function renderRows(tbody, rows) {
  tbody.replaceChildren();
  rows.forEach((cells) => {
    const row = document.createElement('tr');
    cells.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value ?? '';
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
}

/**
 * Renders student records into the student table.
 * @param {Array<Object>} students - List of student objects.
 */
function displayStudents(students) {
  const rows = students.map((s) => [s.id, s.name, s.course, s.email, s.semester]);
  renderRows(studentTableBody, rows);
}

/**
 * Renders course records into the course table.
 * @param {Array<Object>} courses - List of course objects.
 */
function displayCourses(courses) {
  const rows = courses.map((c) => [c.code, c.title, c.credits, c.instructor, c.semester]);
  renderRows(courseTableBody, rows);
}

/**
 * Fetches JSON from a URL with HTTP status validation.
 * @param {string} url - Resource URL.
 * @returns {Promise<any>} Parsed JSON payload.
 */
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} while loading ${url}`);
  }
  return response.json();
}

/**
 * Loads student JSON via Fetch API and updates the table.
 * @param {string} url - JSON endpoint or file URL.
 * @param {string} label - Source description for status messages.
 */
async function loadStudentsFromJson(url, label) {
  setStatus(`Loading ${label}...`);
  try {
    const data = await fetchJson(url);
    loadedStudents = data.students || [];
    displayStudents(loadedStudents);
    setStatus(`${label} loaded successfully (${loadedStudents.length} records).`);
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
}

// Part C: Fetch API (students.json)
document.querySelector('#loadJson').addEventListener('click', () => {
  loadStudentsFromJson('students.json', 'JSON data (Fetch API)');
});

// Practice Task 5: Fetch from Backend API (/api/students)
document.querySelector('#loadApi').addEventListener('click', () => {
  loadStudentsFromJson('/api/students', 'Backend API (/api/students)');
});

// Part D: Fetch XML & Parse with DOMParser
document.querySelector('#loadXml').addEventListener('click', async () => {
  setStatus('Loading XML data...');
  try {
    const response = await fetch('students.xml');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} while loading students.xml`);
    }
    const xmlText = await response.text();
    const xmlDocument = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xmlDocument.querySelector('parsererror')) {
      throw new Error('The XML document is invalid.');
    }

    loadedStudents = Array.from(xmlDocument.querySelectorAll('student')).map((student) => ({
      id: student.getAttribute('id'),
      name: student.querySelector('name')?.textContent ?? '',
      course: student.querySelector('course')?.textContent ?? '',
      email: student.querySelector('email')?.textContent ?? '',
      semester: student.querySelector('semester')?.textContent ?? ''
    }));

    displayStudents(loadedStudents);
    setStatus(`XML data loaded successfully (${loadedStudents.length} records).`);
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
});

// Part E: jQuery $.ajax() for JSON loading
document.querySelector('#loadJquery').addEventListener('click', () => {
  if (typeof window.jQuery === 'undefined') {
    setStatus('Error: jQuery CDN failed to load.', true);
    return;
  }

  $('#status').removeClass('error').text('Loading JSON data via jQuery...');
  $.ajax({
    url: 'students.json',
    method: 'GET',
    dataType: 'json',
    success: (data) => {
      loadedStudents = data.students || [];
      displayStudents(loadedStudents);
      $('#status').text(`JSON data loaded using jQuery (${loadedStudents.length} records).`);
    },
    error: (_xhr, status, error) => {
      $('#status').addClass('error').text(`Request failed: ${error || status}`);
    }
  });
});

// Practice Task 2: Live Name Search without extra HTTP requests
searchInput.addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  const filtered = loadedStudents.filter((s) => s.name.toLowerCase().includes(query));
  displayStudents(filtered);
  setStatus(`Showing ${filtered.length} of ${loadedStudents.length} loaded students.`);
});

// Practice Task 3 (Native JS): Filter by selected course
document.querySelector('#filterJsBtn').addEventListener('click', () => {
  const selectedCourse = courseSelect.value;
  const filtered = selectedCourse
    ? loadedStudents.filter((s) => s.course === selectedCourse)
    : loadedStudents;
  displayStudents(filtered);
  setStatus(
    selectedCourse
      ? `JS filter: ${filtered.length} student(s) in ${selectedCourse}.`
      : `Showing all ${filtered.length} loaded students.`
  );
});

// Practice Task 3 (jQuery): Load & filter by selected course using jQuery
document.querySelector('#filterJqBtn').addEventListener('click', () => {
  if (typeof window.jQuery === 'undefined') {
    setStatus('Error: jQuery CDN failed to load.', true);
    return;
  }
  const selectedCourse = $('#courseSelect').val();
  $.ajax({
    url: 'students.json',
    method: 'GET',
    dataType: 'json',
    success: (data) => {
      loadedStudents = data.students || [];
      const filtered = selectedCourse
        ? $.grep(loadedStudents, (student) => student.course === selectedCourse)
        : loadedStudents;
      displayStudents(filtered);
      $('#status')
        .removeClass('error')
        .text(
          selectedCourse
            ? `jQuery filter: ${filtered.length} student(s) in ${selectedCourse}.`
            : `jQuery loaded all ${filtered.length} students.`
        );
    },
    error: (_xhr, status, error) => {
      $('#status').addClass('error').text(`jQuery filter failed: ${error || status}`);
    }
  });
});

// Practice Task 4: Load Course Directory (courses.json)
document.querySelector('#loadCourses').addEventListener('click', async () => {
  setStatus('Loading course directory...');
  try {
    const data = await fetchJson('courses.json');
    const courses = data.courses || [];
    displayCourses(courses);
    setStatus(`Course directory loaded (${courses.length} courses).`);
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
  }
});
