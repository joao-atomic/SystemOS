// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, onSnapshot, collection, query, deleteDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- ATENÇÃO ---
// As variáveis __firebase_config, __app_id e __initial_auth_token são injetadas pelo ambiente do Canvas.
// Se você for hospedar este projeto fora do Canvas, precisará substituir os valores abaixo
// pelos dados reais do seu projeto no Firebase.
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
const osForm = document.getElementById('os-form');
const osTableBody = document.getElementById('os-table-body');
const osNumberInput = document.getElementById('os-number');
const entryDateInput = document.getElementById('entry-date');
const searchInput = document.getElementById('search-input');
const viewModal = document.getElementById('view-modal');
const modalContent = document.getElementById('modal-content');
const closeModalButton = document.getElementById('close-modal-button');
const printButton = document.getElementById('print-button');
const modalStatusUpdate = document.getElementById('modal-status-update');
const updateStatusButton = document.getElementById('update-status-button');

let allServiceOrders = []; // Cache local para a busca
let currentEditingOrderId = null; // ID da OS sendo editada no modal

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

// Renderiza a tabela
function renderTable(ordersToRender) {
    osTableBody.innerHTML = '';
    if (!ordersToRender || ordersToRender.length === 0) {
        osTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Nenhuma ordem de serviço encontrada.</td></tr>';
        return;
    }
    // Ordena por número da OS, do mais novo para o mais antigo
    ordersToRender.sort((a, b) => b.osNumber - a.osNumber);

    ordersToRender.forEach(order => {
        const row = document.createElement('tr');
        const statusColor = getStatusColor(order.status);
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.osNumber}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(order.entryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.clientName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.object} ${order.deviceModel}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span class="status-badge ${statusColor}">${order.status}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900" data-id="${order.id}" data-action="view"><i class="fas fa-eye"></i></button>
                <button class="text-red-600 hover:text-red-900 ml-4" data-id="${order.id}" data-action="delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        osTableBody.appendChild(row);
    });
}

// Função para obter o próximo número de OS
async function getNextOsNumber() {
    const counterRef = doc(db, `artifacts/${appId}/public/data/counters`, "os_counter");
    let nextNumber;
    try {
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            if (!counterDoc.exists()) {
                nextNumber = 23739; // Número inicial
                transaction.set(counterRef, { lastNumber: nextNumber });
            } else {
                nextNumber = counterDoc.data().lastNumber + 1;
                transaction.update(counterRef, { lastNumber: nextNumber });
            }
        });
        osNumberInput.value = nextNumber;
    } catch (e) {
        console.error("Transaction failed: ", e);
        osNumberInput.value = "Erro";
    }
}

// Autenticação e carregamento inicial
onAuthStateChanged(auth, user => {
    if (user) {
        console.log("Usuário autenticado:", user.uid);
        const osCollectionRef = collection(db, `artifacts/${appId}/public/data/service_orders`);
        onSnapshot(query(osCollectionRef), (snapshot) => {
            allServiceOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTable(allServiceOrders);
        });
        getNextOsNumber();
    } else {
        console.log("Usuário não autenticado, tentando login...");
         if (initialAuthToken) {
            signInWithCustomToken(auth, initialAuthToken).catch(error => console.error("Erro no login com token:", error));
        } else {
            signInAnonymously(auth).catch(error => console.error("Erro no login anônimo:", error));
        }
    }
});

// Salvar nova OS
osForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const osCollectionRef = collection(db, `artifacts/${appId}/public/data/service_orders`);
    
    try {
        await addDoc(osCollectionRef, {
            osType: document.getElementById('os-type').value,
            osNumber: parseInt(osNumberInput.value),
            entryDate: document.getElementById('entry-date').value,
            status: document.getElementById('order-status').value,
            clientName: document.getElementById('client-name').value,
            clientPhone: document.getElementById('client-phone').value,
            clientAddress: document.getElementById('client-address').value,
            object: document.querySelector('input[name="object"]:checked')?.value || 'Não especificado',
            deviceModel: document.getElementById('device-model').value,
            deviceSerial: document.getElementById('device-serial').value,
            deviceDefect: document.getElementById('device-defect').value,
            accessories: document.querySelector('input[name="accessories"]:checked')?.value || 'Não',
            condition: document.querySelector('input[name="condition"]:checked')?.value || 'Não especificado',
            totalValue: document.getElementById('total-value').value,
            downPayment: document.getElementById('down-payment').value,
            createdAt: serverTimestamp()
        });
        osForm.reset();
        document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
        getNextOsNumber();
    } catch (error) {
        console.error("Erro ao adicionar documento: ", error);
        alert("Falha ao salvar a ordem de serviço. Tente novamente.");
    }
});

// Ações da tabela (Ver/Deletar)
osTableBody.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;
    const docRef = doc(db, `artifacts/${appId}/public/data/service_orders`, id);

    if (action === 'delete') {
        // Usando um modal customizado em vez de window.confirm
        if (confirm('Tem certeza que deseja excluir esta ordem de serviço?')) {
            try {
                await deleteDoc(docRef);
            } catch (error) {
                 console.error("Erro ao deletar documento: ", error);
            }
        }
    } else if (action === 'view') {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            showModal(docSnap.data(), id);
        }
    }
});

function showModal(orderData, orderId) {
    currentEditingOrderId = orderId;
    const restValue = (parseFloat(orderData.totalValue || 0) - parseFloat(orderData.downPayment || 0)).toFixed(2);
    
    modalContent.innerHTML = `
        <div class="border-b pb-4 mb-4">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-lg">${orderData.osType}</h4>
                    <p class="font-bold text-xl text-red-600">Nº ${orderData.osNumber}</p>
                </div>
                <div class="text-right">
                    <p><span class="font-bold">Data da Entrada:</span> ${new Date(orderData.entryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-2 gap-x-8 gap-y-2">
            <p><span class="font-bold">Cliente:</span> ${orderData.clientName}</p>
            <p><span class="font-bold">Telefone:</span> ${orderData.clientPhone}</p>
            <p class="col-span-2"><span class="font-bold">Endereço:</span> ${orderData.clientAddress || 'Não informado'}</p>
        </div>
        <div class="border-t mt-4 pt-4">
            <p><span class="font-bold">Objeto:</span> ${orderData.object}</p>
            <p><span class="font-bold">Modelo:</span> ${orderData.deviceModel}</p>
            <p><span class="font-bold">Nº de Série:</span> ${orderData.deviceSerial || 'Não informado'}</p>
            <p><span class="font-bold">Defeito:</span> ${orderData.deviceDefect}</p>
            <p><span class="font-bold">Acessórios:</span> ${orderData.accessories}</p>
            <p><span class="font-bold">Estado do Aparelho:</span> ${orderData.condition}</p>
        </div>
        <div class="border-t mt-4 pt-4 text-right">
            <p><span class="font-bold">Valor Total:</span> R$ ${parseFloat(orderData.totalValue || 0).toFixed(2)}</p>
            <p><span class="font-bold">Sinal R$:</span> R$ ${parseFloat(orderData.downPayment || 0).toFixed(2)}</p>
            <p class="font-bold text-lg"><span class="font-bold">Resta R$:</span> R$ ${restValue}</p>
        </div>
         <div class="border-t mt-4 pt-4">
            <p class="text-xs text-center font-semibold text-red-600">OBS.: O aparelho não retirado no prazo de 90 dias, será vendido para pagamento do conserto.</p>
            <div class="flex justify-between mt-8">
                <div class="text-center w-1/2"><p class="border-t border-gray-400 mx-8 mt-8"></p><p>Assinatura do Cliente</p></div>
                <div class="text-center w-1/2"><p class="border-t border-gray-400 mx-8 mt-8"></p><p>Eletrônica J. Oliveira</p></div>
            </div>
        </div>
    `;
    modalStatusUpdate.value = orderData.status;
    viewModal.classList.remove('hidden');
}

// Atualizar status
updateStatusButton.addEventListener('click', async () => {
    if (!currentEditingOrderId) return;
    const docRef = doc(db, `artifacts/${appId}/public/data/service_orders`, currentEditingOrderId);
    try {
        await setDoc(docRef, { status: modalStatusUpdate.value }, { merge: true });
        viewModal.classList.add('hidden');
        currentEditingOrderId = null;
    } catch (error) {
        console.error("Erro ao atualizar status: ", error);
    }
});

// Fechar modal
closeModalButton.addEventListener('click', () => {
    viewModal.classList.add('hidden');
    currentEditingOrderId = null;
});

// Imprimir
printButton.addEventListener('click', () => window.print());

// Busca
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredOrders = allServiceOrders.filter(order => 
        order.clientName.toLowerCase().includes(searchTerm) ||
        String(order.osNumber).includes(searchTerm) ||
        order.object.toLowerCase().includes(searchTerm) ||
        order.deviceModel.toLowerCase().includes(searchTerm)
    );
    renderTable(filteredOrders);
});

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
});
