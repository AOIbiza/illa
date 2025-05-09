const SECRET = "jujutsu2025";
const ADMIN_USER_HASH = btoa("admin2025");
const ADMIN_PASS_HASH = btoa("otakuleao2021");

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

    if (btoa(name) === ADMIN_USER_HASH) {
      if (btoa(password) !== ADMIN_PASS_HASH) {
        alert('Contraseña incorrecta');
        return;
      }
    } else if (users[name] && users[name].password !== password) {
      alert('Contraseña incorrecta');
      return;
    }

    if (!users[name] && btoa(name) !== ADMIN_USER_HASH) {
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
  if (!user || btoa(user) === ADMIN_USER_HASH) {
    scanStatus.textContent = 'No estás identificado como jugador.';
    return;
  }
  const users = getUsers();
  const userData = users[user];
  const lastScan = userData.scans[userData.scans.length - 1];
  if (lastScan) {
    const lastTime = new Date(lastScan.time);
    const diff = (now - lastTime) / 1000;
    if (diff < 45) {
      scanStatus.textContent = `Espera ${Math.ceil(45 - diff)} segundos antes de escanear otro QR.`;
      return;
    }
  }
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
    .filter(([name]) => btoa(name) !== ADMIN_USER_HASH)
    .map(([name, data]) => {
      return {
        name,
        count: data.scans.length,
        scans: data.scans,
        lastScan: data.scans.reduce((latest, s) =>
          !latest || new Date(s.time) > new Date(latest.time) ? s : latest, null)
      };
    }).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(a.lastScan?.time || 0) - new Date(b.lastScan?.time || 0);
    });

  const rankingDiv = document.getElementById('ranking');
  rankingDiv.innerHTML = '<ol>' +
    sorted.map(user => `<li><a href="#" onclick="showUserDetails('${user.name}')">${user.name}</a> - ${user.count} códigos</li>`).join('') +
    '</ol>';
}

function showUserDetails(username) {
  const users = getUsers();
  const user = users[username];
  if (!user) return;
  const detailsDiv = document.getElementById('userDetails');
  const list = user.scans.map(s => `<li>Código ${s.qr} - ${new Date(s.time).toLocaleTimeString()}</li>`).join('');
  detailsDiv.innerHTML = `<h2>${username}</h2><ul>${list}</ul>`;
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

function resetRanking() {
  if (confirm('¿Estás seguro de que quieres reiniciar el ranking?')) {
    localStorage.removeItem('users');
    renderRanking();
    alert('Ranking reiniciado.');
  }
}

handleLogin();
