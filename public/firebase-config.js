
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



const firebaseConfig = {
  apiKey: "AIzaSyA3rSfGoU_VrTF3rlK0QrfsaZ80diTmdd0",
  authDomain: "home-92bac.firebaseapp.com",
  projectId: "home-92bac",
  storageBucket: "home-92bac.firebasestorage.app",
  messagingSenderId: "815019233006",
  appId: "1:815019233006:web:9a238beeb53e2f7b11adff",
  measurementId: "G-4JFP67SD6K"
};



const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const adminMenu = document.getElementById('menu-admin');
let currentShoppingData = [];
let pendingProfilePhotoBase64 = null;

// 1. AUTH
const btnLogin = document.getElementById('btn-google-login');
if(btnLogin) {
    btnLogin.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(err => alert(err.message));
    });
}
window.logoutFirebase = () => signOut(auth).then(() => location.reload());

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(loginScreen) loginScreen.style.display = 'none';
        if(appScreen) appScreen.style.display = 'flex';
        
        updateUserUI(user.displayName, user.email, user.photoURL);

        // Preencher perfil
        const pName = document.getElementById('profile-name-input');
        const pEmail = document.getElementById('profile-email-readonly');
        if(pName) pName.value = user.displayName;
        if(pEmail) pEmail.value = user.email;

        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName, email: user.email, photo: user.photoURL, lastLogin: new Date().toISOString()
        }, { merge: true });

        const adminEmail = "emanueldomingues.br@gmail.com";
        if (user.email && user.email.trim().toLowerCase() === adminEmail) {
            if(adminMenu) adminMenu.style.display = "flex";
        }

        initRealtimeData(user.email);
        initSpendingChart();
    } else {
        if(loginScreen) loginScreen.style.display = 'flex';
        if(appScreen) appScreen.style.display = 'none';
    }
});

function updateUserUI(name, email, photo) {
    const elName = document.getElementById('nav-user-name');
    const elEmail = document.getElementById('nav-user-email');
    const elPhoto = document.getElementById('nav-user-photo');
    const elPreview = document.getElementById('profile-preview-large');

    if(elName) elName.innerText = name;
    if(elEmail) elEmail.innerText = email;
    if(elPhoto && photo) elPhoto.src = photo;
    if(elPreview && photo) elPreview.src = photo;
}

// 2. PROFILE IMAGE
window.handleProfileImageSelect = (input) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profile-preview-large');
            if(preview) preview.src = e.target.result;
            pendingProfilePhotoBase64 = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// --- AQUI ESTAVA O ERRO (Agora corrigido com o import lá em cima) ---
window.saveProfileFirebase = async () => {
    const name = document.getElementById('profile-name-input').value;
    const photoToSave = pendingProfilePhotoBase64 || auth.currentUser.photoURL;
    try {
        await updateProfile(auth.currentUser, { displayName: name, photoURL: photoToSave });
        await updateDoc(doc(db, "users", auth.currentUser.uid), { name: name, photo: photoToSave });
        updateUserUI(name, auth.currentUser.email, photoToSave);
        alert("Perfil atualizado!");
    } catch(e) { 
        console.error(e);
        alert("Erro: " + e.message); 
    }
}

// 3. LISTENERS
function initRealtimeData(currentUserEmail) {
    // TAREFAS
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    onSnapshot(qTasks, (snap) => {
        const list = document.getElementById('task-list');
        const homeList = document.getElementById('home-urgent-list');
        if(list) list.innerHTML = "";
        if(homeList) homeList.innerHTML = "";

        if(snap.empty && homeList) homeList.innerHTML = "<li style='color:#aaa'>Tudo feito!</li>";

        snap.forEach(d => {
            const t = d.data();
            const id = d.id;
            const html = `
                <div class="task-item ${t.done ? 'done' : ''} priority-${t.priority}">
                    <div style="flex:1; display:flex; align-items:center;">
                        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="window.toggleTaskFirebase('${id}', ${!t.done})">
                        <span style="margin-left:10px; font-weight:500;">${t.desc}</span>
                        <span class="assignee-badge">${t.assignee || 'Todos'}</span>
                    </div>
                    <button class="btn-delete" onclick="window.deleteTaskFirebase('${id}')"><i class="fas fa-trash"></i></button>
                </div>`;
            if(list) list.innerHTML += html;
            if(t.priority === 'Importante' && !t.done && homeList) homeList.innerHTML += `<li>${t.desc} <small style="color:#6366f1">(${t.assignee})</small></li>`;
        });
    });

    // COMPRAS
    onSnapshot(collection(db, "shopping"), (snap) => {
        const list = document.getElementById('shopping-list');
        if(list) list.innerHTML = "";
        currentShoppingData = [];
        
        snap.forEach(d => {
            const i = d.data();
            currentShoppingData.push(i);
            if(list) {
                list.innerHTML += `
                <li class="shopping-item">
                    <span>${i.item} <span class="cat-tag ${i.category}">${i.category || 'Geral'}</span></span>
                    <button onclick="window.buyItemFirebase('${d.id}', '${i.item}')" class="btn-primary" style="height:35px; padding:0 15px; font-size:0.8rem;">Comprar</button>
                </li>`;
            }
        });
    });

    // USUÁRIOS
    onSnapshot(collection(db, "users"), (snap) => {
        const select = document.getElementById('task-assignee');
        const adminList = document.getElementById('admin-user-list');
        if(select) select.innerHTML = '<option value="Todos">Atribuir a: Todos</option>';
        if(adminList) adminList.innerHTML = "";

        snap.forEach(d => {
            const u = d.data();
            if(select) select.innerHTML += `<option value="${u.name}">${u.name}</option>`;
            
            let deleteBtn = "";
            const adminEmail = "emanueldomingues.br@gmail.com";
            if (currentUserEmail && currentUserEmail.trim().toLowerCase() === adminEmail && u.email !== adminEmail) {
                deleteBtn = `<button class="user-btn-delete" onclick="window.deleteUserFirebase('${d.id}')" title="Remover"><i class="fas fa-trash"></i></button>`;
            }

            if(adminList) {
                adminList.innerHTML += `
                <li class="user-row">
                    <img src="${u.photo || 'https://via.placeholder.com/50'}">
                    <div style="flex:1"><strong>${u.name}</strong><br><small>${u.email}</small></div>
                    ${deleteBtn}
                </li>`;
            }
        });
    });

    // ESTOQUE
    onSnapshot(collection(db, "pantry"), (snap) => {
        const list = document.getElementById('pantry-list');
        if(list) list.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            if(list) list.innerHTML += `
            <li class="shopping-item">
                <span>${p.item} <b>(${p.qty} ${p.unit || 'un'})</b></span>
                <button onclick="window.deletePantryFirebase('${d.id}')" class="btn-delete"><i class="fas fa-trash"></i></button>
            </li>`;
        });
    });

    // AGENDA
    const qEvents = query(collection(db, "events"), orderBy("time", "asc"));
    onSnapshot(qEvents, (snap) => {
        const list = document.getElementById('event-list');
        const homeList = document.getElementById('home-agenda-list');
        if(list) list.innerHTML = "";
        if(homeList) homeList.innerHTML = "";
        if(snap.empty && homeList) homeList.innerText = "Nenhum evento.";
        let count = 0;
        snap.forEach(d => {
            const e = d.data();
            const date = new Date(e.time).toLocaleString('pt-BR');
            if(list) list.innerHTML += `<div class="event-card"><i class="fas fa-times event-delete-btn" onclick="window.deleteEventFirebase('${d.id}')"></i><h4>${e.desc}</h4><p><i class="far fa-clock"></i> ${date}</p><p><i class="fas fa-map-marker-alt"></i> ${e.loc}</p></div>`;
            if(count < 3 && homeList) { homeList.innerHTML += `<div style="margin-bottom:8px;"><strong>${e.desc}</strong><br><small>${date}</small></div>`; count++; }
        });
    });
}

// 4. FUNÇÕES EXTRAS
window.playSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.m4a');
    audio.volume = 0.5;
    audio.play().catch(e => {});
};

window.startVoice = (target) => {
    if (!('webkitSpeechRecognition' in window)) return alert("Navegador sem voz.");
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => alert("Fale agora...");
    recognition.onresult = (event) => {
        const txt = event.results[0][0].transcript;
        if(target === 'shopping') {
            document.getElementById('shopping-input').value = txt;
            window.addShoppingItem();
        }
    };
    recognition.start();
};

window.shareOnWhatsapp = () => {
    if(currentShoppingData.length === 0) return alert("Lista vazia!");
    let msg = "*Lista de Compras:*%0A";
    currentShoppingData.forEach(i => msg += `- ${i.item} (${i.category})%0A`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
};

// 5. BANCO DE DADOS
window.addTaskFirebase = async () => {
    const desc = document.getElementById('task-input').value;
    if(!desc) return;
    await addDoc(collection(db, "tasks"), { 
        desc, assignee: document.getElementById('task-assignee').value, 
        priority: document.getElementById('task-priority').value, done: false, createdAt: new Date().toISOString() 
    });
    document.getElementById('task-input').value = '';
};
window.toggleTaskFirebase = (id, status) => {
    updateDoc(doc(db, "tasks", id), { done: status });
    if(status) window.playSound();
};
window.deleteTaskFirebase = (id) => deleteDoc(doc(db, "tasks", id));

window.addShoppingItem = async () => {
    const val = document.getElementById('shopping-input').value;
    const cat = document.getElementById('shopping-category').value;
    if(val) { await addDoc(collection(db, "shopping"), { item: val, category: cat }); document.getElementById('shopping-input').value = ''; }
};

window.buyItemFirebase = async (id, item) => {
    const price = prompt(`Preço de ${item}? (R$)`, "0");
    const unit = prompt(`Qual a unidade? (un, kg, L)`, "un");
    const cost = parseFloat(price.replace(',', '.')) || 0;
    
    await addDoc(collection(db, "pantry"), { item, qty: 1, unit: unit });
    if(cost > 0) await addDoc(collection(db, "spending"), { item, cost, date: new Date().toISOString() });
    await deleteDoc(doc(db, "shopping", id));
};

window.addEventFirebase = async () => {
    const desc = document.getElementById('event-desc').value;
    const time = document.getElementById('event-time').value;
    if(!desc) return;
    await addDoc(collection(db, "events"), { desc, time, loc: document.getElementById('event-loc').value });
    document.getElementById('event-desc').value = '';
};
window.deleteEventFirebase = (id) => deleteDoc(doc(db, "events", id));

window.addPantryItem = async () => {
    const item = document.getElementById('pantry-item').value;
    const qty = document.getElementById('pantry-qty').value;
    const unit = document.getElementById('pantry-unit').value;
    if(item) {
        await addDoc(collection(db, "pantry"), { item, qty, unit });
        document.getElementById('pantry-item').value = '';
    }
}
window.deletePantryFirebase = (id) => deleteDoc(doc(db, "pantry", id));
window.deleteUserFirebase = async (id) => { if(confirm("Remover usuário?")) await deleteDoc(doc(db, "users", id)); };

// CHART
let myChart = null;
function initSpendingChart() {
    const ctx = document.getElementById('spendingChart');
    if(!ctx) return;
    onSnapshot(query(collection(db, "spending"), orderBy("date", "desc"), limit(10)), (snap) => {
        const labels = [], data = [];
        snap.forEach(d => { labels.push(d.data().item); data.push(d.data().cost); });
        if(myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels.reverse(), datasets: [{ label: 'R$', data: data.reverse(), backgroundColor: '#6366f1', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    });
}