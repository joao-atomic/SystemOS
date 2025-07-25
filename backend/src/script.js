// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, collection, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Lógica de Proteção de Página ---
function checkAuth() {
    if (localStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'login.html';
    } else {
        // Apenas mostra o container se o elemento existir na página
        const appContainer = document.getElementById('app-container');
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
    }
}
checkAuth(); // Verifica a autenticação assim que o script é carregado

// --- ATENÇÃO ---
// As variáveis __firebase_config, __app_id e __initial_auth_token são injetadas pelo ambiente.
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

// --- Lógica Principal da Aplicação ---
// Garante que o DOM está completamente carregado antes de executar o código
document.addEventListener('DOMContentLoaded', () => {
    
    // Só executa o código se estivermos na página principal (index.html)
    const osForm = document.getElementById('os-form');
    if (!osForm) {
        return; // Se não encontrar o formulário, para a execução (estamos em outra página)
    }

    // Elementos do DOM da página principal
    const osNumberInput = document.getElementById('os-number');
    const entryDateInput = document.getElementById('entry-date');
    const logoutButton = document.getElementById('logout-button');
    const submitButton = osForm.querySelector('button[type="submit"]');

    // Desabilita o botão de salvar inicialmente e mostra o status de carregamento
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Carregando Nº da O.S...';

    // Define a data atual no campo de data
    entryDateInput.value = new Date().toISOString().split('T')[0];

    // Função de Logout
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'login.html';
    });

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
            // SUCESSO: Habilita o botão de salvar
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Ordem de Serviço';

        } catch (e) {
            console.error("Falha na transação para obter o número da O.S.: ", e);
            osNumberInput.value = "Erro";
            // FALHA: Mantém o botão desabilitado e exibe mensagem de erro
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-exclamation-circle mr-2"></i> Falha ao carregar';
            
            // Adiciona uma mensagem de erro visível para o usuário
            let errorDiv = document.getElementById('os-number-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = 'os-number-error';
                errorDiv.className = 'text-red-500 text-xs mt-1';
                // Insere a mensagem de erro logo após o campo de input
                osNumberInput.parentNode.appendChild(errorDiv);
            }
            errorDiv.textContent = 'Não foi possível obter o Nº da O.S. Recarregue a página.';
        }
    }

    // Autenticação e carregamento inicial do Firebase
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("Usuário autenticado no Firebase:", user.uid);
            getNextOsNumber();
        } else {
            console.log("Usuário não autenticado no Firebase, tentando login...");
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

        // Validação para garantir que o número da OS é válido
        if (osNumberInput.value === "Erro" || isNaN(parseInt(osNumberInput.value))) {
            alert("Não foi possível obter um número de O.S. válido. Por favor, recarregue a página.");
            return;
        }

        const osCollectionRef = collection(db, `artifacts/${appId}/public/data/service_orders`);
        
        try {
            // Desabilita o botão durante o salvamento para evitar cliques duplos
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Salvando...';

            await addDoc(osCollectionRef, {
                osType: document.getElementById('os-type').value,
                osNumber: parseInt(osNumberInput.value),
                entryDate: document.getElementById('entry-date').value,
                status: document.getElementById('order-status').value,
                clientName: document.getElementById('client-name').value,
                clientPhone: document.getElementById('client-phone').value,
                clientAddress: document.getElementById('client-address').value,
                customerOrigin: document.querySelector('input[name="customer-origin"]:checked')?.value || 'Não informado',
                object: document.querySelector('input[name="object"]:checked')?.value || 'Não especificado',
                deviceModel: document.getElementById('device-model').value,
                deviceSerial: document.getElementById('device-serial').value,
                deviceDefect: document.getElementById('device-defect').value,
                deviceLocation: document.getElementById('device-location').value,
                accessories: document.querySelector('input[name="accessories"]:checked')?.value || 'Não',
                condition: document.querySelector('input[name="condition"]:checked')?.value || 'Não especificado',
                totalValue: document.getElementById('total-value').value,
                downPayment: document.getElementById('down-payment').value,
                createdAt: serverTimestamp()
            });
            alert("Ordem de Serviço salva com sucesso!");
            osForm.reset();
            document.getElementById('entry-date').value = new Date().toISOString().split('T')[0];
            // Busca o próximo número de O.S. e reabilita o botão
            getNextOsNumber();
        } catch (error) {
            console.error("Erro ao adicionar documento: ", error);
            alert("Falha ao salvar a ordem de serviço. Tente novamente.");
            // Em caso de erro, reabilita o botão
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-save mr-2"></i> Salvar Ordem de Serviço';
        }
    });
});
