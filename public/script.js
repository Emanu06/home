/**
 * script.js
 * Responsável pela navegação visual (Abas, Menus) e interações de UI (Tecla Enter).
 * A lógica de dados (Salvar/Deletar) está no firebase-config.js
 */

// ==================================================
// 1. NAVEGAÇÃO ENTRE ABAS (SIDEBAR)
// ==================================================

window.showSection = function(sectionId) {
    // 1. Esconde todas as seções de conteúdo
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active-section');
    });

    // 2. Remove o destaque (classe active) de todos os links do menu
    const navLinks = document.querySelectorAll('.nav-links li');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    // 3. Mostra a seção desejada com animação
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active-section');
    }

    // 4. Adiciona destaque no botão do menu que foi clicado
    // Procura qual link tem o onclick chamando a seção atual
    navLinks.forEach(link => {
        const attr = link.getAttribute('onclick');
        // Verifica se o atributo onclick contém o ID da seção
        if (attr && attr.includes(`'${sectionId}'`)) {
            link.classList.add('active');
        }
    });

    // Log para depuração (opcional)
    if (sectionId === 'home') {
        console.log("Navegou para o Dashboard");
    }
};

// ==================================================
// 2. AUXILIARES DE UI & EVENTOS
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Configuração da Tecla ENTER ---
    // Mapeia os IDs dos inputs para as funções globais do Firebase
    const inputsMap = [
        { inputId: 'task-input', action: window.addTaskFirebase },
        { inputId: 'shopping-input', action: window.addShoppingItem },
        { inputId: 'pantry-item', action: window.addPantryItem },
        { inputId: 'event-desc', action: window.addEventFirebase }
    ];

    inputsMap.forEach(map => {
        const inputElement = document.getElementById(map.inputId);
        
        if (inputElement) {
            inputElement.addEventListener('keypress', (e) => {
                // Se a tecla pressionada for Enter
                if (e.key === 'Enter') {
                    e.preventDefault(); // Evita recarregar a página (comportamento padrão de form)
                    
                    // Verifica se a função existe no window (carregada pelo firebase-config.js)
                    if (typeof map.action === 'function') {
                        map.action(); 
                    } else {
                        console.warn(`A função para ${map.inputId} ainda não foi carregada.`);
                    }
                }
            });
        }
    });

    // --- Configuração de Data Mínima (Agenda) ---
    // Impede que o usuário selecione datas passadas no input de agenda
    const eventTimeInput = document.getElementById('event-time');
    if(eventTimeInput) {
        const now = new Date();
        // Ajuste de fuso horário para o formato ISO funcionar corretamente localmente
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        // Define o atributo 'min' do input para agora
        eventTimeInput.min = now.toISOString().slice(0, 16);
    }
});

// --- Função Auxiliar de Formatação (Opcional) ---
// Caso precise formatar datas via JS localmente
window.formatDateBR = function(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};