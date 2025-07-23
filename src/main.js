import { login, logout, checkAuth } from './auth.js';
import { addServiceOrder, getServiceOrders, deleteServiceOrder, updateServiceOrder } from './os.js';
import { showToast, showModal, hideModal, showLoading, hideLoading } from './ui.js';
import { formatDate, formatCurrency } from './utils.js';

// --- PROTEGER A PÁGINA ---
checkAuth(
    user => {
        console.log('Usuário autenticado:', user.email || 'Usuário anônimo');
        loadServiceOrders();
    },
    () => {
        window.location.href = 'login.html';
    }
);

// --- FORM LOGIN (NA PÁGINA login.html) ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            await login(email, password);
            window.location.href = 'index.html';
        } catch (err) {
            showToast('Erro ao fazer login: ' + err.message, 'error');
        }
    });
}

// --- BOTÃO LOGOUT ---
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        await logout();
        window.location.href = 'login.html';
    });
}

// --- FORM ADICIONAR OS ---
const osForm = document.getElementById('os-form');
if (osForm) {
    osForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = osForm.querySelector('button[type="submit"]');
        showLoading(submitBtn);

        const newOrder = {
            clientName: document.getElementById('client-name').value,
            entryDate: document.getElementById('entry-date').value,
            totalValue: document.getElementById('total-value').value,
            status: document.getElementById('order-status').value,
            createdAt: new Date().toISOString()
        };

        try {
            await addServiceOrder(newOrder);
            showToast('Ordem de Serviço salva!');
            osForm.reset();
            loadServiceOrders();
        } catch (err) {
            showToast('Erro ao salvar OS: ' + err.message, 'error');
        } finally {
            hideLoading(submitBtn, 'Salvar Ordem de Serviço');
        }
    });
}

// --- CARREGAR ORDENS NA TABELA ---
async function loadServiceOrders() {
    const orders = await getServiceOrders();
    const tableBody = document.getElementById('os-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.id}</td>
            <td>${formatDate(order.entryDate)}</td>
            <td>${order.clientName}</td>
            <td>${formatCurrency(order.totalValue)}</td>
            <td>${order.status}</td>
            <td>
                <button data-id="${order.id}" class="view-btn">Ver</button>
                <button data-id="${order.id}" class="delete-btn">Excluir</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // AÇÕES DOS BOTÕES
    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm('Excluir esta OS?')) {
                await deleteServiceOrder(btn.dataset.id);
                showToast('OS excluída.');
                loadServiceOrders();
            }
        });
    });

    tableBody.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showModal('view-modal');
        });
    });
}
