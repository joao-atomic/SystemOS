import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Lógica de Proteção de Página ---
function checkAuth() {
    try {
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'login.html'; // Ajuste o caminho para a sua estrutura
        } else {
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.classList.remove('hidden');
            } else {
                console.error("Elemento 'app-container' não encontrado no HTML.");
            }
        }
    } catch (e) {
        console.error("Erro na função checkAuth:", e);
    }
}
checkAuth();

// --- Lógica do Menu Mobile ---
function handleMobileMenu() {
    try {
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
    } catch (e) {
        console.error("Erro na função handleMobileMenu:", e);
    }
}

// --- Conexão com Supabase ---
const SUPABASE_URL = 'https://dolmskfxulciscwrpfes.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbG1za2Z4dWxjaXNjd3JwZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzYxOTQsImV4cCI6MjA2OTY1MjE5NH0.QB9j1Whd6ljxbMptXoAYlLbCm0WgmsD5PaFdPfBFH_E';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Lógica da Página de Busca ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("1. DOM carregado. Iniciando script da página de busca.");
        
        handleMobileMenu();
        console.log("2. Lógica do menu mobile executada.");

        // Elementos do DOM
        const resultsTableBody = document.getElementById('results-table-body');
        const noResultsMessage = document.getElementById('no-results-message');
        const logoutButton = document.getElementById('logout-button');
        const filterBrand = document.getElementById('filter-brand');
        const filterModel = document.getElementById('filter-model');
        const filterDefect = document.getElementById('filter-defect');
        const filterGeneral = document.getElementById('filter-general');
        
        const editModal = document.getElementById('edit-status-modal');
        const modalOsNumber = document.getElementById('modal-os-number');
        const modalCurrentStatus = document.getElementById('modal-current-status');
        const modalStatusSelect = document.getElementById('modal-status-select');
        const modalSaveButton = document.getElementById('modal-save-button');
        const modalCancelButton = document.getElementById('modal-cancel-button');

        let allServiceOrders = [];
        let currentEditingOrderId = null;

        // Verifica credenciais
        // if (SUPABASE_URL === 'https://dolmskfxulciscwrpfes.supabase.co' || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbG1za2Z4dWxjaXNjd3JwZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzYxOTQsImV4cCI6MjA2OTY1MjE5NH0.QB9j1Whd6ljxbMptXoAYlLbCm0WgmsD5PaFdPfBFH_E') {
        //     throw new Error("As credenciais do Supabase não foram configuradas no arquivo search.js.");
        // }
        console.log("3. Verificação de credenciais OK.");
        
        // supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("4. Cliente Supabase inicializado.");

        if(logoutButton) {
            logoutButton.addEventListener('click', () => {
                localStorage.removeItem('isLoggedIn');
                window.location.href = '/frontend/src/pages/login.html';
            });
        }

        const getStatusColor = (status) => {
            switch (status) {
                case 'Aberta': return 'bg-green-100 text-green-800';
                case 'Aguardando Aprovação': return 'bg-yellow-100 text-yellow-800';
                case 'Aprovado': return 'bg-blue-100 text-blue-800';
                case 'Em Andamento': return 'bg-indigo-100 text-indigo-800';
                case 'Concluído': return 'bg-purple-100 text-purple-800';
                case 'Entregue': return 'bg-gray-100 text-gray-800';
                case 'Cancelado': return 'bg-red-100 text-red-800';
                default: return 'bg-gray-200 text-gray-900';
            }
        };

        const statusOrder = ['Aberta', 'Aguardando Aprovação', 'Aprovado', 'Em Andamento', 'Concluído', 'Entregue'];
        const finalStatuses = ['Entregue', 'Cancelado'];

        function openEditModal(order) {
            currentEditingOrderId = order.id;
            modalOsNumber.textContent = order.numero_ordem;
            modalCurrentStatus.textContent = order.status;
            
            modalStatusSelect.innerHTML = '';
            if (finalStatuses.includes(order.status)) {
                modalStatusSelect.innerHTML = '<option>Status finalizado, não pode ser alterado.</option>';
                modalSaveButton.disabled = true;
            } else {
                const currentIndex = statusOrder.indexOf(order.status);
                for (let i = currentIndex + 1; i < statusOrder.length; i++) {
                    const option = document.createElement('option');
                    option.value = statusOrder[i];
                    option.textContent = statusOrder[i];
                    modalStatusSelect.appendChild(option);
                }
                const cancelOption = document.createElement('option');
                cancelOption.value = 'Cancelado';
                cancelOption.textContent = 'Cancelado';
                modalStatusSelect.appendChild(cancelOption);
                modalSaveButton.disabled = false;
            }
            
            editModal.classList.remove('hidden');
        }

        function closeEditModal() {
            editModal.classList.add('hidden');
            currentEditingOrderId = null;
        }

        async function saveStatusChange() {
            const newStatus = modalStatusSelect.value;
            if (!newStatus || !currentEditingOrderId) return;

            modalSaveButton.disabled = true;
            modalSaveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            const { error } = await supabase
                .from('ordens_de_servico')
                .update({ status: newStatus })
                .eq('id', currentEditingOrderId);

            if (error) {
                alert(`Erro ao atualizar o status: ${error.message}`);
            } else {
                alert('Status atualizado com sucesso!');
                fetchOrders();
            }
            
            modalSaveButton.disabled = false;
            modalSaveButton.innerHTML = 'Salvar Alterações';
            closeEditModal();
        }

        modalCancelButton.addEventListener('click', closeEditModal);
        modalSaveButton.addEventListener('click', saveStatusChange);

        resultsTableBody.addEventListener('click', (e) => {
            const editButton = e.target.closest('.edit-btn');
            if (editButton) {
                const orderId = editButton.dataset.id;
                const orderToEdit = allServiceOrders.find(o => o.id == orderId);
                if (orderToEdit) {
                    openEditModal(orderToEdit);
                }
            }
        });

        function renderResults(orders) {
            resultsTableBody.innerHTML = '';
            if (orders.length === 0) {
                noResultsMessage.textContent = 'Nenhuma ordem de serviço encontrada.';
                noResultsMessage.classList.remove('hidden');
            } else {
                noResultsMessage.classList.add('hidden');
            }

            orders.forEach(order => {
                const row = document.createElement('tr');
                const statusColor = getStatusColor(order.status);
                row.innerHTML = `
                    <td>${order.numero_ordem || 'N/A'}</td>
                    <td>${new Date(order.data_entrada).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                    <td><span class="status-badge ${statusColor}">${order.status || 'N/A'}</span></td>
                    <td>${order.cliente || 'N/A'}</td>
                    <td>${order.marca_aparelho || 'N/A'}</td>
                    <td>${order.modelo_aparelho || 'N/A'}</td>
                    <td>
                        <button data-id="${order.id}" class="edit-btn text-blue-600 hover:text-blue-800" title="Editar Status">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;
                resultsTableBody.appendChild(row);
            });
        }
        
        function applyFilters() {
            const brand = filterBrand.value.toLowerCase();
            const model = filterModel.value.toLowerCase();
            const defect = filterDefect.value.toLowerCase();
            const general = filterGeneral.value.toLowerCase();

            const filtered = allServiceOrders.filter(order => {
                const matchesBrand = brand ? (order.marca_aparelho || '').toLowerCase().includes(brand) : true;
                const matchesModel = model ? (order.modelo_aparelho || '').toLowerCase().includes(model) : true;
                const matchesDefect = defect ? (order.defeito_reclamado || '').toLowerCase().includes(defect) : true;
                const matchesGeneral = general ? 
                    ((order.numero_ordem || '').toString().toLowerCase().includes(general) || (order.cliente || '').toLowerCase().includes(general)) 
                    : true;
                
                return matchesBrand && matchesModel && matchesDefect && matchesGeneral;
            });
            
            renderResults(filtered);
        }

        async function fetchOrders() {
            noResultsMessage.textContent = 'Buscando dados...';
            noResultsMessage.classList.remove('hidden');
            console.log("5. Buscando dados no Supabase...");

            const { data, error } = await supabase.from('ordens_de_servico').select('*').order('data_entrada', { ascending: false });

            if (error) {
                throw new Error(`Erro do Supabase: ${error.message}`);
            }
            
            console.log(`6. Busca concluída. ${data ? data.length : 0} registros encontrados.`);
            allServiceOrders = data || [];
            renderResults(allServiceOrders);
        }
        
        [filterBrand, filterModel, filterDefect, filterGeneral].forEach(input => {
            input.addEventListener('keyup', applyFilters);
        });
        
        fetchOrders();

    } catch (e) {
        console.error("ERRO CRÍTICO:", e);
        document.body.innerHTML = `<div style="padding: 2rem; text-align: center; font-family: sans-serif;">
            <h1 style="font-size: 1.5rem; color: #dc2626; font-weight: bold;">Erro Crítico ao Carregar a Página</h1>
            <p style="color: #4b5563;">${e.message}</p>
            <p style="color: #4b5563; margin-top: 1rem;">Verifique o console do navegador para mais detalhes.</p>
        </div>`;
    }
});
