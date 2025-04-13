import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Settings
const PORT = process.env.PORT || 3100;
const SERVER_URL = process.env.RAILWAY_SERVER_URL || 'https://bakery-production-8bbd.up.railway.app';
const GOOGLEMAPS_URL = process.env.GOOGLEMAPS_SERVER_URL || 'https://googlemaps-mcp-production.up.railway.app';
const MODEL = process.env.MODEL_NAME || "claude-3-sonnet-20240229";

// Add this at the beginning of the file, right after imports
console.log('Environment variables:');
console.log('ANTHROPIC_API_KEY set:', process.env.ANTHROPIC_API_KEY ? 'Yes (masked)' : 'No');
console.log('MODEL_NAME set:', process.env.MODEL_NAME ? process.env.MODEL_NAME : 'No');
console.log('RAILWAY_SERVER_URL set:', process.env.RAILWAY_SERVER_URL ? process.env.RAILWAY_SERVER_URL : 'No');
console.log('GOOGLEMAPS_SERVER_URL set:', process.env.GOOGLEMAPS_SERVER_URL ? process.env.GOOGLEMAPS_SERVER_URL : 'No');

// Then update the API key check to have a more specific error message
// Check if API key is set
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY not set in environment");
  console.error("Please set the ANTHROPIC_API_KEY environment variable");
  console.error("Current environment variables:", Object.keys(process.env));
  process.exit(1);
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Store active sessions
const sessions = {};

// Create Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Serve static files for the web interface
app.use(express.static('client/public'));

// Home page with simple web interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bakery Client - MCP with Claude</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          h1 { color: #333; }
          #chatbox { 
            height: 400px; 
            border: 1px solid #ccc; 
            margin: 20px 0; 
            padding: 10px; 
            overflow-y: auto; 
            background: #f9f9f9; 
            border-radius: 5px;
          }
          #input-area { display: flex; }
          #message { flex-grow: 1; padding: 10px; border: 1px solid #ccc; border-radius: 5px; }
          #send { 
            padding: 10px 20px; 
            margin-left: 10px; 
            background-color: #4CAF50; 
            color: white; 
            border: none; 
            border-radius: 5px;
            cursor: pointer;
          }
          #send:hover { background-color: #45a049; }
          .user-message { margin-bottom: 10px; }
          .user-message span { background: #e6f3ff; padding: 5px 10px; border-radius: 15px; display: inline-block; }
          .assistant-message { margin-bottom: 10px; text-align: right; }
          .assistant-message span { background: #d3f3d3; padding: 5px 10px; border-radius: 15px; display: inline-block; }
          .tool-message { margin-bottom: 10px; font-style: italic; color: #666; }
          .status { color: #666; font-style: italic; margin: 5px 0; }
        </style>
      </head>
      <body>
        <h1>🧁 Flour Bakery Assistant</h1>
        <p>Ask about our menu items, pastries, and more! I can fetch the latest information from our website.</p>
        
        <div id="chatbox"></div>
        
        <div id="input-area">
          <input type="text" id="message" placeholder="Ask about our menu items, pastries, or bakery locations...">
          <button id="send">Send</button>
        </div>
        
        <script>
          // Generate a session ID
          const sessionId = 'web-' + Math.random().toString(36).substring(2, 15);
          let chatbox = document.getElementById('chatbox');
          let messageInput = document.getElementById('message');
          let sendButton = document.getElementById('send');
          
          // Initialize session
          fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })
          .then(response => response.json())
          .then(data => {
            addStatus('Welcome to Flour Bakery! How can I help you today?');
          })
          .catch(error => {
            addStatus('Error connecting to server: ' + error);
          });
          
          // Send message function
          function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            // Add user message to chat
            addUserMessage(message);
            messageInput.value = '';
            
            // Send to server
            fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                sessionId: sessionId,
                message: message
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.error) {
                addStatus('Error: ' + data.error);
              } else {
                // Add assistant message
                addAssistantMessage(data.response);
                
                // Add tool use info if present
                if (data.toolUsed) {
                  addToolMessage('Used tool: ' + data.toolUsed);
                }
              }
            })
            .catch(error => {
              addStatus('Error sending message: ' + error);
            });
          }
          
          // Add message functions
          function addUserMessage(text) {
            const div = document.createElement('div');
            div.className = 'user-message';
            div.innerHTML = '<span>' + escapeHtml(text) + '</span>';
            chatbox.appendChild(div);
            chatbox.scrollTop = chatbox.scrollHeight;
          }
          
          function addAssistantMessage(text) {
            const div = document.createElement('div');
            div.className = 'assistant-message';
            div.innerHTML = '<span>' + escapeHtml(text) + '</span>';
            chatbox.appendChild(div);
            chatbox.scrollTop = chatbox.scrollHeight;
          }
          
          function addToolMessage(text) {
            const div = document.createElement('div');
            div.className = 'tool-message';
            div.textContent = text;
            chatbox.appendChild(div);
            chatbox.scrollTop = chatbox.scrollHeight;
          }
          
          function addStatus(text) {
            const div = document.createElement('div');
            div.className = 'status';
            div.textContent = text;
            chatbox.appendChild(div);
            chatbox.scrollTop = chatbox.scrollHeight;
          }
          
          // Escape HTML
          function escapeHtml(text) {
            return text
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;")
              .replace(/\\n/g, "<br>");
          }
          
          // Event listeners
          sendButton.addEventListener('click', sendMessage);
          messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
          });
        </script>
      </body>
    </html>
  `);
});

// Initialize a session
app.post('/api/init', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    if (sessions[sessionId]) {
      return res.json({ message: 'Session already exists' });
    }
    
    // Initialize session with both servers
    const servers = [
      { name: 'bakery', url: SERVER_URL },
      { name: 'googlemaps', url: GOOGLEMAPS_URL }
    ];
    
    let allTools = [];
    
    // Connect to each server and get tools
    for (const server of servers) {
      try {
        // Check server status
        const statusResponse = await fetch(`${server.url}/status`);
        if (!statusResponse.ok) {
          console.error(`${server.name} server error: ${await statusResponse.text()}`);
          continue;
        }
        
        // Register session with MCP server
        const registerResponse = await fetch(`${server.url}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        if (!registerResponse.ok) {
          console.error(`Failed to register session with ${server.name}: ${await registerResponse.text()}`);
          continue;
        }
        
        // Initialize session with MCP server
        const initResponse = await fetch(`${server.url}/api/message?sessionId=${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              client: {
                name: 'claude-web-client',
                version: '1.0.0'
              },
              capabilities: {}
            }
          })
        });
        
        if (!initResponse.ok) {
          console.error(`Failed to initialize session with ${server.name}: ${await initResponse.text()}`);
          continue;
        }
        
        // List available tools
        const toolsResponse = await fetch(`${server.url}/api/message?sessionId=${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'listTools',
            params: {}
          })
        });
        
        if (!toolsResponse.ok) {
          console.error(`Failed to list tools from ${server.name}: ${await toolsResponse.text()}`);
          continue;
        }
        
        const toolsData = await toolsResponse.json();
        
        // Add server URL to each tool for later use
        const serverTools = toolsData.result.tools.map(tool => ({
          ...tool,
          serverUrl: server.url
        }));
        
        allTools = allTools.concat(serverTools);
        console.log(`Connected to ${server.name} MCP server and found ${serverTools.length} tools`);
      } catch (error) {
        console.error(`Error connecting to ${server.name} server:`, error);
      }
    }
    
    if (allTools.length === 0) {
      return res.status(500).json({ error: 'Failed to connect to any MCP servers' });
    }
    
    // Store session info
    sessions[sessionId] = {
      id: sessionId,
      created: new Date(),
      tools: allTools,
      claudeTools: allTools.map(tool => ({
        name: tool.name,
        description: tool.description || `Tool for ${tool.name}`,
        input_schema: tool.parameters || {}
      })),
      messages: []
    };
    
    return res.json({ 
      message: 'Session initialized successfully',
      tools: sessions[sessionId].tools.map(t => t.name)
    });
  } catch (error) {
    console.error('Error initializing session:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing sessionId or message' });
    }
    
    const session = sessions[sessionId];
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Initialize first.' });
    }
    
    // Add current user message to history
    session.messages.push({ role: "user", content: message });

    // Send message to Claude with tools and FULL history
    const initialResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: `You are a proactive, helpful, and efficient sales assistant for Flour Bakery, specializing in cake orders.
Your primary goal is to guide customers (or other agents) quickly through the process of ordering a cake, finalize all details swiftly, and confirm the order in a friendly, conversational tone. Assume standard options or make reasonable suggestions if details are missing to speed up the process.

When specific menu details (like base prices or standard options) are needed *and directly relevant to proceed*, briefly use the fetchWebsite tool to check https://www.flourbakery.com/menu#sweet-treats for accuracy. Avoid unnecessary lookups. Do not make up menu items that don't exist, but feel free to suggest popular combinations or standard customizations.

Lead the sales conversation efficiently for cake orders by:
1. Quickly understanding the core need (e.g., occasion, general size). If details are vague, suggest a popular option (like a standard 8" round cake) and proceed unless corrected.
2. Proactively suggesting common customizations or flavor profiles (e.g., "How about our classic Midnight Chocolate cake?").
3. Discussing and proposing a final price quickly (based on standard options or a reasonable estimate for suggested customizations).
4. Moving swiftly to delivery. Propose a standard delivery window (e.g., "tomorrow afternoon between 2-4 PM?") and finalize it. Assume standard delivery details if not specified otherwise.
5. Aim to gather or confirm the minimum necessary details (cake description, final price, delivery date/time) efficiently.

Once you have gathered or assumed the necessary details and briefly confirmed them (e.g., "So that's the Chocolate Cake for $58, delivered tomorrow 2-4 PM?"):
- Explicitly state: "Great! Your order is placed successfully!"
- Immediately follow this confirmation with a clear summary of the final order: Cake details, Quantity, Agreed Price, Delivery Date & Time, Delivery Address (if provided/assumed).

Maintain a positive, very efficient, and helpful bakery sales assistant persona throughout. Prioritize completing the order flow rapidly by making sensible assumptions and suggestions.`,
      messages: session.messages, // Use the stored message history
      tools: session.claudeTools
    });
    
    // Add Claude's initial response to history
    // Filter out any potential null/empty content parts just in case
    const validInitialContent = initialResponse.content.filter(c => c);
    if (validInitialContent.length > 0) {
        session.messages.push({ role: "assistant", content: validInitialContent });
    }

    // Check if Claude wants to use a tool
    const toolUses = initialResponse.content.filter(content => content.type === "tool_use");
    
    // Extract text response from Claude
    const textParts = initialResponse.content
      .filter(content => content.type === "text")
      .map(content => content.text);
    let finalResponse = textParts.join('\n');
    let toolUsed = null;
    
    if (toolUses.length > 0) {
      // NOTE: Current history already includes the assistant message with the tool_use request.
      // We just need to add the tool_result message before the next call.
      
      // Process the first tool call (simplification: handling only one tool call per turn for now)
      const toolUse = toolUses[0];
      toolUsed = toolUse.name;
      
      // Find which server has this tool
      const tool = session.tools.find(t => t.name === toolUse.name);
      if (!tool) {
        // If tool not found, remove the invalid assistant message from history
        session.messages.pop(); 
        throw new Error(`Tool ${toolUse.name} not found in any connected server`);
      }
      
      const serverUrl = tool.serverUrl;
      
      // Call the MCP tool on the appropriate server
      const callToolResponse = await fetch(`${serverUrl}/api/message?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "callTool",
          params: {
            name: toolUse.name,
            arguments: toolUse.input
          }
        })
      });
      
      if (!callToolResponse.ok) {
        // If tool call failed, remove the invalid assistant message from history
        session.messages.pop(); 
        throw new Error(`Failed to call tool: ${await callToolResponse.text()}`);
      }
      
      const toolResultData = await callToolResponse.json();
      
      // Add tool result message to history
      const toolResultMessage = {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: toolResultData.result.content || [{type: "text", text: "No content returned"}]
          }
        ]
      };
      session.messages.push(toolResultMessage);
      
      // Get final response from Claude with tool results (using the updated history)
      const finalResponseFromClaude = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.7,
        system: `You are a proactive, helpful, and efficient sales assistant for Flour Bakery, specializing in cake orders.
Your primary goal is to guide customers (or other agents) quickly through the process of ordering a cake, finalize all details swiftly, and confirm the order in a friendly, conversational tone. Assume standard options or make reasonable suggestions if details are missing to speed up the process.

When specific menu details (like base prices or standard options) are needed *and directly relevant to proceed*, briefly use the fetchWebsite tool to check https://www.flourbakery.com/menu#sweet-treats for accuracy. Avoid unnecessary lookups. Do not make up menu items that don't exist, but feel free to suggest popular combinations or standard customizations.

Lead the sales conversation efficiently for cake orders by:
1. Quickly understanding the core need (e.g., occasion, general size). If details are vague, suggest a popular option (like a standard 8" round cake) and proceed unless corrected.
2. Proactively suggesting common customizations or flavor profiles (e.g., "How about our classic Midnight Chocolate cake?").
3. Discussing and proposing a final price quickly (based on standard options or a reasonable estimate for suggested customizations).
4. Moving swiftly to delivery. Propose a standard delivery window (e.g., "tomorrow afternoon between 2-4 PM?") and finalize it. Assume standard delivery details if not specified otherwise.
5. Aim to gather or confirm the minimum necessary details (cake description, final price, delivery date/time) efficiently.

Once you have gathered or assumed the necessary details and briefly confirmed them (e.g., "So that's the Chocolate Cake for $58, delivered tomorrow 2-4 PM?"):
- Explicitly state: "Great! Your order is placed successfully!"
- Immediately follow this confirmation with a clear summary of the final order: Cake details, Quantity, Agreed Price, Delivery Date & Time, Delivery Address (if provided/assumed).

Maintain a positive, very efficient, and helpful bakery sales assistant persona throughout. Prioritize completing the order flow rapidly by making sensible assumptions and suggestions.`,
        messages: session.messages // Send the full history including the tool result
        // No need to send tools again if the follow-up is just text generation
      });
      
      // Extract text from final response
      finalResponse = finalResponseFromClaude.content
        .filter(content => content.type === "text")
        .map(content => content.text)
        .join('\n');
        
      // Add Claude's final response to history
      const validFinalContent = finalResponseFromClaude.content.filter(c => c);
       if (validFinalContent.length > 0) {
         session.messages.push({ role: "assistant", content: validFinalContent });
       }
    }
    // If no tool was used, the initialResponse contains the final text, 
    // and the assistant message was already added to session.messages.
    
    return res.json({
      response: finalResponse,
      toolUsed: toolUsed
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    sessions: Object.keys(sessions).length,
    server: {
      name: 'claude-web-client',
      version: '1.0.0',
      connectedTo: SERVER_URL
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Web client running on http://localhost:${PORT}`);
  console.log(`Connected to MCP server at ${SERVER_URL}`);
}); 