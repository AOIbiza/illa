const SECRET = "jujutsu2025";

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
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const password = document.getElementById('password').value;
    if (!name || !password) return alert('Introduce nombre y contraseña');
    const users = getUsers();

    if (name === 'admin') {
      const adminEnabled = await checkAdminStatus();
      if (!adminEnabled) {
        alert('El usuario admin está temporalmente desactivado.');
        return;
      }
      if (password !== '2142') {
        alert('Contraseña incorrecta');
        return;
      }
    } else if (users[name] && users[name].password !== password) {
      alert('Contraseña incorrecta');
      return;
    }

    if (!users[name] && name !== 'admin') {
      users[name] = { password, scans: [] };
      saveUsers(users);
    }

    setCurrentUser(name);
    window.location.href = 'scan.html';
  });
}

function validateHash(hash) {
  for (let i = 1; i <= 20; i++) {
    const raw = i + SECRET;
    const expected = sha256Sync(raw).substring(0, 6);
    if (expected === hash) return i;
  }
  return null;
}

function handleQRScan() {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get('qr');
  const qrId = validateHash(hash);
  const now = new Date();
  const scanStatus = document.getElementById('scanStatus');

  if (!qrId) {
    scanStatus.textContent = 'QR no válido';
    return;
  }
  if (!isGymkanaActive()) {
    scanStatus.textContent = 'La gymkana no está activa.';
    return;
  }
  const user = getCurrentUser();
  if (!user || user === 'admin') {
    scanStatus.textContent = 'No estás identificado como jugador.';
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
  const sorted = Object.entries(users)
    .filter(([name]) => name !== 'admin')
    .map(([name, data]) => {
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

function sha256Sync(str) {
  const buffer = new TextEncoder().encode(str);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isGymkanaActive() {
  return localStorage.getItem('gymkanaActive') === 'true';
}

function startGymkana() {
  localStorage.setItem('gymkanaActive', 'true');
  alert('¡Gymkana iniciada!');
}

function endGymkana() {
  localStorage.setItem('gymkanaActive', 'false');
  alert('Gymkana terminada.');
}

async function checkAdminStatus() {
  try {
    const response = await fetch('1.txt', { method: 'HEAD' });
    const lastModified = response.headers.get('Last-Modified');
    const resetTime = localStorage.getItem('adminResetTime');
    return !resetTime || new Date(lastModified) > new Date(resetTime);
  } catch {
    return false;
  }
}

function resetRanking() {
  if (confirm('¿Estás seguro de que quieres reiniciar el ranking?')) {
    localStorage.removeItem('users');
    localStorage.setItem('adminResetTime', new Date().toISOString());
    renderRanking();
    alert('Ranking reiniciado. El usuario admin quedará deshabilitado hasta que subas de nuevo 1.txt.');
  }
}

handleLogin();
