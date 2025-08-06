import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = '/frontend/src/pages/login.html';;
    } else {
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    }
}
checkAuth();

// --- Lógica do Menu Mobile ---
function handleMobileMenu() {
    const hamburgerButton = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    if (hamburgerButton && sidebar && overlay) {
        hamburgerButton.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}

// --- Conexão com Supabase ---
// Conexão com Supabase
const SUPABASE_URL = 'xxxxxxxxxxxxxxxxxxx'; 
const SUPABASE_ANON_KEY = 'xxxxxxxxxxxxxxxxxx';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- Lógica Principal da Aplicação ---
document.addEventListener('DOMContentLoaded', () => {
    
    handleMobileMenu();

    const osForm = document.getElementById('os-form');
    if (!osForm) return;

    // Elementos do DOM
    const osNumberInput = document.getElementById('os-number');
    const entryDateInput = document.getElementById('entry-date');
    const logoutButton = document.getElementById('logout-button');
    const submitButton = osForm.querySelector('button[type="submit"]');

    // Elementos do Popup
    const popupModal = document.getElementById('popup-modal');
    const popupIconContainer = document.getElementById('popup-icon-container');
    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const popupCloseButton = document.getElementById('popup-close-button');

    // --- Função para mostrar o Popup ---
    function showPopup(title, message, type = 'success') {
        popupTitle.textContent = title;
        popupMessage.textContent = message;

        if (type === 'success') {
            popupIconContainer.innerHTML = '<i class="fas fa-check text-green-600"></i>';
            popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10';
            popupCloseButton.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm';
        } else { // error
            popupIconContainer.innerHTML = '<i class="fas fa-times text-red-600"></i>';
            popupIconContainer.className = 'mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10';
            popupCloseButton.className = 'w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm';
        }

        popupModal.classList.remove('hidden');
    }

    // Evento para fechar o popup
    popupCloseButton.addEventListener('click', () => {
        popupModal.classList.add('hidden');
    });

    // --- Funções Helper ---
    function getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    function getRadioValue(name) {
        const selected = document.querySelector(`input[name="${name}"]:checked`);
        return selected ? selected.value : '';
    }

    function gerarNumeroOS() {
        const agora = new Date();
        const ano = agora.getFullYear().toString().slice(-2);
        const mes = String(agora.getMonth() + 1).padStart(2, '0');
        const dia = String(agora.getDate()).padStart(2, '0');
        const aleatorio = Math.floor(1000 + Math.random() * 9000);
        return `OS-${ano}${mes}${dia}-${aleatorio}`;
    }

    const setSubmitButtonState = (state, message) => {
        if (state === 'loading') {
            submitButton.disabled = true;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${message}`;
        } else if (state === 'ready') {
            submitButton.disabled = false;
            submitButton.innerHTML = `<i class="fas fa-save mr-2"></i> ${message}`;
        }
    };

    // --- Lógica de Inicialização ---
    entryDateInput.value = new Date().toISOString().split('T')[0];
    osNumberInput.value = gerarNumeroOS(); 
    setSubmitButtonState('ready', 'Salvar Ordem de Serviço'); 

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });

    // --- Lógica de Envio do Formulário ---
    osForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitButton.disabled) return;

        if (!osNumberInput.value.trim()) {
            osNumberInput.value = gerarNumeroOS();
        }

        const dados = {
            tipo: getRadioValue('os-type'), // Corrigido para pegar o valor do radio
            numero_ordem: osNumberInput.value,
            data_entrada: getValue('entry-date'),
            status: getValue('order-status'),
            cliente: getValue('client-name'),
            telefone: getValue('client-phone'),
            endereco: getValue('client-address'),
            origem_cliente: getRadioValue('customer-origin'),
            marca_aparelho: getRadioValue('object'),
            modelo_aparelho: getValue('device-model'),
            numero_serie: getValue('device-serial'),
            defeito_reclamado: getValue('device-defect'),
            localizacao_aparelho: getValue('device-location'),
            acessorios: getRadioValue('accessories'),
            estado_aparelho: getRadioValue('condition'),
            sinal: parseFloat(getValue('down-payment')) || 0,
            valor_total: parseFloat(getValue('total-value')) || 0,
        };

        setSubmitButtonState('loading', 'Salvando...');

        const { data, error } = await supabase.from('ordens_de_servico').insert([dados]);

        if (error) {
            showPopup('Erro!', `Não foi possível salvar a OS: ${error.message}`, 'error');
            console.error(error);
        } else {
            showPopup('Sucesso!', 'Ordem de serviço salva com sucesso!');
            osForm.reset();
            entryDateInput.value = new Date().toISOString().split('T')[0];
            osNumberInput.value = gerarNumeroOS();
        }
        setSubmitButtonState('ready', 'Salvar Ordem de Serviço');
    });
});
