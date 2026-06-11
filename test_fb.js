const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "bustrack-d929f",
  appId: "1:610161394232:web:b52075a6a8922b2d721ccd",
  databaseURL: "https://bustrack-d929f-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "bustrack-d929f.firebasestorage.app",
  apiKey: "AIzaSyBcv1MNA2p3JX2bIku2J5n36Kui-QKD_bM",
  authDomain: "bustrack-d929f.firebaseapp.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    const docRef = await addDoc(collection(db, "upranko_test"), { test: true });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

test();
