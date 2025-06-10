class TrelloVoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.isConnected = false;
        this.isPushToTalk = true; // Push-to-talk mode
        this.canInterrupt = true; // Allow interruptions during speech
        this.room = null;
        this.localParticipant = null;
        
        // Audio context for visualizations and VAD
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.mediaStream = null;
        
        // Push-to-talk state
        this.isPressed = false;
        this.pressStartTime = 0;
        this.accumulatedTranscript = '';
        
        // Speech Recognition
        this.recognition = null;
        this.speechSynthesis = null;
        this.currentUtterance = null;
        
        // DOM elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.voiceVisualizer = document.getElementById('voiceVisualizer');
        this.voiceCircle = document.querySelector('.voice-circle');
        this.voiceBars = document.getElementById('voiceBars');
        this.micIcon = document.getElementById('micIcon');
        this.conversationContent = document.getElementById('conversationContent');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        // Control buttons
        this.micButton = document.getElementById('micButton');
        this.interruptButton = document.getElementById('interruptButton');
        this.speakerButton = document.getElementById('speakerButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.clearChatButton = document.getElementById('clearChat');
        
        // Modal elements
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsButton = document.getElementById('closeSettings');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStatus('ready', 'Ready');
        this.startBackgroundAnimations();
        
        // Initialize audio context and speech recognition
        this.initAudioContext();
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        
        // Connect to LiveKit room
        this.connectToRoom();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Test if button exists
        if (!this.micButton) {
            console.error('Microphone button not found!');
            return;
        }
        
        // Push-to-talk controls
        this.micButton.addEventListener('mousedown', (e) => {
            console.log('Mouse down event triggered');
            this.startPushToTalk(e);
        });
        this.micButton.addEventListener('mouseup', (e) => {
            console.log('Mouse up event triggered');
            this.stopPushToTalk(e);
        });
        this.micButton.addEventListener('mouseleave', (e) => {
            console.log('Mouse leave event triggered');
            this.stopPushToTalk(e);
        });
        
        // Touch events for mobile
        this.micButton.addEventListener('touchstart', (e) => this.startPushToTalk(e));
        this.micButton.addEventListener('touchend', (e) => this.stopPushToTalk(e));
        this.micButton.addEventListener('touchcancel', (e) => this.stopPushToTalk(e));
        
        // Other controls
        this.interruptButton.addEventListener('click', () => this.manualInterrupt());
        this.speakerButton.addEventListener('click', () => this.toggleSpeaker());
        this.settingsButton.addEventListener('click', () => this.openSettings());
        this.clearChatButton.addEventListener('click', () => this.clearConversation());

        // Settings modal
        this.closeSettingsButton.addEventListener('click', () => this.closeSettings());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });

        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const command = btn.getAttribute('data-command');
                this.sendVoiceCommand(command);
            });
        });

        // Keyboard shortcuts for push-to-talk
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.ctrlKey && !this.isPressed) {
                e.preventDefault();
                this.startPushToTalk(e);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && e.ctrlKey && this.isPressed) {
                e.preventDefault();
                this.stopPushToTalk(e);
            }
        });
    }

    async connectToRoom() {
        try {
            this.updateStatus('connecting', 'Getting token...');
            
            // Fetch token from our new /token endpoint
            const tokenRes = await fetch('/token');
            if (!tokenRes.ok) {
                const error = await tokenRes.text();
                throw new Error(`Failed to get token: ${error}`);
            }
            const { token, url: livekitUrl } = await tokenRes.json();
            
            this.updateStatus('connecting', 'Connecting to LiveKit...');
            
            // Create a new Room instance
            this.room = new LiveKit.Room({
                audioCaptureDefaults: {
                    autoGainControl: true,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            // Set up event listeners for the room
            this.room
                .on(LiveKit.RoomEvent.Connected, () => {
                    this.isConnected = true;
                    console.log('Successfully connected to LiveKit room');
                    this.updateStatus('ready', 'Ready - Hold mic to speak');
                    this.addMessage('assistant', 'Voice assistant connected! Hold the microphone button and speak, then release to process.');
                })
                .on(LiveKit.RoomEvent.Disconnected, () => {
                    this.isConnected = false;
                    console.log('Disconnected from LiveKit room');
                    this.updateStatus('error', 'Disconnected. Please refresh.');
                })
                .on(LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
                    if (track.kind === LiveKit.Track.Kind.Audio) {
                        console.log('Subscribed to remote audio track');
                        track.attach(); // Audio track will play automatically
                    }
                })
                .on(LiveKit.RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
                    if (track.kind === LiveKit.Track.Kind.Audio) {
                        console.log('Unsubscribed from remote audio track');
                        track.detach();
                    }
                });

            // Connect to the room with the token
            await this.room.connect(livekitUrl, token);
            
            // Publish the user's microphone audio
            await this.room.localParticipant.setMicrophoneEnabled(true);
            this.localParticipant = this.room.localParticipant;
            console.log('Microphone published');

        } catch (error) {
            console.error('Failed to connect to voice service:', error);
            this.updateStatus('error', `Connection Failed: ${error.message}`);
            this.addMessage('system', `Error: Could not connect to the voice service. Please check the logs and ensure your environment variables are set correctly.`);
        }
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }
    }

    initSpeechRecognition() {
        console.log('Initializing speech recognition...');
        console.log('webkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
        console.log('SpeechRecognition available:', 'SpeechRecognition' in window);
        
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            this.recognition = new SpeechRecognition();
            console.log('Speech recognition initialized');
            
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                console.log('Speech recognition started');
                this.isListening = true;
                this.voiceCircle.classList.add('listening');
                this.voiceBars.classList.add('active');
                this.updateStatus('listening', 'Listening... (Release to process)');
            };
            
            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Accumulate all transcripts during the press-and-hold session
                if (finalTranscript) {
                    this.accumulatedTranscript += finalTranscript + ' ';
                }
                
                // Show interim results in real-time
                if (interimTranscript) {
                    this.updateStatus('listening', `Hearing: "${interimTranscript}"`);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'network') {
                    this.log('Network error - trying offline fallback...');
                    this.handleNetworkError();
                } else if (event.error === 'no-speech' && this.isPressed) {
                    // Continue listening while button is pressed
                    setTimeout(() => this.recognition.start(), 100);
                }
            };
            
            this.recognition.onend = () => {
                console.log('Speech recognition ended');
                this.isListening = false;
                this.voiceCircle.classList.remove('listening');
                this.voiceBars.classList.remove('active');
                
                // If we're still in push-to-talk mode and button is pressed, restart
                if (this.isPressed && this.isPushToTalk) {
                    setTimeout(() => this.recognition.start(), 100);
                } else if (this.accumulatedTranscript.trim()) {
                    // Process the accumulated transcript when button is released
                    this.handleVoiceInput(this.accumulatedTranscript.trim());
                    this.accumulatedTranscript = '';
                }
            };
        } else {
            console.warn('Speech recognition not supported');
            this.showNotification('Speech recognition not supported in this browser', 'warning');
        }
    }

    initSpeechSynthesis() {
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            
            // Get available voices
            this.speechSynthesis.onvoiceschanged = () => {
                const voices = this.speechSynthesis.getVoices();
                console.log('Available voices:', voices.length);
            };
        } else {
            console.warn('Speech synthesis not supported');
        }
    }

    async startPushToTalk(event) {
        event.preventDefault();
        console.log('Push-to-talk started');
        
        if (this.isPressed || this.isSpeaking || !this.isConnected) {
            console.log('Push-to-talk blocked:', { isPressed: this.isPressed, isSpeaking: this.isSpeaking, isConnected: this.isConnected });
            return;
        }
        
        try {
            this.isPressed = true;
            this.pressStartTime = Date.now();
            this.accumulatedTranscript = '';
            
            // Visual feedback
            this.micButton.classList.add('active');
            this.voiceCircle.classList.add('pressed');
            
            // Get microphone access if needed
            if (!this.mediaStream) {
                console.log('Requesting microphone access...');
                this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                console.log('Microphone access granted');
                
                // Connect to audio analyser for visualization
                const source = this.audioContext.createMediaStreamSource(this.mediaStream);
                source.connect(this.analyser);
                
                // Start voice visualization
                this.startVoiceVisualization();
            }
            
            // Start speech recognition
            if (this.recognition && !this.isListening) {
                console.log('Starting speech recognition...');
                this.recognition.start();
            } else {
                console.log('Speech recognition not available or already listening');
            }
            
        } catch (error) {
            console.error('Failed to start push-to-talk:', error);
            this.showNotification('Microphone access required - ' + error.message, 'error');
            this.stopPushToTalk(event);
        }
    }

    stopPushToTalk(event) {
        event.preventDefault();
        console.log('Push-to-talk stopped');
        
        if (!this.isPressed) {
            console.log('Not currently pressed, ignoring stop');
            return;
        }
        
        this.isPressed = false;
        
        // Visual feedback
        this.micButton.classList.remove('active');
        this.voiceCircle.classList.remove('pressed');
        
        // Stop speech recognition
        if (this.recognition && this.isListening) {
            console.log('Stopping speech recognition...');
            this.recognition.stop();
        }
        
        // Show processing status
        this.updateStatus('processing', 'Processing...');
        
        // Check minimum press duration (avoid accidental taps)
        const pressDuration = Date.now() - this.pressStartTime;
        console.log('Press duration:', pressDuration + 'ms');
        
        if (pressDuration < 300) {
            this.updateStatus('ready', 'Ready - Hold mic to speak');
            this.showNotification('Hold the microphone button longer to record', 'info');
            this.accumulatedTranscript = '';
            return;
        }
        
        console.log('Accumulated transcript:', this.accumulatedTranscript);
        // Processing will happen in recognition.onend
    }

    interruptSpeech() {
        if (this.isSpeaking) {
            console.log('Interrupting current speech');
            this.speechSynthesis.cancel();
            this.isSpeaking = false;
            this.voiceCircle.classList.remove('speaking');
            this.updateStatus('ready', 'Ready - Hold mic to speak');
            this.interruptButton.style.display = 'none';
        }
    }

    manualInterrupt() {
        console.log('Manual interrupt triggered');
        this.interruptSpeech();
        this.showNotification('Speech interrupted', 'info');
    }

    handleVoiceInput(transcript) {
        console.log('Voice input received:', transcript);
        
        // Filter out very short or unclear inputs
        if (transcript.length < 3) {
            console.log('Transcript too short, ignoring');
            this.updateStatus('ready', 'Ready - Hold mic to speak');
            this.showNotification('Please speak a bit longer', 'info');
            return;
        }
        
        console.log('Processing voice input:', transcript);
        this.addMessage('user', transcript);
        this.processVoiceInput(transcript);
        
        // Reset to ready state after processing
        setTimeout(() => {
            if (!this.isSpeaking) {
                this.updateStatus('ready', 'Ready - Hold mic to speak');
            }
        }, 1000);
    }

    handleNetworkError() {
        this.showNotification('Network error - Speech recognition requires internet connection', 'error');
        this.updateStatus('ready', 'Ready - Network issue detected');
        
        // Simulate input for testing
        setTimeout(() => {
            this.showNotification('Try: "show me my boards" or "create new card"', 'info');
        }, 2000);
    }

    async startListening() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.isListening = true;
            this.micButton.classList.add('active');
            this.voiceCircle.classList.add('listening');
            this.voiceBars.classList.add('active');
            this.updateStatus('listening', 'Listening...');
            
            // Connect audio stream to analyser for visualization
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.startVoiceVisualization();
            
            // Simulate voice recognition
            setTimeout(() => {
                this.stopListening();
                this.processVoiceInput("Hello, show me my Trello boards");
            }, 3000);
            
        } catch (error) {
            throw error;
        }
    }

    stopListening() {
        this.isListening = false;
        this.micButton.classList.remove('active');
        this.voiceCircle.classList.remove('listening');
        this.voiceBars.classList.remove('active');
        this.updateStatus('connected', 'Connected');
        this.stopVoiceVisualization();
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.toggleMicrophone();
        }
    }

    startVoiceVisualization() {
        const animate = () => {
            if (!this.isListening) return;
            
            this.analyser.getByteFrequencyData(this.dataArray);
            
            // Update voice bars based on audio data
            const bars = this.voiceBars.querySelectorAll('.bar');
            for (let i = 0; i < bars.length; i++) {
                const value = this.dataArray[i * 4] || 0;
                const height = (value / 255) * 50 + 10;
                bars[i].style.height = height + 'px';
            }
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    stopVoiceVisualization() {
        // Reset bars to default height
        const bars = this.voiceBars.querySelectorAll('.bar');
        bars.forEach(bar => {
            bar.style.height = '10px';
        });
    }

    processVoiceInput(transcript) {
        this.addMessage('user', transcript);
        this.showLoading(true);
        
        // Simulate processing delay
        setTimeout(() => {
            this.showLoading(false);
            this.generateResponse(transcript);
        }, 1500);
    }

    generateResponse(input) {
        // Simulate AI response based on input
        let response = "I'm processing your request...";
        
        if (input.toLowerCase().includes('boards')) {
            response = "I found 3 Trello boards: 'Personal Tasks', 'Work Projects', and 'Ideas'. Which one would you like to explore?";
        } else if (input.toLowerCase().includes('cards')) {
            response = "You have 12 cards assigned to you. 3 are due this week, including 'Review quarterly report' due tomorrow.";
        } else if (input.toLowerCase().includes('create')) {
            response = "I'll help you create a new card. What should the title be and which list should I add it to?";
        } else if (input.toLowerCase().includes('hello')) {
            response = "Hello! I'm your Trello voice assistant. I can help you manage your boards, create cards, check due dates, and much more. What would you like to do?";
        }
        
        this.addMessage('assistant', response);
        this.speakResponse(response);
    }

    speakResponse(text) {
        if (this.speechSynthesis) {
            // Use native speech synthesis for real voice output
            this.currentUtterance = new SpeechSynthesisUtterance(text);
            this.currentUtterance.rate = 1.1;
            this.currentUtterance.pitch = 1.0;
            this.currentUtterance.volume = 0.8;
            
            // Get a good voice if available
            const voices = this.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.lang.includes('en')
            );
            if (preferredVoice) {
                this.currentUtterance.voice = preferredVoice;
            }
            
            this.currentUtterance.onstart = () => {
                this.isSpeaking = true;
                this.voiceCircle.classList.add('speaking');
                this.updateStatus('speaking', 'Speaking...');
                this.interruptButton.style.display = 'block';
            };
            
            this.currentUtterance.onend = () => {
                this.isSpeaking = false;
                this.voiceCircle.classList.remove('speaking');
                this.updateStatus('ready', 'Ready - Hold mic to speak');
                this.interruptButton.style.display = 'none';
            };
            
            this.currentUtterance.onerror = (error) => {
                console.error('Speech synthesis error:', error);
                this.isSpeaking = false;
                this.voiceCircle.classList.remove('speaking');
                this.updateStatus('ready', 'Ready - Hold mic to speak');
                this.interruptButton.style.display = 'none';
            };
            
            this.speechSynthesis.speak(this.currentUtterance);
        } else {
            // Fallback to simulated speaking
            this.isSpeaking = true;
            this.voiceCircle.classList.add('speaking');
            this.updateStatus('speaking', 'Speaking...');
            this.interruptButton.style.display = 'block';
            
            const speakingDuration = Math.max(2000, text.length * 50);
            
            setTimeout(() => {
                this.isSpeaking = false;
                this.voiceCircle.classList.remove('speaking');
                this.updateStatus('ready', 'Ready - Hold mic to speak');
                this.interruptButton.style.display = 'none';
            }, speakingDuration);
        }
    }

    sendVoiceCommand(command) {
        if (!this.isConnected) {
            this.showNotification('Please wait for connection...', 'warning');
            return;
        }
        
        this.processVoiceInput(command);
    }

    addMessage(sender, content) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        
        const avatarEl = document.createElement('div');
        avatarEl.className = 'message-avatar';
        avatarEl.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.innerHTML = `<p>${content}</p>`;
        
        messageEl.appendChild(avatarEl);
        messageEl.appendChild(contentEl);
        
        this.conversationContent.appendChild(messageEl);
        this.conversationContent.scrollTop = this.conversationContent.scrollHeight;
    }

    clearConversation() {
        const messages = this.conversationContent.querySelectorAll('.message');
        messages.forEach((message, index) => {
            if (index > 0) { // Keep the first welcome message
                setTimeout(() => message.remove(), index * 100);
            }
        });
    }

    updateStatus(state, text) {
        this.statusDot.className = `status-dot ${state}`;
        this.statusText.textContent = text;
    }

    showLoading(show) {
        this.loadingIndicator.classList.toggle('active', show);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 10px;
            color: var(--primary-text);
            backdrop-filter: blur(20px);
            z-index: 2000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    toggleSpeaker() {
        this.speakerButton.classList.toggle('active');
        const isActive = this.speakerButton.classList.contains('active');
        this.showNotification(isActive ? 'Speaker muted' : 'Speaker unmuted', 'info');
    }

    openSettings() {
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    startBackgroundAnimations() {
        // Add floating particles animation
        setInterval(() => {
            this.createFloatingParticle();
        }, 3000);
    }

    createFloatingParticle() {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: var(--accent-color);
            border-radius: 50%;
            pointer-events: none;
            opacity: 0.7;
            z-index: 5;
            left: ${Math.random() * 100}%;
            bottom: -10px;
            animation: floatUp 8s linear;
        `;
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 8000);
    }
}

// Additional CSS for floating particles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    @keyframes floatUp {
        0% {
            transform: translateY(0) scale(0);
            opacity: 0;
        }
        10% {
            opacity: 0.7;
            transform: translateY(-20px) scale(1);
        }
        90% {
            opacity: 0.7;
            transform: translateY(-80vh) scale(1);
        }
        100% {
            transform: translateY(-100vh) scale(0);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trelloAssistant = new TrelloVoiceAssistant();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrelloVoiceAssistant;
} 