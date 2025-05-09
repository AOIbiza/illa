import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, collection, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBc8sn7AbQRKF13KLLJWiU016k0N0UGkdc",
  authDomain: "gymkana-jujutsu.firebaseapp.com",
  projectId: "gymkana-jujutsu",
  storageBucket: "gymkana-jujutsu.firebasestorage.app",
  messagingSenderId: "915272779267",
  appId: "1:915272779267:web:2f79de354c2b5509a0b036",
  measurementId: "G-HVZEX5PFED"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = "samuelmolla4@gmail.com";
let currentUser = null;
let currentName = null;
let gymkanaActive = false;

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const displayName = document.getElementById("displayName").value.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        if (!displayName) {
          document.getElementById("displayName").style.display = "block";
          document.getElementById("message").innerText = "Introduce un nombre visible único.";
          return;
        }
        // Verifica que el nombre visible sea único
        const allUsers = await getDocs(collection(db, "users"));
        if (Array.from(allUsers.docs).some(doc => doc.data().name === displayName)) {
          alert("Ese nombre ya está en uso.");
          return;
        }
        await setDoc(doc(db, "users", user.uid), { name: displayName, scans: [] });
      }
      window.location.href = "scan.html";
    } catch (err) {
      // Si no existe, registramos
      try {
        const newUser = await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById("displayName").style.display = "block";
        document.getElementById("message").innerText = "Introduce un nombre visible único y vuelve a iniciar sesión.";
      } catch (e) {
        alert("Error al iniciar sesión o registrar: " + e.message);
      }
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      currentName = userDoc.data().name;
      const welcome = document.getElementById("welcome");
      if (welcome) welcome.textContent = "Bienvenido, " + currentName;
      if (user.email === adminEmail) {
        const adminControls = document.getElementById("adminControls");
        if (adminControls) adminControls.style.display = "block";
      }
    }
  }
});

// QR Logic
const SECRET = "jujutsu2025";

function validateHash(hash) {
  for (let i = 1; i <= 20; i++) {
    const raw = i + SECRET;
    const hashVal = sha256Sync(raw).substring(0, 6);
    if (hashVal === hash) return i;
  }
  return null;
}

function sha256Sync(str) {
  const buffer = new TextEncoder().encode(str);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

window.handleQRScan = async function () {
  const params = new URLSearchParams(window.location.search);
  const hash = params.get("qr");
  const qrId = validateHash(hash);
  const scanStatus = document.getElementById("scanStatus");

  if (!qrId) {
    scanStatus.textContent = "QR no válido";
    return;
  }

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();
  const now = new Date();

  if (!gymkanaActive) {
    scanStatus.textContent = "La gymkana no está activa.";
    return;
  }

  const alreadyScanned = userData.scans.find(s => s.qr === qrId);
  if (alreadyScanned) {
    scanStatus.textContent = "Ya escaneaste este código.";
    return;
  }

  const lastScan = userData.scans[userData.scans.length - 1];
  if (lastScan) {
    const lastTime = new Date(lastScan.time.toDate());
    const diff = (now - lastTime) / 1000;
    if (diff < 45) {
      scanStatus.textContent = "Espera " + Math.ceil(45 - diff) + " segundos.";
      return;
    }
  }

  await updateDoc(userRef, {
    scans: arrayUnion({ qr: qrId, time: serverTimestamp() })
  });

  scanStatus.textContent = "Código " + qrId + " registrado.";
};

window.renderRanking = async function () {
  const snapshot = await getDocs(collection(db, "users"));
  const rankingDiv = document.getElementById("ranking");
  const users = snapshot.docs.map(doc => ({ name: doc.data().name, scans: doc.data().scans }));
  users.sort((a, b) => {
    if (b.scans.length !== a.scans.length) return b.scans.length - a.scans.length;
    const aLast = a.scans[a.scans.length - 1]?.time?.toDate?.() || 0;
    const bLast = b.scans[b.scans.length - 1]?.time?.toDate?.() || 0;
    return new Date(aLast) - new Date(bLast);
  });
  rankingDiv.innerHTML = "<ol>" + users.map(u => `<li><a href="#" onclick="showUserDetails('${u.name}')">${u.name}</a> - ${u.scans.length} códigos</li>`).join("") + "</ol>";
};

window.showUserDetails = async function (name) {
  const snapshot = await getDocs(collection(db, "users"));
  const userDoc = snapshot.docs.find(doc => doc.data().name === name);
  const scans = userDoc.data().scans;
  const detail = document.getElementById("userDetails");
  detail.innerHTML = "<h2>" + name + "</h2><ul>" + scans.map(s => `<li>Código ${s.qr} - ${s.time?.toDate?.().toLocaleTimeString() || '...'} </li>`).join("") + "</ul>";
};

window.startGymkana = () => { gymkanaActive = true; alert("Gymkana iniciada"); };
window.endGymkana = () => { gymkanaActive = false; alert("Gymkana finalizada"); };
window.resetRanking = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  for (let docSnap of snapshot.docs) {
    await updateDoc(doc(db, "users", docSnap.id), { scans: [] });
  }
  renderRanking();
  alert("Ranking reiniciado.");
};


// Autoejecutar escaneo si estamos en scan.html con ?qr=...
if (window.location.pathname.includes("scan.html") && new URLSearchParams(window.location.search).has("qr")) {
  handleQRScan();
}
