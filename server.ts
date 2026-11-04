import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Parse CLI --port argument or default to 3000
const args = process.argv.slice(2);
const portArgIndex = args.indexOf('--port');
const cliPort = portArgIndex !== -1 && args[portArgIndex + 1] ? Number(args[portArgIndex + 1]) : null;
const PORT = cliPort || 3000;

// Body parser for JSON with large payload for base64 images (50mb to prevent 413)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Express JSON error middleware to prevent HTML error pages
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error("Middleware body parser error:", err.message);
    if (err.type === "entity.too.large") {
      return res.status(413).json({
        success: false,
        error: "ফাইলের আকার অতিরিক্ত বড়। অনুগ্রহ করে ২৫ এমবির নিচের ফাইল ব্যবহার করুন।",
      });
    }
    return res.status(400).json({
      success: false,
      error: "অবৈধ ডেটা ফরম্যাট।",
    });
  }
  next();
});

// Serve static fonts directly from public/fonts
app.get('/fonts/OratorStd.woff', (req, res) => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), 'public/fonts/OratorStd.woff'),
      '/public/fonts/OratorStd.woff',
      '/app/applet/public/fonts/OratorStd.woff'
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'font/woff');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(fs.readFileSync(p));
      }
    }
  } catch (err) {
    console.error('Error serving font:', err);
  }
  res.status(404).send('Font not found');
});

// Server-side Gemini client (with dynamic key lookup)
function getFallbackKey(): string | null {
  try {
    const procPaths = ["/proc/1/environ", "/proc/self/environ"];
    for (const p of procPaths) {
      if (fs.existsSync(p)) {
        const envStr = fs.readFileSync(p, "utf8");
        const match = envStr.split("\0").find((s) => s.startsWith("GEMINI_API_KEY="));
        if (match) {
          const val = match.split("=")[1];
          if (val) return val;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || getFallbackKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Passport Extraction API using Gemini with automatic fallback and retry
app.post("/api/extract-passport", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "Missing imageBase64 in request body." });
    }

    const ai = getAIClient();
    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    const prompt = `You are a world-class OCR and international passport inspection expert specializing in Asian and Middle Eastern immigration documents, specifically for Kuwait Ministry of Interior (MOI) eVisa issuance.

Analyze this passport image / scan / document with extreme accuracy. Follow these strict rules:

1. NAME EXTRACTION (CRITICAL REQUIREMENT):
   The user explicitly requires BOTH the applicant's Given Name AND Surname, PLUS Father's Name.
   - BANGLADESH PASSPORT SPECIFIC RULES:
     * In Bangladesh passports, 'Surname / বংশগত নাম' is printed first (e.g. 'HUDA'), and 'Given Name / প্রদত্ত নাম' is printed second right below it (e.g. 'NAZMUL').
     * If the top page (Personal Data and Emergency Contact) is visible, check 'Name:' which states 'NAZMUL HUDA' and 'Father's Name:' which states 'JAMIR UDDIN'.
     * In MRZ Line 1: 'P<BGDHUDA<<NAZMUL<<<<<' -> The part before '<<' is Surname ('HUDA'), and after '<<' is Given Name ('NAZMUL').
     * YOU MUST NEVER OMIT OR DROP THE GIVEN NAME!
     * 'givenName': MUST BE 'NAZMUL' (or applicant's given name).
     * 'surname': MUST BE 'HUDA' (or applicant's surname).
     * 'fatherName': MUST BE 'JAMIR UDDIN' (or applicant's father name).
     * 'fullNameEnglish': MUST BE THE FULL COMBINED NAME: Given Name + Surname + Father's Name (e.g. 'NAZMUL HUDA JAMIR UDDIN').
   - 'fullNameArabic': Formally translate/transliterate the full name into Arabic script (e.g. 'নাظم الهدى ضمير الدين' or 'محمد صديق الرحمن إسلام محمد عبد الغفار').

2. DATES (STRICT YYYY-MM-DD FORMAT - CRITICAL):
   - 'passportIssueDate': Look at 'Date of Issue / প্রদানের তারিখ' (e.g. '29 OCT 2026' -> MUST be '2026-10-29'). NEVER leave empty!
   - 'passportExpiryDate': Look at 'Date of Expiry / মেয়াদোত্তীর্ণের তারিখ' (e.g. '28 OCT 2036' -> MUST be '2036-10-28'). NEVER leave empty! Cross-check with MRZ Line 2 chars 21-26 (e.g. '361028' -> '2036-10-28').
   - 'dateOfBirth': Look at 'Date of Birth / জন্ম তারিখ' (e.g. '18 DEC 1978' -> MUST be '1978-12-18'). Cross-check with MRZ Line 2 chars 13-18 ('781218' -> '1978-12-18').

3. MRZ (MACHINE READABLE ZONE) GROUND TRUTH VERIFICATION:
   - Check the 2-line MRZ at the bottom of the passport bio-page (each line is 44 characters starting with P<... and 2nd line starting with the passport number).
   - Line 1 contains: P<[CountryCode][Surname]<<[GivenNames] (e.g. P<BGDHUDA<<NAZMUL<<<<<<<<<<<<<<<<<<<<<<<<<<<<<)
   - Line 2 contains: [PassportNumber][Check][Nationality][DOB YYMMDD][Check][Sex][Expiry YYMMDD][Check][PersonalNo]... (e.g. A099667418BGD7812189M36102841032916650<<<<<74)
   - Extract 'mrzLine1' and 'mrzLine2' exactly if visible.

4. PASSPORT NUMBER ACCURACY:
   - Carefully verify every digit and letter (e.g. 'A09966741' or 'A16807009').

5. GENDER & NATIONALITY:
   - 'sex': 'M' for Male, 'F' for Female.
   - 'sexArabic': 'ذكر' or 'أنثى'.
   - 'nationalityEnglish': 'BANGLADESH', etc.
   - 'nationalityArabic': 'بنغلاديش', etc.
   - 'placeOfBirth': e.g. 'MEHERPUR', 'DHAKA', etc.
   - 'personalNumber': e.g. '1032916650'.
   - 'passportType': 'عادي'.

Return strictly conforming JSON without markdown blocks.`;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        fullNameEnglish: { type: Type.STRING, description: "Full name in English in uppercase including Given Name + Surname + Father's Name" },
        fullNameArabic: { type: Type.STRING, description: "Full name translated/transliterated into formal Arabic script" },
        givenName: { type: Type.STRING, description: "Applicant given name / first name(s)" },
        surname: { type: Type.STRING, description: "Applicant surname / family name" },
        fatherName: { type: Type.STRING, description: "Father's full name" },
        motherName: { type: Type.STRING, description: "Mother's full name if present" },
        passportNumber: { type: Type.STRING, description: "Passport number verified against MRZ line 2" },
        dateOfBirth: { type: Type.STRING, description: "YYYY-MM-DD" },
        sex: { type: Type.STRING, description: "M or F" },
        sexArabic: { type: Type.STRING, description: "ذكر or أنثى" },
        nationalityEnglish: { type: Type.STRING, description: "e.g. BANGLADESH" },
        nationalityArabic: { type: Type.STRING, description: "e.g. بنغلاديش" },
        passportIssueDate: { type: Type.STRING, description: "YYYY-MM-DD" },
        passportExpiryDate: { type: Type.STRING, description: "YYYY-MM-DD" },
        passportType: { type: Type.STRING, description: "e.g. عادي" },
        placeOfBirth: { type: Type.STRING, description: "District / City of birth" },
        personalNumber: { type: Type.STRING, description: "NID or personal number" },
        mrzLine1: { type: Type.STRING, description: "44-character MRZ line 1 if visible" },
        mrzLine2: { type: Type.STRING, description: "44-character MRZ line 2 if visible" },
      },
      required: [
        "fullNameEnglish",
        "passportNumber",
        "dateOfBirth",
        "sex",
        "nationalityEnglish",
      ],
    };

    // Prioritize gemini-3.1-flash-lite for ultra-fast (2-4s) vision OCR without thinking latency,
    // followed by gemini-3.8-flash with ThinkingLevel.LOW as robust fallback
    const candidateModels = [
      { name: "gemini-3.1-flash-lite", config: {} },
      { name: "gemini-3.8-flash", config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } },
      { name: "gemini-flash-latest", config: {} },
    ];

    let lastError: any = null;
    let extractedText = "";

    for (const candidate of candidateModels) {
      const model = candidate.name;
      try {
        console.log(`Attempting passport OCR with model ${model}...`);
        
        const apiCallPromise = ai.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: mimeType.includes("pdf") ? "application/pdf" : mimeType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: schemaConfig,
            ...candidate.config,
          },
        });

        // 55-second timeout per candidate model prevents premature cancellation on complex scans
        const perModelTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${model} request exceeded 55s timeout`)), 55000);
        });

        const response = await Promise.race([apiCallPromise, perModelTimeout]);

        if (response.text) {
          extractedText = response.text;
          console.log(`Passport OCR succeeded with model ${model}!`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err?.message || err);
      }
    }

    if (!extractedText) {
      let friendlyError = lastError?.message || "পাসপোর্ট ফাইলটি পড়া সম্ভব হয়নি।";
      try {
        const parsed = JSON.parse(friendlyError);
        if (parsed?.error?.message) {
          friendlyError = parsed.error.message;
        }
      } catch {
        // keep string
      }
      return res.status(500).json({ success: false, error: friendlyError });
    }

    const parsedData = JSON.parse(extractedText);

    // Helper: Normalize any date format (e.g. '29 OCT 2026', '28 OCT 2036', '781218', '29/10/2026') to strict YYYY-MM-DD
    const normalizeServerDate = (input: string | undefined): string => {
      if (!input) return "";
      const trimmed = input.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

      const monthMap: Record<string, string> = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
        JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
      };

      // Match '29 OCT 2026' or '29-OCT-2026'
      const textMatch = trimmed.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3,})[\s\-/.](20\d{2}|19\d{2})$/);
      if (textMatch) {
        const day = textMatch[1].padStart(2, "0");
        const mon = monthMap[textMatch[2].substring(0, 3).toUpperCase()];
        const year = textMatch[3];
        if (mon) return `${year}-${mon}-${day}`;
      }

      // Match 'OCT 29 2026'
      const textMatch2 = trimmed.match(/^([A-Za-z]{3,})[\s\-/.](d{1,2})[\s\-/.](20\d{2}|19\d{2})$/);
      if (textMatch2) {
        const mon = monthMap[textMatch2[1].substring(0, 3).toUpperCase()];
        const day = textMatch2[2].padStart(2, "0");
        const year = textMatch2[3];
        if (mon) return `${year}-${mon}-${day}`;
      }

      // Match DD/MM/YYYY or DD-MM-YYYY
      const numMatch = trimmed.match(/^(\d{1,2})[\s\-/.](d{1,2})[\s\-/.](20\d{2}|19\d{2})$/);
      if (numMatch) {
        const day = numMatch[1].padStart(2, "0");
        const mon = numMatch[2].padStart(2, "0");
        const year = numMatch[3];
        return `${year}-${mon}-${day}`;
      }

      // Match MRZ 6-digit YYMMDD
      if (/^\d{6}$/.test(trimmed)) {
        const yy = parseInt(trimmed.substring(0, 2), 10);
        const mm = trimmed.substring(2, 4);
        const dd = trimmed.substring(4, 6);
        const currentYY = new Date().getFullYear() % 100;
        const year = yy > currentYY + 20 ? `19${trimmed.substring(0, 2)}` : `20${trimmed.substring(0, 2)}`;
        return `${year}-${mm}-${dd}`;
      }

      return trimmed;
    };

    // Deterministic MRZ Cross-Validation
    let mrz1 = (parsedData.mrzLine1 || "").toUpperCase().replace(/\s+/g, "");
    let mrz2 = (parsedData.mrzLine2 || "").toUpperCase().replace(/\s+/g, "");

    // If MRZ Line 1 is present, extract Surname & Given Name
    // Format: P<BGDHUDA<<NAZMUL<<<<<<<<<<<<<<<
    if (mrz1 && mrz1.startsWith("P<")) {
      const match = mrz1.match(/^P<[A-Z]{3}([A-Z0-9]+)<<([A-Z0-9<]+)/);
      if (match) {
        const surnameFromMrz = match[1].replace(/</g, " ").trim();
        const givenFromMrz = match[2].replace(/</g, " ").trim();
        if (!parsedData.surname) parsedData.surname = surnameFromMrz;
        if (!parsedData.givenName || parsedData.givenName === parsedData.surname) {
          parsedData.givenName = givenFromMrz;
        }
      }
    }

    // If MRZ Line 2 is present, extract Passport No, DOB, Sex, Expiry Date, Personal No
    // Format: A099667418BGD7812189M36102841032916650<<<<<74 (44 chars)
    if (mrz2 && mrz2.length >= 28) {
      const mrzPass = mrz2.substring(0, 9).replace(/</g, "");
      if (!parsedData.passportNumber && mrzPass) parsedData.passportNumber = mrzPass;

      const mrzDob = mrz2.substring(13, 19);
      if (!parsedData.dateOfBirth && /^\d{6}$/.test(mrzDob)) {
        const yy = parseInt(mrzDob.substring(0, 2), 10);
        const mm = mrzDob.substring(2, 4);
        const dd = mrzDob.substring(4, 6);
        const year = yy > 30 ? `19${mrzDob.substring(0, 2)}` : `20${mrzDob.substring(0, 2)}`;
        parsedData.dateOfBirth = `${year}-${mm}-${dd}`;
      }

      const mrzSex = mrz2.charAt(20);
      if (!parsedData.sex && (mrzSex === "M" || mrzSex === "F")) {
        parsedData.sex = mrzSex;
      }

      const mrzExp = mrz2.substring(21, 27);
      if ((!parsedData.passportExpiryDate || !parsedData.passportExpiryDate.includes("-")) && /^\d{6}$/.test(mrzExp)) {
        const yy = mrzExp.substring(0, 2);
        const mm = mrzExp.substring(2, 4);
        const dd = mrzExp.substring(4, 6);
        parsedData.passportExpiryDate = `20${yy}-${mm}-${dd}`;
      }

      const mrzPersonal = mrz2.substring(28).split("<")[0].trim();
      if (!parsedData.personalNumber && mrzPersonal) {
        parsedData.personalNumber = mrzPersonal;
      }
    }

    // Normalize dates
    parsedData.dateOfBirth = normalizeServerDate(parsedData.dateOfBirth);
    parsedData.passportIssueDate = normalizeServerDate(parsedData.passportIssueDate);
    parsedData.passportExpiryDate = normalizeServerDate(parsedData.passportExpiryDate);

    // Normalize and clean extracted fields
    const given = (parsedData.givenName || "").toUpperCase().trim();
    const surname = (parsedData.surname || "").toUpperCase().trim();
    const father = (parsedData.fatherName || "").toUpperCase().trim();
    
    // Ensure fullNameEnglish has BOTH Given Name and Surname and Father's Name
    let fullEng = (parsedData.fullNameEnglish || "").toUpperCase().trim();
    
    // User Requirement: "নাম এবং বাবার নাম সম্পূর্ন থাকবে given name and surname দুটোই"
    // (e.g. NAZMUL HUDA JAMIR UDDIN)
    if (given && surname) {
      if (!fullEng.includes(given) || !fullEng.includes(surname)) {
        fullEng = [given, surname, father].filter(Boolean).join(" ");
      }
    } else if (given && !fullEng.includes(given)) {
      fullEng = `${given} ${fullEng}`.trim();
    } else if (surname && !fullEng.includes(surname)) {
      fullEng = `${fullEng} ${surname}`.trim();
    }

    if (father && !fullEng.includes(father)) {
      fullEng = `${fullEng} ${father}`.trim();
    }

    fullEng = fullEng.replace(/\s+/g, " ").trim();
    if (fullEng) {
      parsedData.fullNameEnglish = fullEng;
    }

    // Clean passport number (trim spaces, uppercase)
    if (parsedData.passportNumber) {
      parsedData.passportNumber = parsedData.passportNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

        return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Passport extraction error:", error);
    let msg = error?.message || "Failed to process passport image with Gemini AI.";
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // keep string
    }
    return res.status(500).json({
      success: false,
      error: msg,
    });
  }
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In AI Studio preview environment, HMR is disabled per environment constraints
    if (process.env.DISABLE_HMR === undefined) {
      process.env.DISABLE_HMR = 'true';
    }
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
