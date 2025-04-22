let students = [], teams = [], questions = [];
let currentQuestionIndex = 0, isGameRunning = false, isPaused = false, isFrozen = false;
let timerInterval, teamQueue = [], studentQueues = {}, playCount = 0;
let currentTeam, currentStudent;
const TOTAL_PLAYS_PER_CYCLE = () => students.length * teams.length;

async function fetchData() {
  try {
    const [studentRes, teamRes, questionRes] = await Promise.all([
      fetch('/students'),
      fetch('/teams'),
      fetch('/questions')
    ]);
    if (!studentRes.ok || !teamRes.ok || !questionRes.ok) {
      throw new Error('Failed to fetch data');
    }
    students = await studentRes.json();
    teams = await teamRes.json();
    questions = await questionRes.json();
    updateUI();
  } catch (err) {
    console.error('Fetch error:', err);
    alert('خطأ في جلب البيانات. تحقق من اتصال الخادم.');
  }
}

async function addStudent() {
  const name = document.getElementById('student-name').value.trim();
  const uni_id = document.getElementById('student-uni-id').value.trim();
  if (name && uni_id) {
    try {
      const res = await fetch('/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, uni_id })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add student');
      }
      console.log('Add student response:', data);
      document.getElementById('student-name').value = '';
      document.getElementById('student-uni-id').value = '';
      fetchData();
    } catch (err) {
      console.error('Add student error:', err.message);
      alert(`خطأ في إضافة الطالب: ${err.message}`);
    }
  } else {
    alert('يرجى إدخال اسم الطالب ورقم الجامعة.');
  }
}

async function editStudent(id, currentName, currentUniId) {
  const name = prompt('تعديل اسم الطالب:', currentName);
  const uni_id = prompt('تعديل رقم الجامعة:', currentUniId);
  if (name && uni_id) {
    try {
      const res = await fetch(`/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, uni_id })
      });
      if (!res.ok) {
        throw new Error('Failed to edit student');
      }
      console.log('Edit student response:', await res.json());
      fetchData();
    } catch (err) {
      console.error('Edit student error:', err);
      alert('خطأ في تعديل الطالب.');
    }
  }
}

async function deleteStudent(id) {
  if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
    try {
      const res = await fetch(`/students/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete student');
      }
      fetchData();
    } catch (err) {
      console.error('Delete student error:', err);
      alert('خطأ في حذف الطالب.');
    }
  }
}

async function addStudentPoints() {
  const points = parseFloat(document.getElementById('student-points').value);
  if (!isNaN(points)) {
    const selectedStudent = prompt('أدخل رقم الجامعة للطالب:');
    const student = students.find(s => s.uni_id === selectedStudent);
    if (student) {
      try {
        const res = await fetch(`/students/${student.id}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points })
        });
        if (!res.ok) {
          throw new Error('Failed to add student points');
        }
        document.getElementById('student-points').value = '';
        fetchData();
      } catch (err) {
        console.error('Add student points error:', err);
        alert('خطأ في إضافة النقاط.');
      }
    } else {
      alert('لم يتم العثور على طالب بهذا الرقم.');
    }
  }
}

async function createTeam() {
  const name = document.getElementById('team-name').value.trim();
  const members = Array.from(document.querySelectorAll('#team-members-checkboxes input:checked')).map(input => input.value);
  if (name && members.length) {
    try {
      const res = await fetch('/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, members })
      });
      if (!res.ok) {
        throw new Error('Failed to create team');
      }
      console.log('Create team response:', await res.json());
      document.getElementById('team-name').value = '';
      fetchData();
    } catch (err) {
      console.error('Create team error:', err);
      alert('خطأ في إنشاء الفريق.');
    }
  } else {
    alert('يرجى إدخال اسم الفريق واختيار أعضاء.');
  }
}

async function editTeam(id, currentName, currentMembers) {
  const newName = prompt('تعديل اسم الفريق:', currentName);
  if (newName) {
    await fetchData();
    document.getElementById('team-name').value = newName;
    const checkboxes = document.querySelectorAll('#team-members-checkboxes input');
    checkboxes.forEach(cb => {
      cb.checked = JSON.parse(currentMembers || '[]').includes(cb.value);
    });
    if (confirm('تأكيد تعديل أعضاء الفريق؟')) {
      const newMembers = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      try {
        const res = await fetch(`/teams/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName, members: newMembers })
        });
        if (!res.ok) {
          throw new Error('Failed to edit team');
        }
        document.getElementById('team-name').value = '';
        fetchData();
      } catch (err) {
        console.error('Edit team error:', err);
        alert('خطأ في تعديل الفريق.');
      }
    }
  }
}

async function deleteTeam(id) {
  if (confirm('هل أنت متأكد من حذف هذا الفريق؟')) {
    try {
      const res = await fetch(`/teams/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete team');
      }
      fetchData();
    } catch (err) {
      console.error('Delete team error:', err);
      alert('خطأ في حذف الفريق.');
    }
  }
}

async function addTeamPoints() {
  const points = parseFloat(document.getElementById('team-points').value);
  if (!isNaN(points)) {
    const selectedTeam = prompt('أدخل اسم الفريق:');
    const team = teams.find(t => t.name === selectedTeam);
    if (team) {
      try {
        const res = await fetch(`/teams/${team.id}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points })
        });
        if (!res.ok) {
          throw new Error('Failed to add team points');
        }
        document.getElementById('team-points').value = '';
        fetchData();
      } catch (err) {
        console.error('Add team points error:', err);
        alert('خطأ في إضافة النقاط.');
      }
    } else {
      alert('لم يتم العثور على فريق بهذا الاسم.');
    }
  }
}

async function addQuestion() {
  const question = document.getElementById('question-text').value.trim();
  const type = document.getElementById('question-type').value;
  const options = document.getElementById('mcq-options').value.split(',').map(opt => opt.trim()).filter(opt => opt);
  const answer = document.getElementById('question-answer').value.trim();
  if (question && answer) {
    try {
      const res = await fetch('/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, type, options, answer })
      });
      if (!res.ok) {
        throw new Error('Failed to add question');
      }
      console.log('Add question response:', await res.json());
      document.getElementById('question-text').value = '';
      document.getElementById('mcq-options').value = '';
      document.getElementById('question-answer').value = '';
      fetchData();
    } catch (err) {
      console.error('Add question error:', err);
      alert('خطأ في إضافة السؤال.');
    }
  } else {
    alert('يرجى إدخال السؤال والإجابة.');
  }
}

async function editQuestion(id, current) {
  const question = prompt('تعديل السؤال:', current.question);
  const answer = prompt('تعديل الإجابة:', current.answer);
  const type = current.type;
  let options = current.options ? JSON.parse(current.options) : [];
  if (type === 'mcq') {
    const optionsStr = prompt('تعديل الخيارات (مفصولة بفواصل):', options.join(','));
    options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt);
  }
  if (question && answer) {
    try {
      const res = await fetch(`/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, type, options, answer })
      });
      if (!res.ok) {
        throw new Error('Failed to edit question');
      }
      fetchData();
    } catch (err) {
      console.error('Edit question error:', err);
      alert('خطأ في تعديل السؤال.');
    }
  }
}

async function deleteQuestion(id) {
  if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
    try {
      const res = await fetch(`/questions/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete question');
      }
      fetchData();
    } catch (err) {
      console.error('Delete question error:', err);
      alert('خطأ في حذف السؤال.');
    }
  }
}

function updateUI() {
  // Students
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = students.map(s => `
    <li>
      ${s.name} (${s.uni_id || 'غير محدد'}): ${s.points || 0} نقاط
      <button class="edit-btn" onclick="editStudent(${s.id}, '${s.name}', '${s.uni_id || ''}')">تعديل</button>
      <button class="delete-btn" onclick="deleteStudent(${s.id})">حذف</button>
    </li>
  `).join('');
  gsap.from('#student-list li', { opacity: 0, x: -20, stagger: 0.1 });

  // Team members checkboxes (only unassigned students)
  const assignedStudentIds = teams.flatMap(t => JSON.parse(t.members || '[]'));
  const teamMembersCheckboxes = document.getElementById('team-members-checkboxes');
  teamMembersCheckboxes.innerHTML = students
    .filter(s => !assignedStudentIds.includes(s.id.toString()))
    .map(s => `
      <label>
        <input type="checkbox" value="${s.id}"> ${s.name} (${s.uni_id || 'غير محدد'})
      </label>
    `).join('');

  // Teams
  const teamList = document.getElementById('team-list');
  teamList.innerHTML = teams.map(t => `
    <li>
      ${t.name} (${JSON.parse(t.members || '[]').length} أعضاء): ${t.score || 0} نقاط
      <button class="edit-btn" onclick="editTeam(${t.id}, '${t.name}', '${t.members || '[]'}')">تعديل</button>
      <button class="delete-btn" onclick="deleteTeam(${t.id})">حذف</button>
    </li>
  `).join('');
  gsap.from('#team-list li', { opacity: 0, x: -20, stagger: 0.1 });

  // Questions
  const questionList = document.getElementById('question-list');
  questionList.innerHTML = questions.map(q => `
    <li>
      ${q.question}
      <button class="edit-btn" onclick='editQuestion(${q.id}, ${JSON.stringify(q)})'>تعديل</button>
      <button class="delete-btn" onclick="deleteQuestion(${q.id})">حذف</button>
    </li>
  `).join('');
  gsap.from('#question-list li', { opacity: 0, x: -20, stagger: 0.1 });

  // Game screen
  const teamPicker = document.getElementById('team-picker');
  teamPicker.innerHTML = currentTeam ? `الفريق: ${currentTeam.name}` : 'اختر فريق';
  const studentPicker = document.getElementById('student-picker');
  studentPicker.innerHTML = currentStudent ? `الطالب: ${currentStudent.name} (${currentStudent.uni_id || 'غير محدد'})` : 'اختر طالب';

  updateLeaderboards();
}

function updateLeaderboards() {
  const leaderboardTeams = document.getElementById('leaderboard-teams');
  leaderboardTeams.innerHTML = `<h3>ترتيب الفرق</h3>` + teams
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(t => `<div id="team-score-${t.id}">${t.name}: <span>${t.score || 0}</span></div>`)
    .join('');
  gsap.from('#leaderboard-teams div', { opacity: 0, y: 20, stagger: 0.1 });

  const leaderboardStudents = document.getElementById('leaderboard-students');
  leaderboardStudents.innerHTML = `<h3>ترتيب الطلاب</h3>` + students
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .map(s => `<div id="student-score-${s.id}">${s.name}: <span>${s.points || 0}</span></div>`)
    .join('');
  gsap.from('#leaderboard-students div', { opacity: 0, y: 20, stagger: 0.1 });
}

// Fisher-Yates Shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function initializeQueues() {
  teamQueue = shuffle([...teams]);
  studentQueues = {};
  teams.forEach(team => {
    const members = JSON.parse(team.members || '[]');
    const teamStudents = students.filter(s => members.includes(s.id.toString()));
    studentQueues[team.id] = shuffle([...teamStudents]);
  });
  playCount = 0;
}

async function startGame() {
  if (!teams.length || !questions.length) {
    alert('يرجى إضافة فرق وأسئلة قبل بدء اللعبة.');
    return;
  }
  try {
    isGameRunning = false;
    currentQuestionIndex = 0;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    gsap.fromTo('#game-screen', 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.7)' }
    );
    initializeQueues();
    updateUI();
  } catch (err) {
    console.error('Start game error:', err);
    alert('خطأ في بدء اللعبة.');
    backToMenu();
  }
}

async function beginGame() {
  if (isGameRunning) return;
  isGameRunning = true;
  isPaused = false;
  isFrozen = false;
  selectNextTeamAndStudent();
}

async function selectNextTeamAndStudent() {
  if (playCount >= TOTAL_PLAYS_PER_CYCLE()) {
    initializeQueues();
  }
  if (!teamQueue.length) {
    teamQueue = shuffle([...teams]);
  }
  currentTeam = teamQueue.shift();
  if (!studentQueues[currentTeam.id].length) {
    const members = JSON.parse(currentTeam.members || '[]');
    const teamStudents = students.filter(s => members.includes(s.id.toString()));
    studentQueues[currentTeam.id] = shuffle([...teamStudents]);
  }
  currentStudent = studentQueues[currentTeam.id].shift();
  playCount++;

  const teamPicker = document.getElementById('team-picker');
  const studentPicker = document.getElementById('student-picker');
  teamPicker.innerHTML = 'اختيار الفريق...';
  studentPicker.innerHTML = 'اختيار الطالب...';
  teamPicker.classList.remove('glow');
  studentPicker.classList.remove('glow');

  const allTeamNames = teams.map(t => t.name);
  const members = JSON.parse(currentTeam.members || '[]');
  const allStudentNames = students.filter(s => members.includes(s.id.toString())).map(s => `${s.name} (${s.uni_id || 'غير محدد'})`);
  let rollCount = 15;
  const rollInterval = setInterval(() => {
    teamPicker.innerHTML = `الفريق: ${allTeamNames[Math.floor(Math.random() * allTeamNames.length)]}`;
    studentPicker.innerHTML = `الطالب: ${allStudentNames[Math.floor(Math.random() * allStudentNames.length)]}`;
    gsap.to([teamPicker, studentPicker], { y: -10, duration: 0.1, yoyo: true, repeat: 1 });
    rollCount--;
    if (rollCount <= 0) {
      clearInterval(rollInterval);
      teamPicker.innerHTML = `الفريق: ${currentTeam.name}`;
      studentPicker.innerHTML = `الطالب: ${currentStudent.name} (${currentStudent.uni_id || 'غير محدد'})`;
      teamPicker.classList.add('glow');
      studentPicker.classList.add('glow');
      gsap.fromTo([teamPicker, studentPicker], 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.5, ease: 'bounce.out', stagger: 0.2 }
      );
      nextQuestion();
    }
  }, 100);

  updateUI();
}

function pauseGame() {
  if (isGameRunning && !isFrozen) {
    isPaused = !isPaused;
    const pauseButton = document.querySelector('button[onclick="pauseGame()"]');
    pauseButton.textContent = isPaused ? 'استئناف' : 'إيقاف مؤقت';
    if (isPaused) {
      clearInterval(timerInterval);
    } else {
      startTimer();
    }
  }
}

function nextQuestion() {
  if (currentQuestionIndex >= questions.length) {
    endGame();
    return;
  }
  isFrozen = false;
  const q = questions[currentQuestionIndex];
  const questionContainer = document.getElementById('current-question');
  questionContainer.innerHTML = `
    <p>${q.question}</p>
    ${q.type === 'mcq' ? `<div class="mcq-options">${JSON.parse(q.options || '[]').map(opt => `<p>${opt}</p>`).join('')}</div>` : ''}
  `;
  gsap.from('#current-question > p:first-child', { 
    opacity: 0, scale: 0.8, duration: 0.5, ease: 'power2.out' 
  });
  if (q.type === 'mcq') {
    gsap.from('.mcq-options p', { 
      opacity: 0, x: 50, duration: 0.4, stagger: 0.1, ease: 'back.out(1.7)' 
    });
  }

  document.getElementById('score-buttons').innerHTML = `
    <button onclick="awardScore(1)">صحيح كامل</button>
    <button onclick="awardScore(0.5)">صحيح جزئي</button>
    <button onclick="awardScore(0)">خاطئ</button>
  `;
  gsap.from('#score-buttons button', { scale: 0.8, opacity: 0, duration: 0.3, stagger: 0.1 });

  if (!isPaused) startTimer();
  currentQuestionIndex++;
}

async function nextRound() {
  if (isFrozen) {
    isFrozen = false;
    clearInterval(timerInterval);
    document.getElementById('score-buttons').innerHTML = '';
    document.getElementById('timer').textContent = '';
    selectNextTeamAndStudent();
  }
}

async function awardScore(points) {
  if (isFrozen) return;
  isFrozen = true;
  clearInterval(timerInterval);
  const questionContainer = document.getElementById('current-question');
  try {
    await fetch(`/teams/${currentTeam.id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: points })
    });
    await fetch(`/students/${currentStudent.id}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points })
    });
    if (points === 1) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00ff88', '#ffffff']
      });
    } else if (points === 0.5) {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#d400ff', '#ffffff']
      });
    } else {
      questionContainer.classList.add('wrong-flash');
      setTimeout(() => questionContainer.classList.remove('wrong-flash'), 1000);
    }
    // Animate score update
    const teamScoreEl = document.querySelector(`#team-score-${currentTeam.id} span`);
    const studentScoreEl = document.querySelector(`#student-score-${currentStudent.id} span`);
    gsap.to(teamScoreEl, {
      textContent: (currentTeam.score || 0) + points,
      duration: 0.5,
      ease: 'power1.inOut',
      snap: { textContent: 0.1 }
    });
    gsap.to(studentScoreEl, {
      textContent: (currentStudent.points || 0) + points,
      duration: 0.5,
      ease: 'power1.inOut',
      snap: { textContent: 0.1 }
    });
    fetchData();
  } catch (err) {
    console.error('Award score error:', err);
    alert('خطأ في تسجيل النقاط.');
  }
}

async function awardBonus() {
  // if (isFrozen) return;
  try {
    await fetch(`/teams/${currentTeam.id}/bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    fetchData();
  } catch (err) {
    console.error('Award bonus error:', err);
    alert('خطأ في إضافة النقطة الإضافية.');
  }
}

function startTimer() {
  if (isFrozen) return;
  clearInterval(timerInterval);
  let timeLeft =90;
  const timer = document.getElementById('timer');
  timer.textContent = timeLeft;
  timer.classList.remove('low-time');
  timerInterval = setInterval(() => {
    if (!isPaused && !isFrozen) {
      timeLeft--;
      timer.textContent = timeLeft;
      if (timeLeft <= 5 && !timer.classList.contains('low-time')) {
        timer.classList.add('low-time');
      }
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isFrozen = true;
        timer.classList.remove('low-time');
        gsap.to(timer, { 
          scale: 1.2, 
          background: 'rgba(255, 0, 0, 0.5)', 
          duration: 0.3, 
          yoyo: true, 
          repeat: 3 
        });
        document.getElementById('score-buttons').innerHTML = '';
        alert('انتهى الوقت! اضغط على الجولة التالية.');
      }
    }
  }, 1000);
}

async function resetScores() {
  try {
    for (const team of teams) {
      await fetch(`/teams/${team.id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: -(team.score || 0) })
      });
    }
    for (const student of students) {
      await fetch(`/students/${student.id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: -(student.points || 0) })
      });
    }
    fetchData();
  } catch (err) {
    console.error('Reset scores error:', err);
    alert('خطأ في إعادة تعيين النقاط.');
  }
}

function endGame() {
  isGameRunning = false;
  isPaused = false;
  isFrozen = false;
  clearInterval(timerInterval);
  document.getElementById('current-question').innerHTML = 'انتهت اللعبة!';
  document.getElementById('score-buttons').innerHTML = '';
  document.getElementById('timer').textContent = '';
  document.getElementById('team-picker').innerHTML = '';
  document.getElementById('student-picker').innerHTML = '';
  gsap.to('#game-screen', {
    opacity: 0,
    scale: 0.8,
    duration: 0.7,
    ease: 'power2.in',
    onComplete: () => {
      document.getElementById('game-screen').style.display = 'none';
      document.getElementById('main-menu').style.display = 'block';
      gsap.from('#main-menu', { opacity: 0, scale: 0.9, duration: 0.5 });
    }
  });
}

function backToMenu() {
  isGameRunning = false;
  isPaused = false;
  isFrozen = false;
  clearInterval(timerInterval);
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('main-menu').style.display = 'block';
  gsap.from('#main-menu', { opacity: 0, scale: 0.9, duration: 0.5 });
  document.getElementById('current-question').innerHTML = '';
  document.getElementById('score-buttons').innerHTML = '';
  document.getElementById('timer').textContent = '';
  currentTeam = null;
  currentStudent = null;
  teamQueue = [];
  studentQueues = {};
  playCount = 0;
  fetchData();
}

document.getElementById('go-to-game').onclick = () => {
  startGame();
};

document.getElementById('start-game-btn').onclick = () => {
  beginGame();
};

fetchData();