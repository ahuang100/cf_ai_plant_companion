/**
 * Tool definitions for the Plant Care AI assistant
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet, generateId } from "ai";
import { z } from "zod/v3";

import type { PlantCare } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";

/**
 * Tool to add a new plant to the collection
 */
const addPlant = tool({
  description: "Add a new plant to track. Records plant type, name, location, light needs, and watering schedule.",
  inputSchema: z.object({
    name: z.string().describe("The name or nickname for the plant (e.g., 'Fernie the Fern')"),
    type: z.string().describe("The type/species of plant (e.g., 'Boston Fern', 'Monstera Deliciosa', 'Snake Plant')"),
    location: z.string().optional().describe("Where the plant is located (e.g., 'living room window', 'bedroom')"),
    lightRequirement: z.string().optional().describe("Light requirements (e.g., 'bright indirect', 'low light', 'full sun')"),
    waterFrequencyDays: z.coerce.number().optional().describe("How often to water in days (default: 7)"),
    notes: z.string().optional().describe("Any additional notes about the plant")
  }),
  execute: async ({ name, type, location, lightRequirement, waterFrequencyDays, notes }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plantId = generateId();
      agent!.addPlant({
        id: plantId,
        name,
        type,
        location,
        lightRequirement,
        waterFrequencyDays: waterFrequencyDays || 7,
        notes
      });

      return `Successfully added ${name} (${type}) to your plant collection! Plant ID: ${plantId}.
I'll remind you to water it every ${waterFrequencyDays || 7} days.`;
    } catch (error) {
      console.error("Error adding plant:", error);
      return `Error adding plant: ${error}`;
    }
  }
});

/**
 * Tool to list all plants in the collection
 */
const listPlants = tool({
  description: "List all plants in the collection with their details and status",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plants = agent!.getPlants();

      if (!plants || plants.length === 0) {
        return "You don't have any plants tracked yet. Use the addPlant tool to add your first plant!";
      }

      return plants;
    } catch (error) {
      console.error("Error listing plants:", error);
      return `Error listing plants: ${error}`;
    }
  }
});

/**
 * Tool to remove a plant from the collection
 */
const removePlant = tool({
  description: "Remove a plant from the collection. This will delete the plant and all its associated watering history and health issues.",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant to remove")
  }),
  execute: async ({ plantId }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const removedPlant = agent!.removePlant(plantId);

      if (!removedPlant) {
        return `Plant with ID ${plantId} not found. Use listPlants to see all your plants.`;
      }

      return `Successfully removed ${removedPlant.name} from your collection. All watering history and health records for this plant have been deleted.`;
    } catch (error) {
      console.error("Error removing plant:", error);
      return `Error removing plant: ${error}`;
    }
  }
});

/**
 * Tool to record watering a plant
 */
const waterPlant = tool({
  description: "Record that a plant was watered. Updates the plant's watering history and last watered date.",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant that was watered"),
    notes: z.string().optional().describe("Optional notes about the watering (e.g., 'gave extra water', 'added fertilizer')")
  }),
  execute: async ({ plantId, notes }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plant = agent!.getPlant(plantId);
      if (!plant) {
        return `Plant with ID ${plantId} not found. Use listPlants to see all your plants.`;
      }

      const result = agent!.waterPlant(plantId, notes);
      return `Recorded watering for ${plant.name}! Last watered: ${new Date(result.wateredAt).toLocaleString()}`;
    } catch (error) {
      console.error("Error recording watering:", error);
      return `Error recording watering: ${error}`;
    }
  }
});

/**
 * Tool to check which plants need watering
 */
const checkWateringNeeds = tool({
  description: "Check which plants need watering based on their watering schedules",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plantsNeedingWater = agent!.getPlantsNeedingWater();

      if (!plantsNeedingWater || plantsNeedingWater.length === 0) {
        return "Great news! All your plants are well-watered. No plants need watering right now.";
      }

      return plantsNeedingWater;
    } catch (error) {
      console.error("Error checking watering needs:", error);
      return `Error checking watering needs: ${error}`;
    }
  }
});

/**
 * Tool to get watering history for a plant
 */
const getWateringHistory = tool({
  description: "Get the watering history for a specific plant",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant"),
    limit: z.number().optional().describe("Number of recent watering events to retrieve (default: 10)")
  }),
  execute: async ({ plantId, limit }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plant = agent!.getPlant(plantId);
      if (!plant) {
        return `Plant with ID ${plantId} not found.`;
      }

      const history = agent!.getWateringHistory(plantId, limit || 10);

      if (!history || history.length === 0) {
        return `${plant.name} hasn't been watered yet according to our records.`;
      }

      return history;
    } catch (error) {
      console.error("Error getting watering history:", error);
      return `Error getting watering history: ${error}`;
    }
  }
});

/**
 * Tool to diagnose plant health issues
 * This tool uses AI to analyze symptoms and provide diagnosis
 */
const diagnosePlantIssue = tool({
  description: "Diagnose a plant health issue based on symptoms. Use this when user describes problems like browning leaves, wilting, spots, etc.",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant with the issue"),
    symptoms: z.string().describe("Detailed description of the symptoms (e.g., 'leaves turning brown at the edges', 'yellow spots on leaves', 'wilting despite watering')")
  }),
  execute: async ({ plantId, symptoms }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plant = agent!.getPlant(plantId);
      if (!plant) {
        return `Plant with ID ${plantId} not found.`;
      }

      // Record the health issue - AI will provide diagnosis in its response
      agent!.recordHealthIssue(plantId, symptoms);

      return `I've recorded this health issue for ${plant.name}. Based on the symptoms "${symptoms}", I'll analyze the problem and provide recommendations. This could be related to watering, light, humidity, pests, or nutrients.`;
    } catch (error) {
      console.error("Error diagnosing plant issue:", error);
      return `Error diagnosing plant issue: ${error}`;
    }
  }
});

/**
 * Tool to view health issues for a plant
*/
const viewHealthIssues = tool({
  description: "View recorded health issues for a plant",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant"),
    includeResolved: z.boolean().optional().describe("Whether to include resolved issues (default: false)")
  }),
  execute: async ({ plantId, includeResolved }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plant = agent!.getPlant(plantId);
      if (!plant) {
        return `Plant with ID ${plantId} not found.`;
      }

      const issues = agent!.getHealthIssues(plantId, includeResolved || false);

      if (!issues || issues.length === 0) {
        return `No health issues recorded for ${plant.name}. That's great!`;
      }

      return issues;
    } catch (error) {
      console.error("Error viewing health issues:", error);
      return `Error viewing health issues: ${error}`;
    }
  }
});

/**
 * Tool to get care tips for a specific plant type
 */
const getCareTips = tool({
  description: "OPTIONAL: Use only if specifically asked to look up care tips. The AI can answer plant care questions directly without this tool.",
  inputSchema: z.object({
    plantType: z.string().describe("The type of plant to get care tips for (e.g., 'fern', 'succulent', 'monstera')")
  }),
  execute: async ({ plantType }) => {
    return `Providing care tips for ${plantType}`;
  }
});

/**
 * Schedule watering reminder
*/
const scheduleWateringReminder = tool({
  description: "Schedule a watering reminder for a plant",
  inputSchema: z.object({
    plantId: z.string().describe("The ID of the plant"),
    scheduleDetails: scheduleSchema
  }),
  execute: async ({ plantId, scheduleDetails }) => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const plant = agent!.getPlant(plantId);
      if (!plant) {
        return `Plant with ID ${plantId} not found.`;
      }

      const when = scheduleDetails.when;

      function throwError(msg: string): string {
        throw new Error(msg);
      }

      if (when.type === "no-schedule") {
        return "Not a valid schedule input";
      }

      const input =
        when.type === "scheduled"
          ? when.date
          : when.type === "delayed"
            ? when.delayInSeconds
            : when.type === "cron"
              ? when.cron
              : throwError("not a valid schedule input");

      agent!.schedule(input!, "executeTask", scheduleDetails.description || `Time to water ${plant.name}!`);

      return `Watering reminder scheduled for ${plant.name} (type: ${when.type})`;
    } catch (error) {
      console.error("Error scheduling watering reminder:", error);
      return `Error scheduling reminder: ${error}`;
    }
  }
});

/**
 * Tool to list all scheduled tasks
 */
const getScheduledReminders = tool({
  description: "List all scheduled watering reminders",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<PlantCare>();

    try {
      const tasks = agent!.getSchedules();
      if (!tasks || tasks.length === 0) {
        return "No watering reminders scheduled.";
      }
      return tasks;
    } catch (error) {
      console.error("Error listing scheduled reminders", error);
      return `Error listing scheduled reminders: ${error}`;
    }
  }
});

/**
 * Tool to cancel a scheduled reminder
 */
const cancelReminder = tool({
  description: "Cancel a scheduled watering reminder by its ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the reminder to cancel")
  }),
  execute: async ({ taskId }) => {
    const { agent } = getCurrentAgent<PlantCare>();
    try {
      await agent!.cancelSchedule(taskId);
      return `Reminder ${taskId} has been successfully canceled.`;
    } catch (error) {
      console.error("Error canceling reminder", error);
      return `Error canceling reminder ${taskId}: ${error}`;
    }
  }
});

/**
 * Export all available tools
 */
export const tools = {
  addPlant,
  listPlants,
  removePlant,
  waterPlant,
  checkWateringNeeds,
  getWateringHistory,
  diagnosePlantIssue,
  viewHealthIssues,
  getCareTips,
  scheduleWateringReminder,
  getScheduledReminders,
  cancelReminder
} satisfies ToolSet;

export const executions = {
  // Human confirmation tools added here if possible
};
