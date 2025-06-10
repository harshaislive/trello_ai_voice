# 🎤 Trello AI Voice Assistant

A sophisticated voice-controlled AI assistant for Trello, built with Python, LiveKit, and modern web technologies. Features push-to-talk interaction, real-time speech recognition, and a beautiful Jarvis-style interface.

## ✨ Features

### 🎯 **Voice Interface**
- **Push-to-Talk**: Hold microphone button to speak, release to process
- **Real-time Speech Recognition**: Browser-native speech-to-text
- **Voice Synthesis**: High-quality text-to-speech responses
- **Interrupt Support**: Cut off AI responses by speaking

### 🎨 **Modern UI**
- **Jarvis-style Interface**: Inspired by Iron Man's AI assistant
- **Glassmorphism Design**: Beautiful translucent effects
- **Animated Voice Visualizer**: Real-time audio level displays
- **Responsive Design**: Works on desktop and mobile

### 🔗 **Trello Integration**
- **MCP Protocol**: Model Context Protocol for tool integration
- **Board Management**: Create, view, and manage Trello boards
- **Card Operations**: Add, update, and organize cards
- **List Management**: Create and modify Trello lists

### 🛠️ **Technical Stack**
- **Backend**: Python, LiveKit Agents, OpenAI GPT-4
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Voice**: Web Speech API, ElevenLabs TTS
- **Architecture**: MCP (Model Context Protocol)

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js (for development)
- Modern web browser (Chrome/Edge recommended)
- Microphone access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harshaislive/trello_ai_voice.git
   cd trello_ai_voice
   ```

2. **Set up Python environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys:
   # OPENAI_API_KEY=your_openai_key
   # ELEVEN_API_KEY=your_elevenlabs_key
   ```

4. **Start the system**
   ```bash
   python quick_test.py
   ```

5. **Open in browser**
   - Main App: http://localhost:8080/
   - Debug Tool: http://localhost:8080/debug.html

## 💡 Usage

### Voice Commands
- **"Show me my Trello boards"** - Display your boards
- **"Create a new card called [name]"** - Add a card
- **"What cards are due this week?"** - Check deadlines
- **"Move card [name] to [list]"** - Organize cards

### Interface Controls
- **Hold Mic Button**: Record voice command
- **Ctrl+Space**: Keyboard push-to-talk
- **Quick Actions**: Pre-defined command buttons
- **Settings**: Adjust voice sensitivity and themes

## 🔧 Configuration

### MCP Servers (`mcp_servers.yaml`)
```yaml
servers:
  - name: Trello
    type: mcp
    url: https://trello-mcp-server-production.up.railway.app/sse
```

### Voice Settings
- **Voice ID**: Customizable ElevenLabs voice
- **Speech Rate**: Adjustable speaking speed
- **Recognition Language**: Default English (US)

## 📁 Project Structure

```
trello_ai_voice/
├── frontend/
│   ├── index.html          # Main application
│   ├── debug.html          # Voice testing tool
│   ├── script.js           # Voice processing logic
│   ├── style.css           # Jarvis-style UI
│   └── server.py           # Frontend HTTP server
├── agent_core.py           # Voice agent implementation
├── main.py                 # LiveKit agent entry point
├── mcp_config.py           # MCP client configuration
├── mcp_servers.yaml        # Server definitions
├── system_prompt.txt       # AI assistant personality
├── requirements.txt        # Python dependencies
└── quick_test.py           # System testing script
```

## 🔍 Debugging

### Debug Tools
- **Debug Interface**: http://localhost:8080/debug.html
- **Test Endpoint**: http://localhost:8080/test
- **Status API**: http://localhost:8080/api/status

### Common Issues
1. **Network Error**: Speech recognition requires internet
2. **Microphone Access**: Enable browser permissions
3. **HTTPS Required**: Some browsers need secure context

### Logging
- **Terminal Logs**: Real-time server activity
- **Browser Console**: Client-side debugging (F12)
- **Colored Output**: Different log levels with timestamps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LiveKit](https://livekit.io/) for real-time communication
- [OpenAI](https://openai.com/) for GPT-4 integration
- [ElevenLabs](https://elevenlabs.io/) for voice synthesis
- [Trello](https://trello.com/) for project management API
- [MCP Protocol](https://github.com/modelcontextprotocol) for tool integration

## 📞 Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/harshaislive/trello_ai_voice/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/harshaislive/trello_ai_voice/discussions)
- **Documentation**: Check the [Wiki](https://github.com/harshaislive/trello_ai_voice/wiki) for detailed guides

---

**Built with ❤️ by [harshaislive](https://github.com/harshaislive)**

*Experience the future of voice-controlled productivity!* 🚀
