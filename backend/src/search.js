// /backend/src/search.js
import { supabase, requireAuth, signOutAndRedirect } from '/backend/src/auth.js';

/* ========= 0) Proteção ========= */
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth(); // protege a página e remove 'hidden'
  document.getElementById('logout-button')?.addEventListener('click', signOutAndRedirect);
});

/* ========= 1) Menu (hambúrguer + overlay) ========= */
function initMenu() {
  try {
    const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay') || document.querySelector('.overlay');
    const buttons = Array.from(document.querySelectorAll('#menu-toggle, .hamburger-btn'));
    if (!sidebar || !overlay || buttons.length === 0) return;

    const setSidebar = (open) => {
      sidebar.classList.toggle('-translate-x-full', !open);
      sidebar.classList.toggle('translate-x-0', open);
      sidebar.classList.toggle('open', open);   // compat CSS antigo
      overlay.classList.toggle('active', open);
      buttons.forEach(b => b.setAttribute('aria-expanded', String(open)));
    };

    const toggleSidebar = () => setSidebar(sidebar.classList.contains('-translate-x-full'));
    const closeSidebar  = () => setSidebar(false);

    setSidebar(false); // estado inicial: fechado (mobile)
    buttons.forEach(btn => btn.addEventListener('click', toggleSidebar));
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
  } catch (e) {
    console.error('Erro no initMenu:', e);
  }
}

/* ========= 2) Utilidades ========= */
const norm = (v) => (v ?? '').toString().trim().toLowerCase();
const sameDay = (d1, d2) => d1.setHours(0,0,0,0) === d2.setHours(0,0,0,0);

/* ========= 3) Página de Busca ========= */
document.addEventListener('DOMContentLoaded', () => {
  initMenu();

  // DOM
  const resultsTableBody   = document.getElementById('results-table-body');
  const noResultsMessage   = document.getElementById('no-results-message');

  // inputs de filtro
  const form               = document.getElementById('search-form');
  const btnSearch          = document.getElementById('search-button');

  const fBrandText         = document.getElementById('filter-brand');
  const fModel             = document.getElementById('filter-model');
  const fDefect            = document.getElementById('filter-defect');
  const fGeneral           = document.getElementById('filter-general');
  const fOs                = document.getElementById('filter-os');
  const fClient            = document.getElementById('filter-client');
  const fPhone             = document.getElementById('filter-phone');
  const fStatus            = document.getElementById('filter-status');
  const fDateFrom          = document.getElementById('filter-date-from');
  const fDateTo            = document.getElementById('filter-date-to');
  const fBrandList         = document.getElementById('filter-brand2');

  // modal de edição
  const editModal          = document.getElementById('edit-status-modal');
  const modalOsNumber      = document.getElementById('modal-os-number');
  const modalCurrentStatus = document.getElementById('modal-current-status');
  const modalStatusSelect  = document.getElementById('modal-status-select');
  const modalSaveButton    = document.getElementById('modal-save-button');
  const modalCancelButton  = document.getElementById('modal-cancel-button');

  let allServiceOrders = [];
  let currentEditingOrderId = null;

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

  modalCancelButton?.addEventListener('click', closeEditModal);
  modalSaveButton  ?.addEventListener('click', saveStatusChange);

  resultsTableBody?.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const order = allServiceOrders.find(o => String(o.id) === String(id));
    if (order) openEditModal(order);
  });

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

  // ---- APLICA FILTROS (só quando enviar o formulário) ----
  function applyFilters() {
    const brandText   = norm(fBrandText?.value);
    const model       = norm(fModel?.value);
    const defect      = norm(fDefect?.value);
    const general     = norm(fGeneral?.value);
    const osNumber    = norm(fOs?.value);
    const client      = norm(fClient?.value);
    const phone       = norm(fPhone?.value);
    const status      = norm(fStatus?.value);
    const brandList   = norm(fBrandList?.value);

    const fromStr     = (fDateFrom?.value || '').trim();
    const toStr       = (fDateTo  ?.value || '').trim();
    const fromDate    = fromStr ? new Date(fromStr) : null;
    const toDate      = toStr   ? new Date(toStr)   : null;

    const filtered = allServiceOrders.filter(order => {
      const oBrand   = norm(order.marca_aparelho);
      const oModel   = norm(order.modelo_aparelho);
      const oDefect  = norm(order.defeito_reclamado);
      const oOs      = norm(order.numero_ordem);
      const oClient  = norm(order.cliente);
      const oPhone   = norm(order.telefone);
      const oStatus  = norm(order.status);

      // texto livres
      const okBrandText = brandText ? oBrand.includes(brandText) : true;
      const okModel     = model     ? oModel.includes(model)     : true;
      const okDefect    = defect    ? oDefect.includes(defect)   : true;
      const okGeneral   = general   ? (oOs.includes(general) || oClient.includes(general)) : true;
      const okOs        = osNumber  ? oOs.includes(osNumber)     : true;
      const okClient    = client    ? oClient.includes(client)   : true;
      const okPhone     = phone     ? oPhone.includes(phone)     : true;

      // selects
      const okStatus    = status    ? oStatus === status         : true;
      const okBrandList = brandList ? oBrand === brandList       : true;

      // datas
      let okDates = true;
      if (fromDate || toDate) {
        if (!order.data_entrada) okDates = false;
        else {
          const d = new Date(order.data_entrada);
          d.setHours(0,0,0,0);
          if (fromDate && d < new Date(fromDate.setHours(0,0,0,0))) okDates = false;
          if (toDate   && d > new Date(toDate.setHours(0,0,0,0)))   okDates = false;
        }
      }

      return okBrandText && okModel && okDefect && okGeneral &&
             okOs && okClient && okPhone && okStatus && okBrandList && okDates;
    });

    renderResults(filtered);
  }

  // Só filtra ao clicar no botão/submit do form
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters();
  });
  btnSearch?.addEventListener('click', (e) => {
    // (não é estritamente necessário, pois o botão já é type="submit")
    e.preventDefault();
    form?.dispatchEvent(new Event('submit', { cancelable: true }));
  });

  // Busca inicial (sem filtros)
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
