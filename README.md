# Bakery Client

Web client for the MCP Bakery API server. This client provides a user-friendly web interface to interact with the MCP server using Claude's LLM capabilities.

## Features

- Web-based chat interface
- Connection to MCP server deployed on Railway
- Claude AI integration for natural language understanding
- Tool calling capabilities

## Technologies Used

- Node.js and Express
- Anthropic Claude API
- MCP (Model Context Protocol)
- HTML/CSS/JavaScript for the web interface

## How It Works

1. The client connects to an MCP server running on Railway
2. It provides a web interface for users to enter natural language queries
3. Claude processes the queries and decides when to use MCP tools
4. The client calls tools on the MCP server and returns results to Claude
5. Claude's final responses are displayed to the user

## Getting Started

### Running Locally

```
npm install
npm start
```

Visit http://localhost:3100 in your browser to use the client.

### Environment Variables

Create a `.env` file with:

```
ANTHROPIC_API_KEY=your_api_key_here
RAILWAY_SERVER_URL=https://bakery-production-8bbd.up.railway.app
MODEL_NAME=claude-3-sonnet-20240229
```

## Deployment

See [README-DEPLOY.md](README-DEPLOY.md) for instructions on deploying to Railway.

## Architecture

This client is part of a two-component system:
1. MCP Server: Hosts tools like fetchWebsite (deployed separately on Railway)
2. Web Client: Provides user interface and Claude integration (this repository)

Both components can be deployed to Railway for a complete cloud solution. 