const EVENT_START = new Date('2025-05-25T16:00:00');
const EVENT_END = new Date('2025-05-25T17:30:00');

function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

function getCurrentUser() {
  return localStorage.getItem('currentUser');
}

function setCurrentUser(name) {
  localStorage.setItem('currentUser', name);
}

function handleLogin() {
  const form = document.getElementById('loginForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;
    if (!name || !password) return alert('Introduce nombre y contraseña');
    const users = getUsers();
    if (users[name] && users[name].password !== password) {
      alert('Contraseña incorrecta');
      return;
    }
    if (!users[name]) {
      users[name] = { password, scans: [] };
      saveUsers(users);
    }
    setCurrentUser(name);
    window.location.href = 'scan.html';
  });
}

function handleQRScan() {
  const params = new URLSearchParams(window.location.search);
  const qrId = params.get('qr');
  const now = new Date();
  const scanStatus = document.getElementById('scanStatus');

  if (!qrId || isNaN(qrId) || qrId < 1 || qrId > 20) {
    scanStatus.textContent = 'QR no válido';
    return;
  }
  if (now < EVENT_START) {
    scanStatus.textContent = 'La gymkana aún no ha comenzado.';
    return;
  }
  if (now > EVENT_END) {
    scanStatus.textContent = 'La gymkana ha terminado.';
    return;
  }
  const user = getCurrentUser();
  if (!user) {
    scanStatus.textContent = 'No estás identificado.';
    return;
  }
  const users = getUsers();
  const userData = users[user];
  if (userData.scans.find((s) => s.qr == qrId)) {
    scanStatus.textContent = `Ya habías escaneado el código ${qrId}`;
    return;
  }
  userData.scans.push({ qr: qrId, time: now.toISOString() });
  saveUsers(users);
  scanStatus.textContent = `Escaneo registrado del código ${qrId}`;
}

function renderRanking() {
  const users = getUsers();
  const sorted = Object.entries(users).map(([name, data]) => {
    return {
      name,
      count: data.scans.length,
      lastScan: data.scans.reduce((latest, s) =>
        !latest || new Date(s.time) > new Date(latest.time) ? s : latest, null)
    };
  }).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(a.lastScan?.time || 0) - new Date(b.lastScan?.time || 0);
  });

  const rankingDiv = document.getElementById('ranking');
  rankingDiv.innerHTML = '<ol>' +
    sorted.map(user => `<li>${user.name} - ${user.count} códigos</li>`).join('') +
    '</ol>';
}

handleLogin();