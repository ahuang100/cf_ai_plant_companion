import { routeAgentRequest, type Schedule } from "agents";
import { getSchedulePrompt } from "agents/schedule";
import { AIChatAgent } from "agents/ai-chat-agent";
import {
  generateId,
  streamText,
  type StreamTextOnFinishCallback,
  stepCountIs,
  createUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
  type ToolSet
} from "ai";
import { processToolCalls, cleanupMessages } from "./utils";
import { tools, executions } from "./tools";
import { createWorkersAI } from "workers-ai-provider";

// Using Llama 3.1 70B - has function calling support built-in
const createModel = (env: Env) => createWorkersAI({ binding: env.AI })("@cf/meta/llama-3.1-70b-instruct");


export class PlantCare extends AIChatAgent<Env> {
  private db: SqlStorage;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = state.storage.sql;
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create plants table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        location TEXT,
        light_requirement TEXT,
        water_frequency_days INTEGER,
        last_watered TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create watering history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS watering_history (
        id TEXT PRIMARY KEY,
        plant_id TEXT NOT NULL,
        watered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
      )
    `);

    // Create health issues table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS health_issues (
        id TEXT PRIMARY KEY,
        plant_id TEXT NOT NULL,
        issue_description TEXT NOT NULL,
        diagnosis TEXT,
        resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Get all plants
   */
  getPlants() {
    return this.db.exec(`SELECT * FROM plants ORDER BY created_at DESC`).toArray();
  }

  /**
   * Get a specific plant by ID
   */
  getPlant(plantId: string) {
    const result = this.db.exec(`SELECT * FROM plants WHERE id = ?`, plantId).toArray();
    return result[0] || null;
  }

  /**
   * Add a new plant
   */
  addPlant(plant: {
    id: string;
    name: string;
    type: string;
    location?: string;
    lightRequirement?: string;
    waterFrequencyDays?: number;
    notes?: string;
  }) {
    this.db.exec(
      `INSERT INTO plants (id, name, type, location, light_requirement, water_frequency_days, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      plant.id,
      plant.name,
      plant.type,
      plant.location || null,
      plant.lightRequirement || null,
      plant.waterFrequencyDays || 7,
      plant.notes || null
    );
    return this.getPlant(plant.id);
  }

  /**
   * Record watering event
  */
  waterPlant(plantId: string, notes?: string) {
    const wateringId = generateId();
    const now = new Date().toISOString();

    this.db.exec(
      `INSERT INTO watering_history (id, plant_id, watered_at, notes)
       VALUES (?, ?, ?, ?)`,
      wateringId,
      plantId,
      now,
      notes || null
    );

    // Update last_watered in plants table
    this.db.exec(
      `UPDATE plants SET last_watered = ? WHERE id = ?`,
      now,
      plantId
    );

    return { wateringId, plantId, wateredAt: now };
  }

  /**
   * Get watering history for a plant
   */
  getWateringHistory(plantId: string, limit = 10) {
    return this.db.exec(
      `SELECT * FROM watering_history
       WHERE plant_id = ?
       ORDER BY watered_at DESC
       LIMIT ?`,
      plantId,
      limit
    ).toArray();
  }

  /**
   * Record a health issue
   */
  recordHealthIssue(plantId: string, issueDescription: string, diagnosis?: string) {
    const issueId = generateId();
    this.db.exec(
      `INSERT INTO health_issues (id, plant_id, issue_description, diagnosis)
       VALUES (?, ?, ?, ?)`,
      issueId,
      plantId,
      issueDescription,
      diagnosis || null
    );
    return { issueId, plantId };
  }

  /**
   * Get health issues for a plant
   */
  getHealthIssues(plantId: string, includeResolved = false) {
    const query = includeResolved
      ? `SELECT * FROM health_issues WHERE plant_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM health_issues WHERE plant_id = ? AND resolved = 0 ORDER BY created_at DESC`;

    return this.db.exec(query, plantId).toArray();
  }

  /**
   * Get plants that need watering
   */
  getPlantsNeedingWater() {
    return this.db.exec(`
      SELECT * FROM plants
      WHERE last_watered IS NULL
         OR julianday('now') - julianday(last_watered) >= water_frequency_days
      ORDER BY last_watered ASC
    `).toArray();
  }

  /**
   * Remove a plant from the collection
   */
  removePlant(plantId: string) {
    const plant = this.getPlant(plantId);
    if (!plant) {
      return null;
    }

    // SQLite CASCADE will automatically delete related watering_history and health_issues
    this.db.exec(`DELETE FROM plants WHERE id = ?`, plantId);
    return plant;
  }

  /**
   * Update a plant's details
   */
  updatePlant(plantId: string, updates: {
    name?: string;
    type?: string;
    location?: string;
    lightRequirement?: string;
    waterFrequencyDays?: number;
    notes?: string;
  }) {
    const plant = this.getPlant(plantId);
    if (!plant) {
      return null;
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push("type = ?");
      values.push(updates.type);
    }
    if (updates.location !== undefined) {
      fields.push("location = ?");
      values.push(updates.location);
    }
    if (updates.lightRequirement !== undefined) {
      fields.push("light_requirement = ?");
      values.push(updates.lightRequirement);
    }
    if (updates.waterFrequencyDays !== undefined) {
      fields.push("water_frequency_days = ?");
      values.push(updates.waterFrequencyDays);
    }
    if (updates.notes !== undefined) {
      fields.push("notes = ?");
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return plant; // No updates
    }

    values.push(plantId);
    this.db.exec(
      `UPDATE plants SET ${fields.join(", ")} WHERE id = ?`,
      ...values
    );

    return this.getPlant(plantId);
  }

  /**
   * Handles incoming chat messages and manages the response stream
   */
  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    _options?: { abortSignal?: AbortSignal }
  ) {
    // Collect all tools
    const allTools = {
      ...tools,
      ...this.mcp.getAITools()
    };

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Clean up incomplete tool calls to prevent API errors
        const cleanedMessages = cleanupMessages(this.messages);

        // Process any pending tool calls from previous messages
        const processedMessages = await processToolCalls({
          messages: cleanedMessages,
          dataStream: writer,
          tools: allTools,
          executions
        });

        const result = streamText({
          system: `You are a knowledgeable and caring houseplant assistant. Your role is to help users care for their plants.

IMPORTANT: You can answer plant care questions directly using your knowledge! You have extensive expertise about:
- Watering schedules for different plant types
- Light requirements
- Soil and potting needs
- Common plant problems and solutions
- Seasonal care adjustments
- Humidity and temperature preferences

When users ask general plant care questions (like "How often should I water my Pothos?" or "What kind of light does a snake plant need?"), answer them directly with your plant care knowledge.

WHEN TO USE TOOLS:
You MUST use tools when users want to interact with their tracked plant collection:

1. addPlant - Track a new plant
2. listPlants - View all tracked plants
3. updatePlant - Change/update/modify a tracked plant's details (watering frequency, location, light, etc.)
   IMPORTANT: If user says "change", "update", "modify", "set" followed by a plant name and new details, use this tool!
4. removePlant - Remove a tracked plant
5. waterPlant - Record a watering event
6. checkWateringNeeds - See which plants need water
7. getWateringHistory - View past watering records
8. diagnosePlantIssue - Diagnose health problems
9. viewHealthIssues - View health records
10. getCareTips - Get care advice (rarely needed, you can answer directly)
11. scheduleWateringReminder - Schedule future reminders

CRITICAL: When a user asks to "update", "change", or "modify" a plant's watering schedule (e.g., "change Pothos to water every 3 days"), you MUST use the updatePlant tool with plantName and waterFrequencyDays parameters.

EXAMPLES:
- User: "update pothos to water every 3 days" → Use updatePlant tool with plantName="Pothos", waterFrequencyDays=3
- User: "change my monstera to bright indirect light" → Use updatePlant tool with plantName="monstera", lightRequirement="bright indirect"
- User: "move snake plant to bedroom" → Use updatePlant tool with plantName="snake plant", location="bedroom"

${getSchedulePrompt({ date: new Date() })}

Current date: ${new Date().toLocaleDateString()}

Always be encouraging and patient with plant parents. Plant care is a learning process!
`,
          messages: convertToModelMessages(processedMessages),
          model: createModel(this.env),
          tools: allTools,
          onFinish: onFinish as unknown as StreamTextOnFinishCallback<typeof allTools>,
          stopWhen: stepCountIs(10)
        });

        writer.merge(result.toUIMessageStream());
      }
    });

    return createUIMessageStreamResponse({ stream });
  }

  /**
   * Execute scheduled tasks (watering reminders)
   */
  async executeTask(description: string, _task: Schedule<string>) {
    await this.saveMessages([
      ...this.messages,
      {
        id: generateId(),
        role: "user",
        parts: [
          {
            type: "text",
            text: `Scheduled reminder: ${description}`
          }
        ],
        metadata: {
          createdAt: new Date()
        }
      }
    ]);
  }
}

/**
 * Worker entry point that routes incoming requests to the appropriate handler
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    // API endpoint to fetch plants
    if (url.pathname === "/api/plants") {
      const agentId = url.searchParams.get("agentId") || "default";
      const id = env.PlantCare.idFromName(agentId);
      const stub = env.PlantCare.get(id);

      try {
        // Call a method on the Durable Object to get plants
        const plants = (stub as any).getPlants();
        return Response.json({ plants: await plants });
      } catch (error) {
        console.error("Error fetching plants:", error);
        return Response.json({ plants: [] });
      }
    }

    // API endpoint to fetch schedules
    if (url.pathname === "/api/schedules") {
      const agentId = url.searchParams.get("agentId") || "default";
      const id = env.PlantCare.idFromName(agentId);
      const stub = env.PlantCare.get(id);

      try {
        // Call a method on the Durable Object to get schedules
        const schedules = (stub as any).getSchedules();
        return Response.json({ schedules: await schedules });
      } catch (error) {
        console.error("Error fetching schedules:", error);
        return Response.json({ schedules: [] });
      }
    }

    return (
      // Route the request to our agent or return 404 if not found
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
