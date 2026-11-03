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

    const prompt = `You are an expert OCR and passport data extraction specialist for Kuwait eVisa processing.
Analyze this passport image / scan / document carefully.
Extract all relevant passport fields accurately following these strict rules:
1. English Full Name: Must include the applicant's name together with their Father's Name (e.g. If Given Name is 'AL AMIN' and Father's Name is 'ALTA MIAH', the full name MUST be 'AL AMIN ALTA MIAH').
2. Arabic Full Name: Translate / transliterate the full name including Father's name into formal Arabic script (e.g. 'سيفاجول اسلام راجيك شمسود ميا').
3. Given Name (e.g. AL AMIN)
4. Surname (e.g. MIAH)
5. Father's Name (e.g. ALTA MIAH)
6. Mother's Name (e.g. TAJIRUN BEGUM)
7. Passport Number (e.g. A16807009)
8. Date of Birth in strict YYYY-MM-DD format (Year-Month-Day, e.g. 2003-11-01)
9. Sex / Gender: 'M' for Male or 'F' for Female
10. Nationality in English (e.g. 'BANGLADESH')
11. Nationality in Arabic (e.g. 'بنغلاديش')
12. Passport Issue Date in strict YYYY-MM-DD format (Year-Month-Day, e.g. 2024-11-07)
13. Passport Expiry Date in strict YYYY-MM-DD format (Year-Month-Day, e.g. 2034-11-06)
14. Passport Type: 'عادي' (Normal / Ordinary) or as specified on passport
15. Place of Birth: e.g. MOULVIBAZAR
16. Personal No / National ID if present (e.g. 5111728100)

Return the data strictly conforming to the JSON schema.`;

    const schemaConfig = {
      type: Type.OBJECT,
      properties: {
        fullNameEnglish: { type: Type.STRING, description: "Full name in English in uppercase" },
        fullNameArabic: { type: Type.STRING, description: "Full name translated/transliterated into Arabic" },
        givenName: { type: Type.STRING },
        surname: { type: Type.STRING },
        fatherName: { type: Type.STRING },
        motherName: { type: Type.STRING },
        passportNumber: { type: Type.STRING },
        dateOfBirth: { type: Type.STRING, description: "YYYY-MM-DD" },
        sex: { type: Type.STRING, description: "M or F" },
        sexArabic: { type: Type.STRING, description: "ذكر or أنثى" },
        nationalityEnglish: { type: Type.STRING, description: "e.g. BANGLADESH" },
        nationalityArabic: { type: Type.STRING, description: "e.g. بنغلاديش" },
        passportIssueDate: { type: Type.STRING, description: "YYYY-MM-DD" },
        passportExpiryDate: { type: Type.STRING, description: "YYYY-MM-DD" },
        passportType: { type: Type.STRING, description: "e.g. عادي" },
        placeOfBirth: { type: Type.STRING },
        personalNumber: { type: Type.STRING },
      },
      required: [
        "fullNameEnglish",
        "passportNumber",
        "dateOfBirth",
        "sex",
        "nationalityEnglish",
      ],
    };

    // Valid active models in priority order with resilient fallback
    // gemini-3.8-flash is primary, fastest and most accurate for multimodal OCR
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    let lastError: any = null;
    let extractedText = "";

    for (const model of candidateModels) {
      try {
        console.log(`Attempting passport OCR with model ${model}...`);
        
        // 60-second timeout per candidate model so complex documents have sufficient time
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
            ...(model.includes("3.8")
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
          },
        });

        const perModelTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${model} request exceeded 60s timeout`)), 60000);
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
