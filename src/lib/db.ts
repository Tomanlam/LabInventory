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

const COLLECTION_NAME = 'inventory';

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const items: InventoryItem[] = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() } as InventoryItem);
  });
  return items;
}

export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  const itemRef = doc(db, COLLECTION_NAME, item.id);
  const { id, ...data } = item;
  await updateDoc(itemRef, data);
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<void> {
  await addDoc(collection(db, COLLECTION_NAME), item);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function deleteAllInventory(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const batchRequests: Promise<void>[] = [];
  querySnapshot.forEach((docSnap) => {
    batchRequests.push(deleteDoc(doc(db, COLLECTION_NAME, docSnap.id)));
  });
  await Promise.all(batchRequests);
}

export async function seedInitialData(csvData: string): Promise<void> {
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
        await addDoc(collection(db, COLLECTION_NAME), item);
      }
    } catch (e) {
      console.error('Failed to parse/add row', e);
    }
  });

  await Promise.all(batch);
}
