# LiveKit Agent with MCP Tools

A voice assistant application built with the LiveKit Agents framework, capable of using Model Context Protocol (MCP) tools to interact with external services.

## Features

- Voice-based interaction with an AI assistant
- Integration with MCP tools from multiple external servers (flexible config)
- Speech-to-text (OpenAI Whisper)
- Natural language processing (OpenAI GPT-4o)
- Text-to-speech (ElevenLabs)
- Voice activity detection (Silero)

## Quick Start

1. **Create and activate a Python virtual environment:**
   ```sh
   make venv
   source venv/bin/activate
   ```
2. **Install dependencies:**
   ```sh
   make uv  # (optional, for fast installs)
   make install
   ```
3. **Set environment variables:**
   ```sh
   export OPENAI_API_KEY=your_openai_api_key
   export ELEVENLABS_API_KEY=your_elevenlabs_api_key
   export MCP_HMAC_SECRET=your_base64_hmac_secret
   ```
4. **Configure MCP servers** in `mcp_servers.yaml` (see below).
5. **Run tests:**
   ```sh
   make test
   ```
6. **Run the agent:**
   ```sh
   make run
   ```
7. 👋 Agent is ready! Say 'hello' to begin.


## Prerequisites

- Python 3.9+
- API keys for OpenAI and ElevenLabs
- Base64-encoded HMAC secret for MCP authentication
- At least one MCP server endpoint

## Configuration

### MCP Servers

Edit `mcp_servers.yaml` in the project root. Example:

```yaml
servers:
  - name: github
    url: https://github-mcp.example.com
    tools: [repo_search, issue_create]
  - name: flux
    url: https://flux-mcp.example.com
    tools: [deploy, status]
```

- The `tools` field is for documentation only; all tools from the server are available unless you filter them in code.

## Usage

Run the agent:

```sh
   make run
```

The agent connects to the specified LiveKit room and loads all MCP servers/tools from your config.

## Project Structure

- `agent.py`: Main agent implementation
- `mcp_servers.yaml`: MCP server configuration
- `mcp_client/`: MCP integration
  - `server.py`: Server connection handlers
  - `agent_tools.py`: MCP tools integration
  - `util.py`: Utilities
- `test_agent_config.py`: Unit tests
- `requirements.txt`: Python dependencies

## Testing

Run unit tests:

```sh
   make test
```

## Troubleshooting

### SSL Certificate Errors (CERTIFICATE_VERIFY_FAILED)

If you see an error like:

```
aiohttp.client_exceptions.ClientConnectorCertificateError: Cannot connect to host api.elevenlabs.io:443 ssl:True [SSLCertVerificationError: (1, '[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate (_ssl.c:1006)')]
```

#### macOS:
- Run the Install Certificates script for your Python version

```sh
make certs-macos
```

#### Linux:
- Ensure `ca-certificates` is installed and updated.

```sh
make certs-linux
```

#### Virtual environments:
- Create the venv with a Python that has access to system certificates.

**Do NOT disable SSL verification in production.**

## Acknowledgements

- [LiveKit](https://livekit.io/)
- [OpenAI](https://openai.com/)
- [ElevenLabs](https://elevenlabs.io/)
- [Silero](https://github.com/snakers4/silero-vad)