import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import path from "path";
import axios from "axios";
import admin from "firebase-admin";

dotenv.config();

// Lazy Firebase Admin Initialization
let firebaseAdmin: admin.app.App | null = null;

function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        serviceAccountJson = serviceAccountJson.trim();
        // Handle cases where the string might be double-wrapped in quotes
        if (serviceAccountJson.startsWith('"') && serviceAccountJson.endsWith('"')) {
          serviceAccountJson = serviceAccountJson.slice(1, -1).replace(/\\"/g, '"');
        }
        
        const serviceAccount = JSON.parse(serviceAccountJson);
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
      } catch (error) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Ensure it is a valid JSON string.");
        console.error("Error details:", error);
      }
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT not found. Firebase features will be disabled.");
    }
  }
  return firebaseAdmin;
}

const db = new Database("intelligence.db");

// Helper for exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Retry on 503 (Service Unavailable) or 429 (Too Many Requests)
      const status = error.status || (error.response && error.response.status);
      const message = error.message?.toLowerCase() || "";
      
      if (status === 503 || status === 429 || 
          message.includes("503") || 
          message.includes("429") || 
          message.includes("demand") || 
          message.includes("rate exceeded") ||
          message.includes("quota")) {
        
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API busy or rate limited (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    query TEXT,
    context TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  getFirebaseAdmin();

  app.use(express.json({ limit: '50mb' }));

  // Auth Routes (Real Google OAuth)
  app.get("/api/auth/google/url", (req, res) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");
    if (!appUrl) {
      console.error("OAuth Error: APP_URL environment variable is not set.");
      return res.status(500).json({ error: "APP_URL environment variable is not set." });
    }

    const redirectUri = `${appUrl}/auth/google/callback`;
    console.log("Initiating Google OAuth with redirect_uri:", redirectUri);

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID environment variable is not set." });
    }

    const options = {
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
    const code = req.query.code as string;
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${appUrl}/auth/google/callback`,
        grant_type: "authorization_code",
      });

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const googleUser = userResponse.data;

      // Save/Update user in DB
      const stmt = db.prepare("INSERT OR REPLACE INTO users (id, name, email, avatar) VALUES (?, ?, ?, ?)");
      stmt.run(googleUser.id, googleUser.name, googleUser.email, googleUser.picture);

      // Send success message and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify({
                    id: googleUser.id,
                    name: googleUser.name,
                    email: googleUser.email,
                    avatar: googleUser.picture
                  })} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Google Auth Error:", error.response?.data || error.message);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/signin", (req, res) => {
    // This was the mock route, keeping it for compatibility or removing if not needed
    // But we'll use the real one above.
    res.status(405).json({ error: "Use /api/auth/google/url instead" });
  });

  // Report Routes
  app.get("/api/reports", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const stmt = db.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 10");
    const reports = stmt.all(userId);
    res.json(reports.map((r: any) => ({ ...r, result: JSON.parse(r.result) })));
  });

  app.post("/api/reports", (req, res) => {
    const { id, userId, query, context, result } = req.body;
    const stmt = db.prepare("INSERT INTO reports (id, user_id, query, context, result) VALUES (?, ?, ?, ?, ?)");
    stmt.run(id, userId, query, context, JSON.stringify(result));
    res.json({ success: true });
  });

  // API routes
  app.get("/api/health", (req, res) => {
    const appUrl = process.env.APP_URL?.replace(/\/$/, "");
    // Prioritize COGAPI3 as requested by user
    const geminiKey = process.env.COGAPI3 || process.env.GEMINI_API_KEY;
    const isGeminiKeyConfigured = !!geminiKey && geminiKey.trim() !== "";

    res.json({ 
      status: "ok",
      firebase: !!firebaseAdmin,
      appUrl: appUrl || "NOT_SET",
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      geminiKeyConfigured: isGeminiKeyConfigured,
      geminiKeyName: process.env.COGAPI3 ? "COGAPI3" : process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "NONE",
      redirectUri: appUrl ? `${appUrl}/auth/google/callback` : "APP_URL_MISSING",
      origin: appUrl || "APP_URL_MISSING"
    });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { dataset, query, context } = req.body;

      if (!dataset) {
        return res.status(400).json({ error: "Dataset is required" });
      }

      console.log("Intelligence Engine v2.6 starting analysis...");
      // Prioritize COGAPI3 as requested by user, fallback to GEMINI_API_KEY
      const apiKey = process.env.COGAPI3 || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.trim() === "") {
        return res.status(500).json({ 
          error: "Gemini API key is not configured. Please set COGAPI3 or GEMINI_API_KEY in the environment variables." 
        });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      
      const systemInstruction = `
SYSTEM ROLE:
You are an AI Data Intelligence Engine designed to replace spreadsheets, dashboards, and BI tools. You do not generate generic responses. You perform structured reasoning over data and produce autonomous insights, forecasts, risk analysis, and decision intelligence.
You behave like a persistent enterprise intelligence system, not a chatbot.

OBJECTIVE:
Given a structured dataset (CSV or tabular data), you must:
1. Understand schema automatically
2. Detect relationships
3. Identify key metrics
4. Generate contextual insights
5. Detect anomalies
6. Forecast trends
7. Identify risks
8. Suggest decisions
9. Provide explainability with evidence
10. Provide confidence score

REASONING RULES:
- Always infer KPIs from data automatically.
- If time-series data exists → generate forecast.
- If numeric variance > 2 standard deviations → flag anomaly.
- Detect correlations.
- Detect trend direction.
- Always explain WHY.
- Never say “insufficient data” unless truly impossible.
- Be analytical, not conversational.
- Use structured business reasoning.
- Assume enterprise-level decision making.

OUTPUT FORMAT (STRICT JSON):
{
  "data_summary": {
    "detected_entities": ["string"],
    "key_metrics": [{"name": "string", "value": "string", "trend": "up/down/stable"}],
    "relationships": ["string"]
  },
  "visualizations": [
    {
      "type": "pie | bar | line | area",
      "title": "string",
      "data": [{"name": "string", "value": "number"}],
      "description": "string"
    }
  ],
  "insights": [
    {
      "title": "string",
      "description": "string",
      "data_evidence": "string",
      "impact_level": "Low/Medium/High"
    }
  ],
  "anomalies": [
    {
      "type": "string",
      "location": "string",
      "reasoning": "string",
      "severity": "Low/Medium/High"
    }
  ],
  "forecast": {
    "time_horizon": "string",
    "predicted_trend": "string",
    "confidence_level": "string",
    "projection_data": [{"period": "string", "value": "number"}]
  },
  "strategic_growth": {
    "title": "string",
    "data": [{"label": "string", "current": "number", "projected": "number"}]
  },
  "market_expansion": {
    "title": "string",
    "data": [{"segment": "string", "opportunity_score": "number", "risk_factor": "number"}]
  },
  "geographic_matrix": {
    "title": "string",
    "data": [{"city": "string", "score": "number", "risk": "number"}]
  },
  "risk_heatmap": {
    "title": "string",
    "data": [{"category": "string", "risk_score": "number", "impact": "number"}]
  },
  "operational_efficiency": {
    "title": "string",
    "metrics": [{"label": "string", "score": "number"}]
  },
  "risk_analysis": [
    {
      "risk_type": "string",
      "probability": "string",
      "business_impact": "string",
      "evidence": "string"
    }
  ],
  "recommendations": [
    {
      "action": "string",
      "justification": "string",
      "expected_outcome": "string",
      "confidence_score": "number (0-1)"
    }
  ]
}
`;

      const prompt = `
Dataset Context: ${context || 'General Business Data'}
User Intent: ${query || 'Analyze this data for executive insights'}

DATASET (First 100 rows):
${dataset.slice(0, 100).map((row: any) => JSON.stringify(row)).join('\n')}

Perform full intelligence analysis and return the results in the specified JSON format.
- For "geographic_matrix", provide a comprehensive "Geographic Opportunity Matrix" covering ALL major cities or regions identified in the dataset. Do not limit to just 3; include as many as are relevant to show a complete geographic spread.
- For "forecast.projection_data", provide at least 6-8 data points representing a logical progression.
- For "strategic_growth", provide a comparison of current vs projected performance across key segments.
- For "risk_heatmap", provide data points that can be visualized as a scatter or bubble chart (risk vs impact).
- For "operational_efficiency", provide scores (0-100) for different operational areas.
- Ensure all JSON is valid and strictly follows the schema.
`;

      console.log("Sending request to Gemini (Flash)...");
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
        },
      }));

      if (!response.text) {
        throw new Error("Model returned empty response");
      }

      const result = JSON.parse(response.text);
      
      // Basic validation/fallback
      if (!result.data_summary) {
        result.data_summary = {
          detected_entities: [],
          key_metrics: [],
          relationships: []
        };
      }
      if (!result.insights) result.insights = [];
      if (!result.anomalies) result.anomalies = [];
      if (!result.risk_analysis) result.risk_analysis = [];
      if (!result.recommendations) result.recommendations = [];
      if (!result.risk_heatmap) result.risk_heatmap = { title: "Risk Distribution", data: [] };
      if (!result.operational_efficiency) result.operational_efficiency = { title: "Operational Efficiency", metrics: [] };
      if (!result.geographic_matrix) result.geographic_matrix = { title: "Geographic Opportunity Matrix", data: [] };

      console.log("Analysis successful");
      res.json(result);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      const status = error.status || (error.response && error.response.status) || 500;
      const message = error.message?.toLowerCase() || "";
      
      if (status === 400 && message.includes("api key not valid")) {
        const keySource = process.env.COGAPI3 ? 'COGAPI3' : process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'Unknown';
        return res.status(400).json({ 
          error: `The Gemini API key is invalid. Current key source: ${keySource}. Please update your environment variables in AI Studio.` 
        });
      }

      if (status === 429 || message.includes("rate exceeded") || message.includes("quota")) {
        return res.status(429).json({ 
          error: "Gemini API rate limit exceeded. The system is currently under high load. Please wait a few moments and try again." 
        });
      }
      
      res.status(status).json({ error: error.message || "Failed to analyze data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
