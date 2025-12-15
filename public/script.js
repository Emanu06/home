// --- DADOS INICIAIS ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let shoppingList = JSON.parse(localStorage.getItem('shopping')) || [];
let events = JSON.parse(localStorage.getItem('events')) || [];
let pantry = JSON.parse(localStorage.getItem('pantry')) || [];
let customRecipes = JSON.parse(localStorage.getItem('customRecipes')) || [];
let spendingLog = JSON.parse(localStorage.getItem('spendingLog')) || [];
let userProfile = JSON.parse(localStorage.getItem('profile')) || {
    name: 'Usuário', photo: 'https://via.placeholder.com/50', dob: '', gender: ''
};

// --- BASE DE DADOS DO CHEF ---
const recipeDatabase = [
    { name: "Omelete Completo", ingredients: ["ovos", "queijo", "tomate"], steps: "1. Bata ovos. 2. Pique tudo. 3. Frite." },
    { name: "Macarronada", ingredients: ["macarrão", "tomate", "cebola"], steps: "1. Cozinhe massa. 2. Faça molho. 3. Misture." },
    { name: "Frango Grelhado", ingredients: ["frango", "arroz", "alho"], steps: "1. Tempere frango. 2. Grelhe. 3. Sirva com arroz." },
    { name: "Purê Rústico", ingredients: ["batata", "leite", "manteiga"], steps: "1. Cozinhe batatas. 2. Amasse com leite e manteiga." },
    { name: "Bolo de Caneca", ingredients: ["ovo", "farinha", "leite", "açúcar"], steps: "1. Misture na caneca. 2. Microondas 3min." }
];

let myChart = null; // Variável global para o gráfico

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
    loadProfile();
    renderAll();
});

function renderAll() {
    renderTasks();
    renderShopping();
    renderEvents();
    renderPantry();
    updateHome();
}

// --- SOM (GAMIFICAÇÃO) ---
function playSound(type) {
    // Som simples de "pop" hospedado online
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.m4a');
    audio.volume = 0.5;
    audio.play().catch(e => console.log("Audio play prevented"));
}

// --- COMANDO DE VOZ ---
function startVoice(target) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Seu navegador não suporta comandos de voz.");
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    
    recognition.onstart = () => alert("Estou ouvindo... Fale o item!");
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if(target === 'shopping') {
            document.getElementById('shopping-input').value = transcript;
            addShoppingItem();
        }
    };
    recognition.start();
}

// --- DARK MODE ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    renderChart(); // Atualiza cores do gráfico
}

// --- PESQUISA ---
function filterList(listId, searchText) {
    const list = document.getElementById(listId);
    const items = list.getElementsByTagName('li');
    const term = searchText.toLowerCase();
    for (let i = 0; i < items.length; i++) {
        const text = items[i].textContent || items[i].innerText;
        items[i].style.display = text.toLowerCase().indexOf(term) > -1 ? "" : "none";
    }
}

// --- WHATSAPP ---
function shareOnWhatsapp() {
    if(shoppingList.length === 0) return alert("A lista está vazia!");
    let message = "*Minha Lista de Compras (Home Manager):*%0A%0A";
    shoppingList.forEach(item => {
        message += `• ${item.item} (${item.category || 'Geral'})%0A`;
    });
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
}

// --- NAVEGAÇÃO ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.getElementById(id).classList.add('active-section');
    const menuMap = {'home':0, 'tasks':1, 'shopping':2, 'calendar':3, 'pantry':4, 'profile':5};
    if(menuMap[id] !== undefined) document.querySelectorAll('.nav-links li')[menuMap[id]].classList.add('active');
    if(id === 'home') updateHome();
}

// --- TAREFAS ---
function addTask() {
    const desc = document.getElementById('task-input').value;
    const priority = document.getElementById('task-priority').value;
    if(!desc) return;
    tasks.push({ id: Date.now(), desc, priority, done: false });
    document.getElementById('task-input').value = '';
    saveAndRender('tasks');
}
function toggleTask(id) {
    const t = tasks.find(x => x.id === id); 
    if(t) {
        t.done = !t.done; 
        if(t.done) playSound();
    }
    saveAndRender('tasks');
}
function deleteTask(id) { tasks = tasks.filter(x => x.id !== id); saveAndRender('tasks'); }
function renderTasks() {
    const list = document.getElementById('task-list'); list.innerHTML = '';
    tasks.forEach(t => {
        list.innerHTML += `<li style="opacity:${t.done?0.6:1};text-decoration:${t.done?'line-through':''}">
            <div style="display:flex;align-items:center;gap:10px;"><input type="checkbox" ${t.done?'checked':''} onclick="toggleTask(${t.id})"> ${t.desc}</div>
            <div style="display:flex;align-items:center;gap:10px;"><span class="tag ${t.priority}">${t.priority}</span><i class="fas fa-trash" onclick="deleteTask(${t.id})" style="color:#ff7675;cursor:pointer;"></i></div></li>`;
    });
}

// --- COMPRAS ---
function addShoppingItem() {
    const item = document.getElementById('shopping-input').value;
    const cat = document.getElementById('shopping-category').value;
    if(!item) return;
    shoppingList.push({ id: Date.now(), item, category: cat });
    document.getElementById('shopping-input').value = '';
    saveAndRender('shopping');
}
function markAsBought(id) {
    const itemObj = shoppingList.find(i => i.id === id);
    if(!itemObj) return;

    const qtyStr = prompt(`Quantos(as) "${itemObj.item}" você comprou?`, "1");
    if(qtyStr === null) return;
    const unit = prompt(`Qual a unidade? (un, kg, g, L)`, "un");
    if(unit === null) return;
    
    const priceStr = prompt("Valor TOTAL pago (R$)? (0 se não quiser)", "0");
    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    const expiry = prompt("Validade? (AAAA-MM-DD) ou enter");
    const qty = parseFloat(qtyStr.replace(',', '.')) || 1;

    // Move para o estoque com a mesma categoria da lista
    addToPantryLogic(itemObj.item, qty, unit, expiry, itemObj.category);

    if(price > 0) {
        spendingLog.push({ date: new Date().toISOString(), item: itemObj.item, cost: price });
        localStorage.setItem('spendingLog', JSON.stringify(spendingLog));
    }
    
    playSound(); // Som de sucesso
    shoppingList = shoppingList.filter(i => i.id !== id);
    saveAndRender('shopping');
    saveAndRender('pantry');
}
function removeShoppingItem(id) { shoppingList = shoppingList.filter(i => i.id !== id); saveAndRender('shopping'); }
function renderShopping() {
    const list = document.getElementById('shopping-list'); list.innerHTML = '';
    shoppingList.forEach(i => {
        list.innerHTML += `<li>
            <span>${i.item} <span class="cat-tag ${i.category}">${i.category || 'Geral'}</span></span>
            <div><button onclick="markAsBought(${i.id})" style="background:var(--accent-green);border:none;color:white;cursor:pointer;padding:5px 10px;border-radius:5px;margin-right:5px;"><i class="fas fa-check"></i></button><i class="fas fa-trash" onclick="removeShoppingItem(${i.id})" style="color:#ff7675;cursor:pointer;"></i></div>
        </li>`;
    });
}

// --- ESTOQUE ---
function addPantryItem() {
    const item = document.getElementById('pantry-item').value;
    const qty = parseFloat(document.getElementById('pantry-qty').value) || 1;
    const unit = document.getElementById('pantry-unit').value;
    const cat = document.getElementById('pantry-category').value;
    const expiry = document.getElementById('pantry-expiry').value;
    if(!item) return;
    addToPantryLogic(item, qty, unit, expiry, cat);
    document.getElementById('pantry-item').value = ''; 
    document.getElementById('pantry-qty').value = ''; 
    document.getElementById('pantry-expiry').value = '';
}
function addToPantryLogic(item, qty, unit, expiry, cat) {
    const existing = pantry.find(p => p.item.toLowerCase() === item.toLowerCase() && p.unit === unit);
    if(existing) { 
        existing.qty += qty; 
        if(expiry) existing.expiry = expiry;
        if(cat) existing.category = cat;
    } 
    else { pantry.push({ id: Date.now(), item, qty, unit, expiry, category: cat || 'Geral' }); }
    saveAndRender('pantry');
}
function updatePantryQty(id, delta) {
    const p = pantry.find(x => x.id === id);
    if(p) {
        p.qty += delta;
        if(p.qty <= 0) {
            if(confirm(`Acabou ${p.item}. Comprar novamente?`)) { 
                shoppingList.push({ id: Date.now(), item: p.item, category: p.category }); 
                saveAndRender('shopping'); pantry = pantry.filter(x => x.id !== id); 
            } else { pantry = pantry.filter(x => x.id !== id); }
        }
        saveAndRender('pantry');
    }
}
function renderPantry() {
    const list = document.getElementById('pantry-list'); list.innerHTML = '';
    const today = new Date();
    pantry.forEach(p => {
        let expiryMsg = '', expiryStyle = '';
        if(p.expiry) {
            const days = Math.ceil((new Date(p.expiry) - today) / (86400000));
            if(days < 0) { expiryMsg = '(VENCEU!)'; expiryStyle = 'color:red;font-weight:bold;font-size:0.8em;'; }
            else if (days <= 3) { expiryMsg = `(Vence ${days}d)`; expiryStyle = 'color:orange;font-weight:bold;font-size:0.8em;'; }
            else { expiryMsg = `(Val: ${new Date(p.expiry).toLocaleDateString('pt-BR').slice(0,5)})`; expiryStyle = 'color:var(--text-muted);font-size:0.8em;'; }
        }
        list.innerHTML += `<li><div style="display:flex;flex-direction:column;">
            <span><b>${p.item}</b> <small>(${p.qty} ${p.unit})</small> <span class="cat-tag ${p.category}">${p.category}</span></span>
            <span style="${expiryStyle}">${expiryMsg}</span></div>
            <div><button onclick="updatePantryQty(${p.id},1)" style="border:none;background:none;color:green;font-size:1.2rem;cursor:pointer;">+</button><button onclick="updatePantryQty(${p.id},-1)" style="border:none;background:none;color:red;font-size:1.2rem;cursor:pointer;">-</button></div></li>`;
    });
}

// --- GRÁFICOS E DASHBOARD ---
function renderChart() {
    const ctx = document.getElementById('spendingChart');
    if(!ctx) return;
    const lastSpends = spendingLog.slice(-10); // Últimos 10 itens
    const labels = lastSpends.map(s => { const d = new Date(s.date); return `${d.getDate()}/${d.getMonth()+1}`; });
    const data = lastSpends.map(s => s.cost);
    
    if(myChart) myChart.destroy();
    
    // Cor condicional ao tema
    const isDark = document.body.classList.contains('dark-mode');
    const color = isDark ? 'rgba(138, 125, 245, 0.6)' : 'rgba(0, 184, 148, 0.6)';

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Valor (R$)', data: data, backgroundColor: color, borderRadius: 5 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, grid: { color: isDark?'#444':'#eee' } }, x: { grid: { display:false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function updateHome() {
    const ulUrgent = document.getElementById('home-urgent-list'); ulUrgent.innerHTML = '';
    const urgent = tasks.filter(t => t.priority === 'Importante' && !t.done);
    if(urgent.length === 0) ulUrgent.innerHTML = '<li style="color:#aaa">Tudo tranquilo.</li>';
    urgent.slice(0, 3).forEach(t => ulUrgent.innerHTML += `<li>${t.desc}</li>`);

    // Atualiza Gráfico
    renderChart();

    // Alertas
    const ulStock = document.getElementById('home-low-stock-list'); ulStock.innerHTML = '';
    const now = new Date();
    const alerts = pantry.filter(p => {
        let isExp = false;
        if(p.expiry) { const diff = Math.ceil((new Date(p.expiry) - now)/86400000); if(diff<=3) isExp=true; }
        return (p.qty<=2 && (p.unit==='un'||p.unit==='L')) || isExp;
    });
    if(alerts.length === 0) ulStock.innerHTML = '<li style="color:#aaa">Estoque saudável.</li>';
    alerts.slice(0, 3).forEach(p => {
        let txt = p.item;
        if(p.expiry) { const d = Math.ceil((new Date(p.expiry)-now)/86400000); if(d<=3) txt += ` (Vence ${d}d)`; }
        else if(p.qty<=2) txt += ` (Baixo: ${p.qty})`;
        ulStock.innerHTML += `<li style="color:var(--accent-red)">${txt}</li>`;
    });

    // Receita
    const divRecipe = document.getElementById('home-recipe-display');
    const myStockNames = pantry.map(p => p.item.toLowerCase());
    const allRecipes = [...recipeDatabase, ...customRecipes];
    const possible = allRecipes.find(r => r.ingredients.every(i => myStockNames.some(s => s.includes(i))));
    if(possible) divRecipe.innerHTML = `<p>Você pode fazer:</p><h4 style="color:var(--primary);margin:5px 0;">${possible.name}</h4>`;
    else divRecipe.innerHTML = `<p style="color:#aaa">Faltam ingredientes.</p>`;
}

// --- UTILS & BACKUP & CHEF ---
function askChef() {
    const chat = document.getElementById('chat-window'); chat.innerHTML += `<div class="message bot">Verificando...</div>`;
    const myStockNames = pantry.map(p => p.item.toLowerCase());
    const allRecipes = [...recipeDatabase, ...customRecipes];
    const matches = allRecipes.filter(r => r.ingredients.every(i => myStockNames.some(s => s.includes(i))));
    setTimeout(() => {
        if(matches.length>0) { chat.innerHTML += `<div class="message bot">Encontrei <b>${matches.length}</b> prato(s)!</div>`; matches.forEach(r => chat.innerHTML += `<div class="recipe-card"><h4>${r.name}</h4><p><b>Ingr:</b> ${r.ingredients.join(', ')}</p><p style="margin-top:5px;font-size:0.8rem;">${r.steps}</p></div>`); }
        else chat.innerHTML += `<div class="message bot">Nada encontrado.</div>`;
        chat.scrollTop = chat.scrollHeight;
    }, 800);
}
function addCustomRecipe() {
    const name = document.getElementById('new-recipe-name').value;
    const ingsText = document.getElementById('new-recipe-ings').value;
    const steps = document.getElementById('new-recipe-steps').value;
    if(!name || !ingsText || !steps) return alert("Preencha tudo!");
    customRecipes.push({ name, ingredients: ingsText.split(',').map(i=>i.trim().toLowerCase()), steps, isCustom: true });
    localStorage.setItem('customRecipes', JSON.stringify(customRecipes)); alert("Receita salva!");
    document.getElementById('new-recipe-name').value='';document.getElementById('new-recipe-ings').value='';document.getElementById('new-recipe-steps').value='';
}
// Funções restantes (addEvent, saveProfile, downloadData, uploadData) mantêm-se iguais logicamente, apenas incluídas no fluxo:
function addEvent() { 
    const desc = document.getElementById('event-desc').value; const time = document.getElementById('event-time').value; 
    if(!desc || !time) return; 
    events.push({ id:Date.now(), desc, time, loc:document.getElementById('event-loc').value, priority:document.getElementById('event-priority').value }); 
    events.sort((a,b)=>new Date(a.time)-new Date(b.time)); saveAndRender('events'); document.getElementById('event-desc').value=''; 
}
function renderEvents() {
    const grid=document.getElementById('event-list'); grid.innerHTML='';
    events.forEach(e=>{ const d=new Date(e.time); grid.innerHTML+=`<div class="event-card ${e.priority==='Importante'?'important':''}"><h4>${e.desc}</h4><p style="color:var(--text-muted);"><i class="far fa-clock"></i> ${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0,5)}</p><p><i class="fas fa-map-marker-alt"></i> ${e.loc||'Em casa'}</p><button onclick="deleteEvent(${e.id})" style="margin-top:10px;color:#ff7675;background:none;border:none;cursor:pointer;">Excluir</button></div>`; });
}
function deleteEvent(id){ events=events.filter(e=>e.id!==id); saveAndRender('events'); }
function saveProfile(){
    userProfile.name = document.getElementById('profile-name').value; userProfile.dob = document.getElementById('profile-dob').value; userProfile.gender = document.getElementById('profile-gender').value;
    const f = document.getElementById('profile-photo-file');
    if(f.files && f.files[0]) { const r = new FileReader(); r.onload=function(e){ if(e.target.result.length>4000000) return alert("Foto grande!"); userProfile.photo=e.target.result; finishSaveProfile(); }; r.readAsDataURL(f.files[0]); } else { finishSaveProfile(); }
}
function finishSaveProfile(){ localStorage.setItem('profile', JSON.stringify(userProfile)); loadProfile(); alert("Salvo!"); }
function loadProfile(){
    document.getElementById('nav-user-name').innerText=userProfile.name||'Usuário';
    const ph = (userProfile.photo&&userProfile.photo.length>10)?userProfile.photo:'https://via.placeholder.com/50';
    document.getElementById('nav-user-photo').src=ph; document.getElementById('profile-preview').src=ph;
    document.getElementById('profile-name').value=userProfile.name; document.getElementById('profile-dob').value=userProfile.dob; document.getElementById('profile-gender').value=userProfile.gender;
}
function saveAndRender(key) {
    if(key==='tasks') localStorage.setItem('tasks',JSON.stringify(tasks));
    if(key==='shopping') localStorage.setItem('shopping',JSON.stringify(shoppingList));
    if(key==='events') localStorage.setItem('events',JSON.stringify(events));
    if(key==='pantry') localStorage.setItem('pantry',JSON.stringify(pantry));
    renderAll();
}
function downloadData(){
    const d={tasks,pantry,shoppingList,events,userProfile,customRecipes,spendingLog};
    const a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(d)); a.download="home_backup.json"; a.click();
}
function uploadData(input){
    const f=input.files[0]; if(!f)return; const r=new FileReader();
    r.onload=function(e){ if(confirm("Substituir dados?")) { try{ const d=JSON.parse(e.target.result); localStorage.setItem('tasks',JSON.stringify(d.tasks||[])); localStorage.setItem('pantry',JSON.stringify(d.pantry||[])); localStorage.setItem('shopping',JSON.stringify(d.shoppingList||[])); localStorage.setItem('events',JSON.stringify(d.events||[])); localStorage.setItem('profile',JSON.stringify(d.userProfile||{})); localStorage.setItem('customRecipes',JSON.stringify(d.customRecipes||[])); localStorage.setItem('spendingLog',JSON.stringify(d.spendingLog||[])); location.reload(); }catch(err){alert("Erro no arquivo");} } }; r.readAsText(f);
}