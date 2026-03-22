import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load disease data
  const diseasesPath = path.join(process.cwd(), "src/data/diseases.json");
  const diseases = JSON.parse(fs.readFileSync(diseasesPath, "utf-8"));

  // Chatbot API endpoint
  app.post("/api/chat", (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const input = message.trim().toLowerCase();

    // Command Parsing (Slash Commands)
    if (input.startsWith("/symptoms ")) {
      const diseaseName = input.replace("/symptoms ", "").trim();
      const disease = diseases.find((d: any) => d.name.toLowerCase() === diseaseName);
      if (disease) {
        return res.json({
          response: `**Symptoms of ${disease.name}:**\n` + disease.symptoms.map((s: string) => `• ${s}`).join("\n")
        });
      }
      return res.json({ response: `I couldn't find symptoms for "${diseaseName}". Try "Osteoporosis" or "Sarcopenia".` });
    }

    if (input.startsWith("/compare ")) {
      const parts = input.replace("/compare ", "").split(" vs ");
      if (parts.length === 2) {
        const d1 = diseases.find((d: any) => d.name.toLowerCase() === parts[0].trim());
        const d2 = diseases.find((d: any) => d.name.toLowerCase() === parts[1].trim());

        if (d1 && d2) {
          return res.json({
            response: `**Comparison: ${d1.name} vs ${d2.name}**\n\n**${d1.name}:** ${d1.etiology.substring(0, 100)}...\n\n**${d2.name}:** ${d2.etiology.substring(0, 100)}...`
          });
        }
      }
      return res.json({ response: "Please use the format: `/compare [disease A] vs [disease B]`" });
    }

    if (input.startsWith("/locate ")) {
      const diseaseName = input.replace("/locate ", "").trim();
      const disease = diseases.find((d: any) => d.name.toLowerCase() === diseaseName);
      if (disease) {
        return res.json({
          response: `The book on **${disease.name}** is located in the **${disease.category}** shelf. [View Details](#/disease/${disease.id})`
        });
      }
      return res.json({ response: `I couldn't locate "${diseaseName}" in our library.` });
    }

    // Default response
    return res.json({
      response: "Hello! I am your Digital Librarian. I can help you navigate the Musculoskeletal Library. Try these commands:\n\n• `/symptoms [disease]`\n• `/compare [A] vs [B]`\n• `/locate [disease]`"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
