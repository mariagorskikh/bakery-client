# Deploying the MCP Web Client to Railway

This guide will help you deploy the web-based MCP client to Railway, which will connect to your existing MCP server.

## Prerequisites

1. A Railway account
2. Git and the Railway CLI installed
3. Your MCP server already deployed on Railway
4. An Anthropic API key for Claude

## Deployment Steps

1. **Initialize a git repository** (if not done already):
   ```
   cd mcp-demo
   git init
   git add .
   git commit -m "Prepare client for deployment"
   ```

2. **Create a new Railway project for the client**:
   ```
   railway login
   railway init
   ```
   When prompted, create a new project and name it something like "mcp-client".

3. **Set environment variables**:
   ```
   railway variables set ANTHROPIC_API_KEY=your_api_key_here
   railway variables set RAILWAY_SERVER_URL=https://bakery-production-8bbd.up.railway.app
   railway variables set MODEL_NAME=claude-3-sonnet-20240229
   ```

4. **Deploy to Railway**:
   ```
   railway up
   ```

5. **Get your deployment URL**:
   ```
   railway open
   ```
   This will open the Railway dashboard in your browser. Click on your deployment to find the generated URL.

## Usage

Once deployed, you can access the web interface at the URL provided by Railway. The interface allows you to:

1. Enter natural language queries
2. Have Claude process your queries
3. Use the fetchWebsite tool to retrieve content from websites
4. See Claude's responses that incorporate the tool results

## Architecture

This deployment creates a full stack where:
1. The web client runs on Railway with a web interface
2. It connects to your MCP server that's also on Railway
3. It uses Claude's API to process natural language
4. The client acts as a middleware between users, Claude, and your MCP server

## Troubleshooting

If you encounter issues:

1. Check that your ANTHROPIC_API_KEY is correctly set
2. Verify that RAILWAY_SERVER_URL points to your working MCP server
3. Check the Railway logs for error messages
4. Ensure your client can reach your MCP server (they should be able to communicate since both are on Railway)

## Updating the Deployment

To update your deployment after making changes:
```
git add .
git commit -m "Update client"
railway up
``` 