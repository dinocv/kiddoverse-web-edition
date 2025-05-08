// Global KiddoVerse namespace
var KV = KV || {};

KV.UI = class UI {
    constructor(gameInstance) {
        this.game = gameInstance;
        // Find the name of the currently selected block type, default to 'grass' if not found
        this.selectedBlockTypeName = Object.keys(KV.BLOCK_TYPES).find(key => KV.BLOCK_TYPES[key] === this.game.currentBlockType)?.toLowerCase() || 'grass';

        this.initThemeSelector(); // Initialize theme selector first
        this.initBlockSelector();
        this.initMobileControlsDisplay();
        this.initChat();
    }

    // Set up theme switching buttons
    initThemeSelector() {
        const themeButtons = document.querySelectorAll('.theme-button');
        if (!themeButtons.length) {
            console.warn("Theme selector buttons not found in HTML!");
            return;
        }

        themeButtons.forEach(button => {
            // Highlight the button corresponding to the currently active theme
            if (button.dataset.theme === this.game.currentThemeName) {
                button.classList.add('active-theme');
            }
            // Add click listener to change theme
            button.addEventListener('click', (e) => {
                const themeName = e.currentTarget.dataset.theme;
                this.game.changeTheme(themeName); // Call game method to change theme (will reload page)
            });
        });
        // Potential future enhancement: Update block selector based on theme?
    }

    // Set up block selection UI
    initBlockSelector() {
        const selectorElement = document.getElementById('block-selector');
        if (!selectorElement) {
            console.error("Block selector UI element not found!");
            return;
        }
        const options = selectorElement.getElementsByClassName('block-option');

        // Add click listeners to each block option
        for (let option of options) {
            option.addEventListener('click', (e) => {
                // Deactivate all other options
                for (let opt of options) {
                    opt.classList.remove('active');
                }
                // Activate the clicked option
                e.currentTarget.classList.add('active');
                const blockName = e.currentTarget.dataset.blockType.toUpperCase();
                // Set the game's current block type if it's a valid type
                if (KV.BLOCK_TYPES[blockName] !== undefined) {
                    this.game.setCurrentBlockType(KV.BLOCK_TYPES[blockName]);
                    this.selectedBlockTypeName = blockName.toLowerCase();
                }
            });
        }

        // Set the initial active block in the UI based on game state
        let initialActiveOption = selectorElement.querySelector(`.block-option[data-block-type="${this.selectedBlockTypeName}"]`);
        // Fallback: If the current block isn't in the selector, activate the first option
        if (!initialActiveOption && options.length > 0) {
            initialActiveOption = options[0];
            // Update the game state to match the fallback UI selection
            this.game.setCurrentBlockType(KV.BLOCK_TYPES[options[0].dataset.blockType.toUpperCase()]);
        }
        if (initialActiveOption) {
            initialActiveOption.classList.add('active');
        }
    }

    // Show/hide mobile controls based on touch device detection
    initMobileControlsDisplay() {
        const mobileControls = document.getElementById('mobile-controls');
        const crosshair = document.getElementById('crosshair');
        const blockSelector = document.getElementById('block-selector');
        const chatWidget = document.getElementById('chat-widget');

        // Check if all required elements exist
        if (!mobileControls || !crosshair || !blockSelector || !chatWidget) {
            console.error("One or more UI elements for mobile/desktop toggle not found!");
            return;
        }

        if (KV.isTouchDevice()) {
            mobileControls.style.display = 'block';
            crosshair.style.display = 'none';
            // Adjust positions of other UI elements to avoid overlap with mobile controls
            blockSelector.style.bottom = '180px'; // Example value, adjust as needed
            chatWidget.style.bottom = '180px'; // Example value, adjust as needed
        } else {
            mobileControls.style.display = 'none';
            crosshair.style.display = 'block';
            // Reset positions for desktop view
            blockSelector.style.bottom = '20px';
            chatWidget.style.bottom = '20px';
        }
    }

    // Initialize chat widget functionality
    initChat() {
        const chatToggle = document.getElementById('chat-toggle');
        const chatWindow = document.getElementById('chat-window');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-chat-button');
        const emojiButton = document.getElementById('emoji-picker-button');
        const emojiPalette = document.getElementById('emoji-palette');

        if (!chatToggle || !chatWindow || !chatInput || !sendButton || !emojiButton || !emojiPalette) {
            console.error("One or more chat UI elements not found!");
            return;
        }

        // Toggle chat window visibility
        chatToggle.addEventListener('click', () => {
            const isHidden = chatWindow.style.display === 'none' || chatWindow.style.display === '';
            chatWindow.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
                chatInput.focus(); // Focus input when opening
            } else {
                chatInput.blur(); // Unfocus when closing
            }
        });

        // Send message handlers
        sendButton.addEventListener('click', () => this.sendChatMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
                e.preventDefault(); // Prevent potential form submission/newline
            }
        });

        // Emoji picker handlers
        emojiButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from closing palette immediately
            emojiPalette.style.display = emojiPalette.style.display === 'none' || emojiPalette.style.display === '' ? 'grid' : 'none';
        });
        emojiPalette.querySelectorAll('span').forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                chatInput.value += e.target.textContent; // Append emoji
                emojiPalette.style.display = 'none'; // Hide palette
                chatInput.focus();
            });
        });

        // Hide emoji palette if clicking outside of it
        document.addEventListener('click', (e) => {
            if (!emojiPalette.contains(e.target) && e.target !== emojiButton && emojiPalette.style.display !== 'none') {
                emojiPalette.style.display = 'none';
            }
        });

        this.addChatMessage("System", "Welcome to KiddoVerse! Choose a world and have fun! ✨");
    }

    // Send chat message logic
    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message) {
            this.addChatMessage("You", message); // Display locally
            input.value = ''; // Clear input

            const safeMessage = this.filterMessage(message);
            // In a real multiplayer game, 'safeMessage' would be sent to the server here
            // if (safeMessage !== message) { // Optional: Notify user about filtering }
        }
    }

    // Add a message to the chat display
    addChatMessage(sender, message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        const messageElement = document.createElement('p');

        // Basic sanitization and length limits
        const SENDER_MAX_LEN = 20;
        const MSG_MAX_LEN = 150;
        const escapeHTML = (str) => str.replace(/[&<>"']/g, m => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": ''' }[m]));

        const safeSender = escapeHTML(sender.substring(0, SENDER_MAX_LEN));
        const safeMessage = escapeHTML(message.substring(0, MSG_MAX_LEN));

        messageElement.innerHTML = `<strong>${safeSender}:</strong> ${safeMessage}`;
        messagesContainer.appendChild(messageElement);
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Basic profanity filter placeholder
    filterMessage(message) {
        // Replace with a more robust filter or library for production
        const badWords = ["badword", "ugly", "stupid", "hate"]; // Expand significantly
        let filteredMessage = message;
        badWords.forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi'); // Match whole word, case insensitive
            filteredMessage = filteredMessage.replace(regex, '💜💜💜'); // Replace with something friendly
        });
        return filteredMessage;
    }
};
console.log("KiddoVerse Themes: UI class updated for theme selector.");
