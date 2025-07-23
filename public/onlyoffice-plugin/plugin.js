(function(window, undefined) {
    
    // Global variable to store text to insert
    window.textToInsert = null;
    
    // Initialize plugin
    window.Asc.plugin.init = function() {
        console.log('OnlyWriteAI Bridge Plugin initialized');
        
        // Listen for messages from parent window (your chat interface)
        window.addEventListener('message', function(event) {
            // Security check - ensure message is from your domain
            if (event.origin !== window.location.origin) {
                return;
            }
            
            if (event.data && event.data.type === 'INSERT_TEXT') {
                const textToInsert = event.data.text;
                console.log('Received text to insert:', textToInsert);
                
                // Insert text at cursor position
                insertTextAtCursor(textToInsert);
            }
        });
        
        // Notify parent window that plugin is ready
        if (window.parent) {
            window.parent.postMessage({
                type: 'ONLYOFFICE_PLUGIN_READY',
                pluginId: 'onlywriteai-bridge'
            }, '*');
        }
    };
    
    // Function to insert text at current cursor position
    function insertTextAtCursor(text) {
        window.Asc.plugin.callCommand(function() {
            try {
                const oDocument = Api.GetDocument();
                
                // Create new paragraph with the text
                const oParagraph = Api.CreateParagraph();
                oParagraph.AddText(text);
                
                // Insert at current cursor position
                oDocument.InsertContent([oParagraph]);
                
                console.log('Text inserted successfully:', text);
            } catch (error) {
                console.error('Error inserting text:', error);
            }
        }, true);
    }
    
    // Required button handler (even though we don't use buttons)
    window.Asc.plugin.button = function(id) {
        // No buttons in this plugin
    };
    
    // Handle plugin events
    window.Asc.plugin.event_onDocumentContentReady = function() {
        console.log('Document content ready');
    };
    
})(window, undefined);
