// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, onSnapshot, collection, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    }
}
checkAuth();

// --- ATENÇÃO ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { 
    apiKey: "SEU_API_KEY", 
    authDomain: "SEU_AUTH_DOMAIN", 
    projectId: "SEU_PROJECT_ID", 
    storageBucket: "SEU_STORAGE_BUCKET", 
    messagingSenderId: "SEU_MESSAGING_SENDER_ID", 
    appId: "SEU_APP_ID" 
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Elementos do DOM
const resultsTableBody = document.getElementById('results-table-body');
const noResultsMessage = document.getElementById('no-results-message');
const filterBrand = document.getElementById('filter-brand');
const filterModel = document.getElementById('filter-model');
const filterDefect = document.getElementById('filter-defect');
const filterGeneral = document.getElementById('filter-general');

let allServiceOrders = [];

// Função para obter a cor do status
const getStatusColor = (status) => {
    switch (status) {
        case 'Aberta': return 'bg-green-100 text-green-800';
        case 'Aguardando Aprovação': return 'bg-yellow-100 text-yellow-800';
        case 'Aprovado': return 'bg-blue-100 text-blue-800';
        case 'Em Andamento': return 'bg-indigo-100 text-indigo-800';
        case 'Concluído': return 'bg-purple-100 text-purple-800';
        case 'Entregue': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-200 text-gray-900';
    }
};

// Renderiza a tabela de resultados
function renderResults(orders) {
    resultsTableBody.innerHTML = '';
    
    if (orders.length === 0) {
        noResultsMessage.classList.remove('hidden');
        resultsTableBody.classList.add('hidden');
    } else {
        noResultsMessage.classList.add('hidden');
        resultsTableBody.classList.remove('hidden');
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        const statusColor = getStatusColor(order.status);
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.osNumber}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(order.entryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span class="status-badge ${statusColor}">${order.status}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.object}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.deviceModel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.deviceDefect}</td>
        `;
        resultsTableBody.appendChild(row);
    });
}

// Função para aplicar filtros
function applyFilters() {
    const brand = filterBrand.value.toLowerCase();
    const model = filterModel.value.toLowerCase();
    const defect = filterDefect.value.toLowerCase();
    const general = filterGeneral.value.toLowerCase();

    const filtered = allServiceOrders.filter(order => {
        const matchesBrand = brand ? order.object.toLowerCase().includes(brand) : true;
        const matchesModel = model ? order.deviceModel.toLowerCase().includes(model) : true;
        const matchesDefect = defect ? order.deviceDefect.toLowerCase().includes(defect) : true;
        const matchesGeneral = general ? 
            (order.osNumber.toString().includes(general) || order.clientName.toLowerCase().includes(general)) 
            : true;
        
        return matchesBrand && matchesModel && matchesDefect && matchesGeneral;
    });

    renderResults(filtered);
}

// Adiciona event listeners para os campos de filtro
[filterBrand, filterModel, filterDefect, filterGeneral].forEach(input => {
    input.addEventListener('keyup', applyFilters);
});

// Carregamento inicial dos dados
onAuthStateChanged(auth, user => {
    if (user) {
        const osCollectionRef = collection(db, `artifacts/${appId}/public/data/service_orders`);
        onSnapshot(query(osCollectionRef), (snapshot) => {
            allServiceOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordena mais recentes primeiro por padrão
            allServiceOrders.sort((a, b) => b.osNumber - a.osNumber);
            renderResults(allServiceOrders); // Exibe todos os resultados inicialmente
        });
    } else {
        if (initialAuthToken) {
            signInWithCustomToken(auth, initialAuthToken).catch(error => console.error("Erro no login com token:", error));
        } else {
            signInAnonymously(auth).catch(error => console.error("Erro no login anônimo:", error));
        }
    }
});
