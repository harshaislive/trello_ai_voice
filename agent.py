import os
import logging
from pathlib import Path
# from dotenv import load_dotenv  # No longer needed
import yaml
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.agents.llm import ChatChunk
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import openai, silero, elevenlabs
from mcp_client import MCPServerSse
from mcp_client.agent_tools import MCPToolsIntegration
import re
import fnmatch

# Remove load_dotenv() since we use env vars directly

# Check for required environment variables at startup
REQUIRED_ENV_VARS = ["OPENAI_API_KEY", "ELEVEN_API_KEY"]
missing = [var for var in REQUIRED_ENV_VARS if not os.environ.get(var)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}. Please set them before running the agent.")

class FunctionAgent(Agent):
    """A LiveKit agent that uses MCP tools from one or more MCP servers."""

    def __init__(self):
        # Load system prompt from file if present, else from env, else use a minimal default
        prompt_path = os.environ.get("AGENT_SYSTEM_PROMPT_FILE", "system_prompt.txt")
        if os.path.exists(prompt_path):
            with open(prompt_path, "r") as f:
                instructions = f.read()
        else:
            instructions = os.environ.get("AGENT_SYSTEM_PROMPT", "You are a helpful assistant communicating through voice. Use the available MCP tools to answer questions.")
        # Make LLM model configurable via env var
        llm_model = os.environ.get("AGENT_LLM_MODEL", "gpt-4.1-mini")
        super().__init__(
            instructions=instructions,
            stt=openai.STT(),
            llm=openai.LLM(model=llm_model),
            tts=elevenlabs.TTS(),
            vad=silero.VAD.load(),
            allow_interruptions=True
        )

    async def llm_node(self, chat_ctx, tools, model_settings):
        """Override the llm_node to say a message when a tool call is detected."""
        activity = self._activity
        tool_call_detected = False

        # Get the original response from the parent class
        async for chunk in super().llm_node(chat_ctx, tools, model_settings):
            # Check if this chunk contains a tool call
            if isinstance(chunk, ChatChunk) and chunk.delta and chunk.delta.tool_calls and not tool_call_detected:
                # Say the checking message only once when we detect the first tool call
                tool_call_detected = True
                activity.say("Sure, I'll check that for you.")

            yield chunk

def load_mcp_config(config_path="mcp_servers.yaml"):
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"MCP config file not found: {config_path}")
    with open(config_path, "r") as f:
        return yaml.safe_load(f)["servers"]

def expand_env_vars(value):
    # Replace ${VARNAME} with the value from the environment
    return re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1), ""), value)

async def entrypoint(ctx: JobContext):
    """Main entrypoint for the LiveKit agent application."""
    # Load MCP server configs
    mcp_configs = load_mcp_config()
    mcp_servers = []
    allowed_tools_map = {}
    for conf in mcp_configs:
        headers = {}
        for k, v in conf.get("headers", {}).items():
            headers[k] = expand_env_vars(v)
        params = {"url": conf["url"]}
        if headers:
            params["headers"] = headers
        mcp_servers.append(
            MCPServerSse(
                params=params,
                cache_tools_list=True,
                name=conf.get("name", conf["url"])
            )
        )
        if "allowed_tools" in conf:
            allowed_tools_map[conf.get("name", conf["url"])] = set(conf["allowed_tools"])

    # Patch MCPToolsIntegration to filter tools per server
    orig_get_function_tools = MCPToolsIntegration.prepare_dynamic_tools
    async def filtered_prepare_dynamic_tools(mcp_servers, convert_schemas_to_strict=True, auto_connect=True):
        prepared_tools = []
        for server in mcp_servers:
            name = getattr(server, "name", None)
            allowed = allowed_tools_map.get(name)
            tools = await server.list_tools()
            if allowed is not None:
                allowed_patterns = list(allowed)
                tools = [t for t in tools if any(fnmatch.fnmatch(t.name, pat) for pat in allowed_patterns)]
            # Use MCPUtil to convert to FunctionTool and decorate
            from mcp_client.util import MCPUtil
            mcp_tools = [MCPUtil.to_function_tool(t, server, convert_schemas_to_strict) for t in tools]
            for tool_instance in mcp_tools:
                try:
                    decorated_tool = MCPToolsIntegration._create_decorated_tool(tool_instance)
                    prepared_tools.append(decorated_tool)
                except Exception as e:
                    logging.getLogger("mcp-agent-tools").error(f"Failed to prepare tool '{tool_instance.name}': {e}")
        return prepared_tools
    MCPToolsIntegration.prepare_dynamic_tools = filtered_prepare_dynamic_tools

    agent = await MCPToolsIntegration.create_agent_with_tools(
        agent_class=FunctionAgent,
        mcp_servers=mcp_servers
    )

    await ctx.connect()
    session = AgentSession()
    print("👋 Agent is ready! Say 'hello' to begin.")
    # Optionally, greet via voice if possible
    if hasattr(agent, 'speak') and callable(getattr(agent, 'speak', None)):
        await agent.speak("Hello! I am your promotion assistant. How can I help you today?")
    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
