// Funções de ordens de serviço
import { db } from './firebase.js';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const osCollection = collection(db, 'service_orders');

export async function addServiceOrder(data) {
    return addDoc(osCollection, data);
}

export async function getServiceOrders() {
    const snapshot = await getDocs(osCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteServiceOrder(id) {
    const ref = doc(db, 'service_orders', id);
    return deleteDoc(ref);
}

export async function updateServiceOrder(id, data) {
    const ref = doc(db, 'service_orders', id);
    return updateDoc(ref, data);
}
