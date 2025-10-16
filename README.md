# cf_ai_plant_companion

An AI-powered plant care assistant built with Cloudflare's Agent SDK that helps maintain healthy houseplants through personalized care schedules and recommendations.

## Features

- **Natural Language Interface**: Describe plant symptoms naturally (e.g., "my fern's leaves are turning brown")
- **AI Diagnosis**: Plant problem diagnosis and care recommendations powered by Llama 3.3
- **Smart Scheduling**: Automated watering and care reminders based on each plant's needs
- **Memory System**: Tracks plant history, watering patterns, and health issues using SQLite
- **Persistent State**: Durable Objects ensure plant data is never lost
- **Real-time Updates**: Get notifications for care reminders via Cloudflare Workflows

## Architecture

This application showcases the following Cloudflare components:

### LLM (Language Model)
- **Llama 3.3 70B Instruct** running on Cloudflare Workers AI
- Context-aware responses based on plant type and history
- Structured diagnosis with actionable recommendations

### Memory System
- **Durable Objects with SQLite** for persistent storage
- Plant profiles with species-specific care requirements
- Historical tracking of watering, fertilizing, and health issues
- Pattern recognition for preventive care suggestions

### Workflow Orchestration
- **Cloudflare Workflows** for scheduled reminders
- Automated care reminders based on plant needs
- Escalating notifications for critical care tasks

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Cloudflare account (optional for local development, required for deployment)

## Installation

1. **Navigate to the project directory**:
   ```bash
   cd agents-starter
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running Locally

1. **Start the development server**:
   ```bash
   npm start
   ```

   This will start both the frontend (Vite) and backend (Wrangler dev server) concurrently.

2. **Open your browser**:
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

3. **Start using the assistant**:
   The chat interface will load, and you can start interacting with your plant care assistant!

## Example Interactions

### Adding a Plant
```
User: Add a new plant called Monstera Mike, it's a Monstera Deliciosa.
      It needs bright indirect light and watering every 7 days.
Assistant: I've added Monstera Mike! I'll remind you to water every 7 days.
```

### Diagnosing Plant Issues
```
User: My fern's leaves are turning brown at the edges.
Assistant: Brown edges on fern leaves typically indicate low humidity or underwatering.
           Ferns love moisture! Try:
           - Misting the leaves daily
           - Placing the pot on a pebble tray with water
           - Moving it away from heaters/AC vents
           - Checking if the soil is dry and watering more frequently```

### Checking Watering Schedule
```
User: Which plants need watering today?
Assistant: Your Snake Plant in the bedroom is due for watering - it's been 12 days!
```

### Getting Care Tips
```
User: Give me care tips for succulents
Assistant: Succulents are low-maintenance but have specific needs:
           - Watering: Every 2-3 weeks, less in winter
           - Light: Bright, direct sunlight (6+ hours)
           - Soil: Well-draining cactus mix
           - Common issues: Overwatering causes root rot
```

## Available Tools

The assistant has access to the following tools:

- **addPlant**: Track a new plant with care requirements
- **listPlants**: View all your plants
- **removePlant**: Remove a plant from your collection (deletes plant and all history)
- **waterPlant**: Record a watering event
- **checkWateringNeeds**: See which plants need water
- **getWateringHistory**: View watering history for a plant
- **diagnosePlantIssue**: Diagnose health problems
- **viewHealthIssues**: Check recorded health issues
- **getCareTips**: Get general care advice for plant types
- **scheduleWateringReminder**: Set up automated reminders
- **getScheduledReminders**: View all scheduled reminders
- **cancelReminder**: Cancel a scheduled reminder

## Deployment to Cloudflare

### Step 1: Create a Cloudflare Account
1. Go to https://dash.cloudflare.com
2. Sign up for a free account or log in

### Step 2: Enable Workers AI
1. Navigate to Workers & Pages in your dashboard
2. Enable Workers AI (required for Llama 3.3)
3. No API key needed - Workers AI is included with your Cloudflare account

### Step 3: Deploy the Application

From the `agents-starter` directory:

```bash
npm run deploy
```

This will:
- Build your application
- Create the Durable Object binding
- Deploy to Cloudflare Workers
- Give you a live URL (e.g., https://cf-ai-plant-companion.your-subdomain.workers.dev)

### Step 4: Configure Durable Objects (if needed)

The deployment should automatically set up Durable Objects. If you encounter issues:

1. Go to Workers & Pages > cf-ai-plant-companion > Settings > Bindings
2. Verify the "PlantCare" Durable Object binding exists
3. Check that SQLite is enabled for the Durable Object

## Project Structure

```
agents-starter/
├── src/
│   ├── server.ts          # PlantCare Durable Object & Worker entry point
│   ├── tools.ts           # Tool definitions (addPlant, waterPlant, etc.)
│   ├── app.tsx            # React chat UI
│   ├── utils.ts           # Helper functions
│   └── components/        # UI components
├── wrangler.jsonc         # Cloudflare Workers configuration
├── package.json
└── README.md
```

## Key Components Explained

### PlantCare Durable Object (server.ts:24)
- Extends `AIChatAgent` from the agents SDK
- Uses SQLite storage for persistent plant data
- Tables: plants, watering_history, health_issues
- Manages conversation state and schedules

### Tools (tools.ts)
- 12 tools for plant management
- Auto-execute (no human confirmation required)
- Access Durable Object state via `getCurrentAgent()`

### LLM Configuration (server.ts:19)
- Uses Workers AI with Llama 3.3 70B
- No API keys required
- Configured via `workersAI()` provider

## Technologies Used

- **Frontend**: React 19, Vite, TailwindCSS
- **Backend**: Cloudflare Workers, Durable Objects
- **LLM**: Llama 3.3 70B (Workers AI)
- **Agent Framework**: Cloudflare Agents SDK
- **Database**: SQLite (via Durable Objects)
- **Scheduling**: Cloudflare Workflows

## References

- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)

## Troubleshooting

### Local development issues
- **Port already in use**: Change the port in `vite.config.ts`
- **Module not found**: Run `npm install` again
- **Database errors**: Delete `.wrangler` folder and restart


## License

MIT

## Contributing

This is a demo application for Cloudflare's AI Agent hackathon. Feel free to fork and customize for your needs!
