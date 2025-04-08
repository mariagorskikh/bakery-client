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
const MODEL = process.env.MODEL_NAME || "claude-3-sonnet-20240229";

// Add this at the beginning of the file, right after imports
console.log('Environment variables:');
console.log('ANTHROPIC_API_KEY set:', process.env.ANTHROPIC_API_KEY ? 'Yes (masked)' : 'No');
console.log('MODEL_NAME set:', process.env.MODEL_NAME ? process.env.MODEL_NAME : 'No');
console.log('RAILWAY_SERVER_URL set:', process.env.RAILWAY_SERVER_URL ? process.env.RAILWAY_SERVER_URL : 'No');

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
    
    // Check server status
    const statusResponse = await fetch(`${SERVER_URL}/status`);
    if (!statusResponse.ok) {
      return res.status(500).json({ error: `MCP server error: ${await statusResponse.text()}` });
    }
    
    // Register session with MCP server
    const registerResponse = await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    if (!registerResponse.ok) {
      return res.status(500).json({ error: `Failed to register session: ${await registerResponse.text()}` });
    }
    
    // Initialize session with MCP server
    const initResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
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
      return res.status(500).json({ error: `Failed to initialize session: ${await initResponse.text()}` });
    }
    
    // List available tools
    const toolsResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
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
      return res.status(500).json({ error: `Failed to list tools: ${await toolsResponse.text()}` });
    }
    
    const toolsData = await toolsResponse.json();
    
    // Store session info
    sessions[sessionId] = {
      id: sessionId,
      created: new Date(),
      tools: toolsData.result.tools,
      claudeTools: toolsData.result.tools.map(tool => ({
        name: tool.name,
        description: tool.description || `Tool for ${tool.name}`,
        input_schema: tool.parameters || {}
      }))
    };
    
    return res.json({ 
      message: 'Session initialized successfully',
      tools: sessions[sessionId].tools
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
    
    // Send message to Claude with tools
    const initialResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      system: "You are a helpful assistant for Flour Bakery. When asked about menu items, offerings, or bakery information, use the fetchWebsite tool to check https://www.flourbakery.com/menu#sweet-treats for accurate information. Answer in a friendly, conversational tone and format information in an easy-to-read way. Never make up menu items.",
      messages: [
        { role: "user", content: message }
      ],
      tools: session.claudeTools
    });
    
    // Check if Claude wants to use a tool
    const toolUses = initialResponse.content.filter(content => content.type === "tool_use");
    
    // Extract text response from Claude
    const textParts = initialResponse.content
      .filter(content => content.type === "text")
      .map(content => content.text);
    let finalResponse = textParts.join('\n');
    let toolUsed = null;
    
    if (toolUses.length > 0) {
      // Build messages with initial response
      const messages = [
        { role: "user", content: message },
        { role: "assistant", content: initialResponse.content }
      ];
      
      // Process the first tool call
      const toolUse = toolUses[0];
      toolUsed = toolUse.name;
      
      // Call the MCP tool
      const callToolResponse = await fetch(`${SERVER_URL}/api/message?sessionId=${sessionId}`, {
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
        throw new Error(`Failed to call tool: ${await callToolResponse.text()}`);
      }
      
      const toolResultData = await callToolResponse.json();
      
      // Add tool result to messages
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: toolResultData.result.content || [{type: "text", text: "No content returned"}]
          }
        ]
      });
      
      // Get final response from Claude with tool results
      const finalResponseFromClaude = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.7,
        system: "You are a helpful assistant for Flour Bakery. When asked about menu items, offerings, or bakery information, use the fetchWebsite tool to check https://www.flourbakery.com/menu#sweet-treats for accurate information. Answer in a friendly, conversational tone and format information in an easy-to-read way. Never make up menu items.",
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: initialResponse.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: toolResultData.result.content || [{type: "text", text: "No content returned"}]
              }
            ]
          }
        ]
      });
      
      // Extract text from final response
      finalResponse = finalResponseFromClaude.content
        .filter(content => content.type === "text")
        .map(content => content.text)
        .join('\n');
    }
    
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