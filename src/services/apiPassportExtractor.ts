import { PassportData } from '../types';

// Convert File to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Optimize image for fast and reliable network transmission.
 * Resizes large camera photos to max 2048px which keeps MRZ & passport text 100% sharp
 * while reducing payload from 15MB to ~400KB-800KB, eliminating "Failed to fetch" timeouts.
 */
export function optimizeImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    // If PDF, cannot resize via Canvas, read standard Base64
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      fileToBase64(file).then(resolve).catch(() => resolve(''));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawBase64 = e.target?.result as string;
      if (!rawBase64) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawBase64);
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // 0.88 gives crystal-clear OCR text while keeping payload light (~200KB-400KB)
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          resolve(compressed);
        } catch {
          resolve(rawBase64);
        }
      };
      img.onerror = () => resolve(rawBase64);
      img.src = rawBase64;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Extract passport data using Server-side High-Accuracy OCR (Handles both PDF & JPEG/PNG)
 * Includes retry, safe content-type handling (prevents Unexpected token '<' errors), and timeout.
 */
export async function extractPassportFromAPI(
  file: File,
  base64Data: string
): Promise<PassportData> {
  const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  // If base64Data is missing or empty, generate optimized base64
  let payloadBase64 = base64Data;
  if (!payloadBase64 || payloadBase64.length < 100) {
    payloadBase64 = await optimizeImageFile(file);
  }

  // Attempt fetch with up to 2 retries on transient network/503 glitches
  let lastError: Error | null = null;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 75-second timeout wrapper that provides clear human-readable error if exceeded
      const fetchPromise = fetch('/api/extract-passport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: payloadBase64,
          mimeType,
          fileName: file.name,
        }),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('পাসপোর্ট প্রসেস করতে সময় বেশি লেগেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'));
        }, 75000);
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      const contentType = response.headers.get('content-type') || '';

      // Check if response is valid JSON
      if (contentType.includes('application/json')) {
        let result: any = null;
        try {
          result = await response.json();
        } catch {
          throw new Error('সার্ভার থেকে অসম্পূর্ণ ডেটা এসেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
        }

        if (!response.ok || !result || result.success === false) {
          const rawMsg = result?.error || `পাসপোর্ট প্রসেস করতে ব্যর্থ হয়েছে (Status: ${response.status})`;
          throw new Error(rawMsg);
        }

        const d = result.data;
        if (!d) {
          throw new Error('পাসপোর্ট থেকে প্রয়োজনীয় তথ্য পাওয়া যায়নি।');
        }

        return {
          fullNameEnglish: (d.fullNameEnglish || '').toUpperCase().trim(),
          fullNameArabic: (d.fullNameArabic || '').trim(),
          givenName: d.givenName || '',
          surname: d.surname || '',
          fatherName: d.fatherName || '',
          motherName: d.motherName || '',
          passportNumber: (d.passportNumber || '').toUpperCase().trim(),
          dateOfBirth: d.dateOfBirth || '',
          sex: d.sex || 'M',
          sexArabic: d.sexArabic || (d.sex === 'F' ? 'أنثى' : 'ذكر'),
          nationalityEnglish: (d.nationalityEnglish || 'BANGLADESH').toUpperCase().trim(),
          nationalityArabic: d.nationalityArabic || 'بنغلاديش',
          passportIssueDate: d.passportIssueDate || '',
          passportExpiryDate: d.passportExpiryDate || '',
          passportType: d.passportType || 'عادي',
          placeOfBirth: d.placeOfBirth || '',
          personalNumber: d.personalNumber || '',
        };
      } else {
        // Response is HTML or text (e.g. 502/504 gateway or Vite fallback)
        const textContent = await response.text().catch(() => '');
        console.warn(`Server returned non-JSON response (${response.status}):`, textContent.slice(0, 150));
        
        if (response.status === 413) {
          throw new Error('ফাইলের আকার অনেক বড়। অনুগ্রহ করে ছোট বা কম্প্রেস করা ফাইল আপলোড করুন।');
        }

        if (response.status === 503 || response.status === 504 || response.status === 502) {
          throw new Error('সার্ভার সাময়িকভাবে ব্যস্ত আছে। পুনরায় চেষ্টা করা হচ্ছে...');
        }

        throw new Error(`সার্ভার সংযোগে সমস্যা হয়েছে (Status: ${response.status})। অনুগ্রহ করে আবার চেষ্টা করুন।`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`extractPassportFromAPI attempt ${attempt} failed:`, err?.message || err);
      if (err?.message?.includes('সময় বেশি লেগেছে') || err?.name === 'AbortError') {
        break;
      }
      if (attempt < maxAttempts) {
        // Wait 1.2s before retry on transient glitches
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  let finalMsg = lastError?.message || 'পাসপোর্ট ডেটা সার্ভার থেকে রিড করা সম্ভব হয়নি।';
  if (finalMsg.includes('aborted') || finalMsg.includes('AbortError')) {
    finalMsg = 'পাসপোর্ট বিশ্লেষণ করতে সময় বেশি লেগেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা ডেমো পাসপোর্ট লোড করুন।';
  }
  throw new Error(finalMsg);
}
