// Global KiddoVerse namespace
var KV = KV || {};

KV.UI = class UI {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.selectedBlockTypeName = Object.keys(KV.BLOCK_TYPES).find(key => KV.BLOCK_TYPES[key] === this.game.currentBlockType)?.toLowerCase() || 'grass'; // Added nullish coalescing

        this.initThemeSelector(); // Initialize theme selector first
        this.initBlockSelector();
        this.initMobileControlsDisplay();
        this.initChat();
    }

    initThemeSelector() { // NEW METHOD
        const themeButtons = document.querySelectorAll('.theme-button');
        if (!themeButtons.length) { console.warn("Theme selector buttons not found!"); return; }

        themeButtons.forEach(button => {
            if (button.dataset.theme === this.game.currentThemeName) {
                button.classList.add('active-theme');
            }
            button.addEventListener('click', (e) => {
                const themeName = e.currentTarget.dataset.theme;
                this.game.changeTheme(themeName); // Call game method to change theme
            });
        });
        // Update the block selector based on the current theme's initially available blocks if needed.
        // For now, all blocks are shown.
    }

    initBlockSelector() { /* ... (same as "Modern Lego Visual", ensure block options for moon_rock, metal_panel are in index.html if always selectable) ... */
        const selectorElement = document.getElementById('block-selector');
        if (!selectorElement) { console.error("Block selector UI element not found!"); return; }
        const options = selectorElement.getElementsByClassName('block-option');
        for (let option of options) {
            option.addEventListener('click', (e) => {
                for (let opt of options) { opt.classList.remove('active'); }
                e.currentTarget.classList.add('active');
                const blockName = e.currentTarget.dataset.blockType.toUpperCase();
                if (KV.BLOCK_TYPES[blockName] !== undefined) { this.game.setCurrentBlockType(KV.BLOCK_TYPES[blockName]); this.selectedBlockTypeName = blockName.toLowerCase(); }
            });
        }
        let initialActiveOption = selectorElement.querySelector(`.block-option[data-block-type="${this.selectedBlockTypeName}"]`);
        if (!initialActiveOption && options.length > 0) { // Fallback if selectedBlockTypeName isn't in selector
            initialActiveOption = options[0];
            this.game.setCurrentBlockType(KV.BLOCK_TYPES[options[0].dataset.blockType.toUpperCase()]);
        }
        if (initialActiveOption) initialActiveOption.classList.add('active');
    }

    initMobileControlsDisplay() { /* ... (same as "Modern Lego Visual") ... */
        const mobileControls = document.getElementById('mobile-controls'); const crosshair = document.getElementById('crosshair');
        const blockSelector = document.getElementById('block-selector'); const chatWidget = document.getElementById('chat-widget');
        if(!mobileControls||!crosshair||!blockSelector||!chatWidget){console.error("One or more mobile UI elements not found!"); return;}
        if(KV.isTouchDevice()){mobileControls.style.display='block'; if(crosshair)crosshair.style.display='none'; if(blockSelector)blockSelector.style.bottom='180px'; if(chatWidget)chatWidget.style.bottom='180px';}
        else{mobileControls.style.display='none'; if(crosshair)crosshair.style.display='block'; if(blockSelector)blockSelector.style.bottom='20px'; if(chatWidget)chatWidget.style.bottom='20px';}
    }
    initChat() { /* ... (same as "Modern Lego Visual") ... */
        const chatToggle=document.getElementById('chat-toggle'); const chatWindow=document.getElementById('chat-window'); const chatInput=document.getElementById('chat-input'); const sendButton=document.getElementById('send-chat-button'); const emojiButton=document.getElementById('emoji-picker-button'); const emojiPalette=document.getElementById('emoji-palette');
        if(!chatToggle||!chatWindow||!chatInput||!sendButton||!emojiButton||!emojiPalette){console.error("One or more chat UI elements not found!"); return;}
        chatToggle.addEventListener('click',()=>{const isHidden=chatWindow.style.display==='none'||chatWindow.style.display===''; chatWindow.style.display=isHidden?'block':'none'; if(isHidden){chatInput.focus();}else{chatInput.blur();}});
        sendButton.addEventListener('click',()=>this.sendChatMessage()); chatInput.addEventListener('keypress',(e)=>{if(e.key==='Enter'){this.sendChatMessage();e.preventDefault();}});
        emojiButton.addEventListener('click',(e)=>{e.stopPropagation(); emojiPalette.style.display=emojiPalette.style.display==='none'||emojiPalette.style.display===''?'grid':'none';});
        emojiPalette.querySelectorAll('span').forEach(emoji=>{emoji.addEventListener('click',(e)=>{chatInput.value+=e.target.textContent; emojiPalette.style.display='none'; chatInput.focus();});});
        document.addEventListener('click',(e)=>{if(!emojiPalette.contains(e.target)&&e.target!==emojiButton&&emojiPalette.style.display!=='none'){emojiPalette.style.display='none';}});
        this.addChatMessage("System", "Welcome to KiddoVerse! Choose a world and have fun! ✨");
    }
    sendChatMessage() { /* ... (same) ... */ const input = document.getElementById('chat-input'); const message=input.value.trim(); if(message){this.addChatMessage("You",message);input.value=''; const safeMessage=this.filterMessage(message); /* TODO: Send 'safeMessage' */}}
    addChatMessage(sender, message) { /* ... (same) ... */ const messagesContainer=document.getElementById('chat-messages'); if(!messagesContainer)return; const messageElement=document.createElement('p'); const SENDER_MAX_LEN=20; const MSG_MAX_LEN=150; const escapeHTML=(str)=>str.replace(/[&<>"']/g,m=>({'&':'&','<':'<','>':'>','"':'"',"'":'''}[m])); const safeSender=escapeHTML(sender.substring(0,SENDER_MAX_LEN)); const safeMessage=escapeHTML(message.substring(0,MSG_MAX_LEN)); messageElement.innerHTML=`<strong>${safeSender}:</strong> ${safeMessage}`; messagesContainer.appendChild(messageElement); messagesContainer.scrollTop=messagesContainer.scrollHeight;}
    filterMessage(message) { /* ... (same) ... */ const badWords=["badword","ugly","stupid"]; let filteredMessage=message; badWords.forEach(word=>{const regex=new RegExp(`\\b${word}\\b`,'gi'); filteredMessage=filteredMessage.replace(regex,'💜💜💜');}); return filteredMessage;}
};
console.log("KiddoVerse Themes: UI class updated for theme selector.");
