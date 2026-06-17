import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { InventoryItem } from '../types';
import Papa from 'papaparse';

const INVENTORY_COLLECTION = 'inventory';
const CHEMICALS_COLLECTION = 'chemicals';

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
  const items: InventoryItem[] = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() } as InventoryItem);
  });
  return items;
}

export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  const itemRef = doc(db, INVENTORY_COLLECTION, item.id);
  const { id, ...data } = item;
  await updateDoc(itemRef, data);
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
  await addDoc(collection(db, INVENTORY_COLLECTION), item);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
}

export async function deleteAllInventory(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
  const batchRequests: Promise<void>[] = [];
  querySnapshot.forEach((docSnap) => {
    batchRequests.push(deleteDoc(doc(db, INVENTORY_COLLECTION, docSnap.id)));
  });
  await Promise.all(batchRequests);
}

export async function seedInitialData(csvData: string): Promise<void> {
  await seedDataToCollection(csvData, INVENTORY_COLLECTION);
}

export async function getChemicalItems(): Promise<InventoryItem[]> {
  const querySnapshot = await getDocs(collection(db, CHEMICALS_COLLECTION));
  const items: InventoryItem[] = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() } as InventoryItem);
  });
  return items;
}

export async function updateChemicalItem(item: InventoryItem): Promise<void> {
  const itemRef = doc(db, CHEMICALS_COLLECTION, item.id);
  const { id, ...data } = item;
  await updateDoc(itemRef, data);
}

export async function addChemicalItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
  await addDoc(collection(db, CHEMICALS_COLLECTION), item);
}

export async function deleteChemicalItem(id: string): Promise<void> {
  await deleteDoc(doc(db, CHEMICALS_COLLECTION, id));
}

export async function deleteAllChemicals(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, CHEMICALS_COLLECTION));
  const batchRequests: Promise<void>[] = [];
  querySnapshot.forEach((docSnap) => {
    batchRequests.push(deleteDoc(doc(db, CHEMICALS_COLLECTION, docSnap.id)));
  });
  await Promise.all(batchRequests);
}

export async function seedChemicalsData(csvData: string): Promise<void> {
  await seedDataToCollection(csvData, CHEMICALS_COLLECTION);
}

async function seedDataToCollection(csvData: string, targetCollection: string): Promise<void> {
  const result = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  const batch = result.data.map(async (row: any) => {
    try {
      const item: Omit<InventoryItem, 'id'> = {
        name: row['Item Name']?.trim() || '',
        location: row['Location']?.trim() || '',
        quantity: parseFloat(row['Quantity']) || 0,
        units: row['Units']?.trim() || '',
        supplier: row['Supplier']?.trim() || '',
        remark: row['Remark']?.trim() || '',
        price: row['Price']?.trim() || '',
        invoiceNo: row['Invoice No.']?.trim() || '',
        itemCode: row['Item Code']?.trim() || '',
      };
      if (item.name) {
        await addDoc(collection(db, targetCollection), item);
      }
    } catch (e) {
      console.error('Failed to parse/add row', e);
    }
  });

  await Promise.all(batch);
}
