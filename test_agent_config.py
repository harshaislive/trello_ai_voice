import pytest
from agent import load_mcp_config

def test_load_mcp_config_success(tmp_path):
    config_content = """
servers:
  - name: github
    url: https://github-mcp.example.com
    tools: [repo_search, issue_create]
  - name: flux
    url: https://flux-mcp.example.com
    tools: [deploy, status]
"""
    config_file = tmp_path / "mcp_servers.yaml"
    config_file.write_text(config_content)
    servers = load_mcp_config(str(config_file))
    assert len(servers) == 2
    assert servers[0]["name"] == "github"
    assert servers[1]["url"] == "https://flux-mcp.example.com"

def test_load_mcp_config_missing_file():
    with pytest.raises(FileNotFoundError):
        load_mcp_config("nonexistent.yaml")

def test_load_mcp_config_malformed(tmp_path):
    config_file = tmp_path / "mcp_servers.yaml"
    config_file.write_text("not: valid: yaml: : :")
    with pytest.raises(Exception):
        load_mcp_config(str(config_file)) 