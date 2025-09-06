import { supabase, requireAuth, signOutAndRedirect } from '/backend/src/auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth(); // <-- protege a página e remove 'hidden'

  document.getElementById('logout-button')?.addEventListener('click', signOutAndRedirect);
});

/* ========= 2) Menu (hambúrguer + overlay) ========= */
function initMenu() {
  try {
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay') || document.querySelector('.overlay');
    const buttons = Array.from(document.querySelectorAll('#menu-toggle, .hamburger-btn'));

    if (!sidebar || !overlay || buttons.length === 0) return;

    const setSidebar = (open) => {
      // classes do Tailwind
      sidebar.classList.toggle('-translate-x-full', !open);
      sidebar.classList.toggle('translate-x-0', open);
      // compat com CSS antigo (.open)
      sidebar.classList.toggle('open', open);
      overlay.classList.toggle('active', open);
      buttons.forEach(b => b.setAttribute('aria-expanded', String(open)));
    };

    const toggleSidebar = () => setSidebar(sidebar.classList.contains('-translate-x-full'));
    const closeSidebar  = () => setSidebar(false);

    // estado inicial (fechado para mobile)
    setSidebar(false);

    buttons.forEach(btn => btn.addEventListener('click', toggleSidebar));
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
  } catch (e) {
    console.error('Erro no initMenu:', e);
  }
}

/* ========= 4) Página de Busca ========= */
document.addEventListener('DOMContentLoaded', () => {
  initMenu();

  const resultsTableBody   = document.getElementById('results-table-body');
  const noResultsMessage   = document.getElementById('no-results-message');
  const logoutButton       = document.getElementById('logout-button');

  const filterBrand        = document.getElementById('filter-brand');
  const filterModel        = document.getElementById('filter-model');
  const filterDefect       = document.getElementById('filter-defect');
  const filterGeneral      = document.getElementById('filter-general');

  const editModal          = document.getElementById('edit-status-modal');
  const modalOsNumber      = document.getElementById('modal-os-number');
  const modalCurrentStatus = document.getElementById('modal-current-status');
  const modalStatusSelect  = document.getElementById('modal-status-select');
  const modalSaveButton    = document.getElementById('modal-save-button');
  const modalCancelButton  = document.getElementById('modal-cancel-button');

  let allServiceOrders = [];
  let currentEditingOrderId = null;

  if (logoutButton) {
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

  const statusOrder   = ['Aberta', 'Aguardando Aprovação', 'Aprovado', 'Em Andamento', 'Concluído', 'Entregue'];
  const finalStatuses = ['Entregue', 'Cancelado'];

  function openEditModal(order) {
    if (!editModal) return;
    currentEditingOrderId = order.id;
    modalOsNumber.textContent = order.numero_ordem ?? '—';
    modalCurrentStatus.textContent = order.status ?? '—';

    modalStatusSelect.innerHTML = '';
    if (finalStatuses.includes(order.status)) {
      modalStatusSelect.innerHTML = '<option>Status finalizado, não pode ser alterado.</option>';
      modalSaveButton.disabled = true;
    } else {
      const currentIndex = statusOrder.indexOf(order.status);
      for (let i = currentIndex + 1; i < statusOrder.length; i++) {
        const opt = document.createElement('option');
        opt.value = statusOrder[i];
        opt.textContent = statusOrder[i];
        modalStatusSelect.appendChild(opt);
      }
      const cancelOpt = document.createElement('option');
      cancelOpt.value = 'Cancelado';
      cancelOpt.textContent = 'Cancelado';
      modalStatusSelect.appendChild(cancelOpt);
      modalSaveButton.disabled = false;
    }
    editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    if (!editModal) return;
    editModal.classList.add('hidden');
    currentEditingOrderId = null;
  }

  async function saveStatusChange() {
    if (!modalStatusSelect || !currentEditingOrderId) return;
    const newStatus = modalStatusSelect.value;
    if (!newStatus) return;

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
      await fetchOrders();
    }
    modalSaveButton.disabled = false;
    modalSaveButton.innerHTML = 'Salvar Alterações';
    closeEditModal();
  }

  if (modalCancelButton) modalCancelButton.addEventListener('click', closeEditModal);
  if (modalSaveButton)   modalSaveButton.addEventListener('click', saveStatusChange);

  if (resultsTableBody) {
    resultsTableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.edit-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      const order = allServiceOrders.find(o => String(o.id) === String(id));
      if (order) openEditModal(order);
    });
  }

  function renderResults(orders) {
    if (!resultsTableBody || !noResultsMessage) return;

    resultsTableBody.innerHTML = '';
    if (!orders.length) {
      noResultsMessage.textContent = 'Nenhuma ordem de serviço encontrada.';
      noResultsMessage.classList.remove('hidden');
      return;
    }
    noResultsMessage.classList.add('hidden');

    orders.forEach(order => {
      const tr = document.createElement('tr');
      const statusColor = getStatusColor(order.status);
      const entrada = order.data_entrada
        ? new Date(order.data_entrada).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
        : '—';

      tr.innerHTML = `
        <td>${order.numero_ordem ?? '—'}</td>
        <td>${entrada}</td>
        <td><span class="status-badge ${statusColor}">${order.status ?? '—'}</span></td>
        <td>${order.cliente ?? '—'}</td>
        <td>${order.marca_aparelho ?? '—'}</td>
        <td>${order.modelo_aparelho ?? '—'}</td>
        <td>
          <button data-id="${order.id}" class="edit-btn text-blue-600 hover:text-blue-800" title="Editar Status">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      `;
      resultsTableBody.appendChild(tr);
    });
  }

  function applyFilters() {
    const brand   = (filterBrand?.value   || '').toLowerCase();
    const model   = (filterModel?.value   || '').toLowerCase();
    const defect  = (filterDefect?.value  || '').toLowerCase();
    const general = (filterGeneral?.value || '').toLowerCase();

    const filtered = allServiceOrders.filter(order => {
      const matchesBrand   = brand   ? (order.marca_aparelho   || '').toLowerCase().includes(brand)   : true;
      const matchesModel   = model   ? (order.modelo_aparelho  || '').toLowerCase().includes(model)   : true;
      const matchesDefect  = defect  ? (order.defeito_reclamado|| '').toLowerCase().includes(defect)  : true;
      const matchesGeneral = general ? ((order.numero_ordem || '').toString().toLowerCase().includes(general)
                                     || (order.cliente || '').toLowerCase().includes(general)) : true;
      return matchesBrand && matchesModel && matchesDefect && matchesGeneral;
    });

    renderResults(filtered);
  }

  [filterBrand, filterModel, filterDefect, filterGeneral].forEach(el => {
    if (el) el.addEventListener('input', applyFilters);
  });

  async function fetchOrders() {
    if (noResultsMessage) {
      noResultsMessage.textContent = 'Buscando dados...';
      noResultsMessage.classList.remove('hidden');
    }

    const { data, error } = await supabase
      .from('ordens_de_servico')
      .select('*')
      .order('data_entrada', { ascending: false });

    if (error) {
      console.error(error);
      if (noResultsMessage) noResultsMessage.textContent = `Erro ao buscar dados: ${error.message}`;
      return;
    }

    allServiceOrders = data || [];
    renderResults(allServiceOrders);
  }

  fetchOrders();
});
