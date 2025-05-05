const EVENT_START = new Date('2025-05-25T16:00:00');
const EVENT_END = new Date('2025-05-25T17:30:00');

const QR_HASHES = {
  "62af2": 1,
  "a49d3": 2,
  "c7f84": 3,
  "34e0b": 4,
  "5a8d9": 5,
  "9b13c": 6,
  "e23aa": 7,
  "b6d4e": 8,
  "712ac": 9,
  "3ecf2": 10,
  "fde77": 11,
  "4b91a": 12,
  "886dd": 13,
  "7a993": 14,
  "2c1e8": 15,
  "1f3cb": 16,
  "d99f0": 17,
  "ebac3": 18,
  "a6d72": 19,
  "05cde": 20
};

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
  const hash = params.get('qr');
  const qrId = QR_HASHES[hash];
  const now = new Date();
  const scanStatus = document.getElementById('scanStatus');

  if (!qrId) {
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
    scanStatus.textContent = `Ya habías escaneado este código.`;
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