// src/services/mockData.js
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Robust OCR Parsing Engine
 * Extracts raw text and recursively scans for standalone CPMS tokens anywhere on the label.
 */
export const processParcelOCR = async (photoUri) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: photoUri,
      name: 'parcel_label.jpg',
      type: 'image/jpeg',
    });
    // Using engine 2 for better alphanumeric accuracy with compound strings
    formData.append('apikey', 'helloworld'); 
    formData.append('language', 'eng');
    formData.append('OCREngine', '2'); 

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const jsonResult = await response.json();
    
    if (!jsonResult || !jsonResult.ParsedResults || jsonResult.ParsedResults.length === 0) {
      console.log("OCR failed or returned empty results.");
      return { success: false, cpms: null, studentName: 'Unknown' };
    }

    const extractedText = jsonResult.ParsedResults[0].ParsedText;
    console.log("--- LIVE EXTRACTED TEXT FROM APP SCAN ---");
    console.log(extractedText);
    console.log("-----------------------------------------");

    // ------------------------------------------------------------------
    // 🧠 UPGRADED EXTRACTION LOGIC: Finds CPMS regardless of position
    // ------------------------------------------------------------------
    let detectedCode = null;

    // Clean text: replace line breaks with spaces and split into individual words
    const words = extractedText.replace(/[\r\n]+/g, ' ').split(/\s+/);

    for (let word of words) {
      // Remove symbols or punctuation around the word (like dashes, brackets, colons)
      const cleanWord = word.replace(/[^\w]/g, '').toUpperCase();

      // Look for any standalone word containing "CPMS" followed by numbers
      if (cleanWord.includes('CPMS')) {
        const match = cleanWord.match(/CPMS\d+/);
        if (match) {
          detectedCode = match[0]; // Captures "CPMS101"
          break; 
        }
      }
    }

    // 4. If found, search your cloud Firestore database out of thousands of students
    if (detectedCode) {
      console.log(`Detected valid token code: ${detectedCode}`);
      
      const studentQuery = query(
        collection(db, "students"), 
        where("cpms", "==", detectedCode)
      );
      
      const querySnapshot = await getDocs(studentQuery);
      let matchedName = 'Unregistered Student';
      
      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0].data();
        matchedName = studentDoc.name;
      }

      return {
        success: true,
        cpms: detectedCode,
        studentName: matchedName
      };
    }

    // If no word matched the pattern
    return { success: false, cpms: null, studentName: 'Unknown' };

  } catch (error) {
    console.error("OCR Parse Engine Failure Exception:", error);
    return { success: false, cpms: null, studentName: 'Unknown' };
  }
};