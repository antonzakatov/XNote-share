// encoding ='UTF-8'

/*
 # File : xnote-overlay.js
 # Author : Hugo Smadja, Pierre-Andre Galmes, Lorenz Froihofer
 # Description : functions associated to the "xnote-overlay.xul" overlay file.
 */

/* 
 Tag management principles and thoughts
 - When should labels be applied?
 - When a new post-it is saved.
 - When XNote notes are imported from a PC to another PC (cf TODO: import
 procedure).

 - When should the XNote label related to a message be removed?
 - When the message is empty (no text in it).
 - When the message is removed.

 - What should happened when XNote is removed?
 - Remove the XNote tag ? No
 - Remove the XNote labels associated to messages? No
 */

if (!xnote) var xnote = {};
if (!xnote.ns) xnote.ns = {};

Components.utils.import("resource://gre/modules/errUtils.js");
Components.utils.import("resource://xnote/modules/storage.js", xnote.ns);
Components.utils.import("resource://xnote/modules/commons.js", xnote.ns);
Components.utils.import("resource://xnote/modules/xnote-upgrades.js", xnote.ns);


xnote.ns.Overlay = function () {
    //result
    var pub = {};

    // Variables related to the XNote context menu.
    var noteForRightMouseClick;
    var currentIndex;

    /** Contains the note for the current message */
    var note;

    /** Contains the XNote window instance. */
    var xnoteWindow;

    /**
     * Indicates whether the post-it has been opened at the request of the user or
     * automatically when selecting an email.
     */
    var initSource;

    /**
     * CALLER XUL
     * type    : event load element XUL <toolbarbutton>
     * id    : button-xnote
     * FUNCTION
     * Executed to load the note before it is displayed on the screen.
     * Here we can change the style of the window dynamically
     */

    //var xnotePrefs = xnote.ns.Commons.xnotePrefs;

    pub.initialise = function (event) {
        //~ dump('\n->initialise');
        //Closes the note (if any) of the old (deselected) message.
        pub.closeNote();

        //Initialize note for the newly selected message
        note = xnote.ns.Note(pub.getMessageID());
        pub.updateTag(note.text);

        var bundle = document.getElementById('xnote-stringbundle-overlay');

        //~ dump('\nevent = '+event);
//    if (event) {
//      //~ dump('\nevent=true');
//      initSource = event;
//    }

        if ((xnote.ns.Commons.xnotePrefs.getBoolPref("show_on_select") && note.text != '')
            || initSource == 'clicBouton' || event == 'clicBouton') {
            xnoteWindow = window.openDialog(
                'chrome://xnote/content/xnote-window.xul',
                'XNote',
                'chrome=yes,dependent=yes,resizable=yes,modal=no,left=' + (window.screenX + note.x) + ',top=' + (window.screenY + note.y) + ',width=' + note.width + ',height=' + note.height,
                note, (initSource == 'clicBouton' || event == 'clicBouton' ? 'clicBouton' : null)
            );
        }
        initSource = '';
        //~ dump('\n<-initialise');
    };

    /**
     * CALLER XUL
     * Type: event command element XUL <menuitem>
     * Id: context-addition
     * FUNCTION
     * Creation and modification of notes uses the same function, that is context_modifierNote()
     */
    pub.context_createNote = function () {
        pub.context_modifyNote();
    };

    /**
     * CALLER XUL
     * Type: event command element XUL <menuitem>
     * Id: context-modif
     * FUNCTION
     */
    pub.context_modifyNote = function () {
        initSource = 'clicBouton';	//specifies that the note is created by the user
        if (gDBView.selection.currentIndex == currentIndex) {
            //if you right click on the mail stream (one selected)
            pub.initialise();
        }
        else {
            gDBView.selection.select(currentIndex);
            gDBView.selectionChanged();
            // The following prevents the previous message selection from
            // being restored during closing of the context menu.
            // Variable not present in SeaMonkey --> check to prevent errors.
            if (xnote.ns.Commons.isInThunderbird) {
                gRightMouseButtonSavedSelection.realSelection.select(currentIndex);
            }
        }
    };

    /**
     * CALLER XUL
     * Type: event command element XUL &lt;menuitem&gt;
     * Id: context-suppr
     * FUNCTION
     * Delete the note associated with the selected e-mail.
     */
    pub.context_deleteNote = function () {
        noteForRightMouseClick.deleteNote();
        pub.updateTag("");
        setTimeout(xnote.ns.Overlay.initialise);
    };

    pub.context_resetNoteWindow = function () {
        if (gDBView.selection.currentIndex == currentIndex) {
            xnoteWindow.resizeTo(noteForRightMouseClick.DEFAULT_XNOTE_WIDTH, noteForRightMouseClick.DEFAULT_XNOTE_HEIGHT);
            xnoteWindow.moveTo(noteForRightMouseClick.DEFAULT_X, noteForRightMouseClick.DEFAULT_Y);
            note.modified = true;
        }
        else {
            noteForRightMouseClick.x = noteForRightMouseClick.DEFAULT_X;
            noteForRightMouseClick.y = noteForRightMouseClick.DEFAULT_Y;
            noteForRightMouseClick.width = noteForRightMouseClick.DEFAULT_XNOTE_WIDTH;
            noteForRightMouseClick.height = noteForRightMouseClick.DEFAULT_XNOTE_HEIGHT;
            noteForRightMouseClick.modified = true;
            noteForRightMouseClick.saveNote();
        }
    };

    /**
     * Closes the XNote window.
     */
    pub.closeNote = function () {
        if (xnoteWindow != null && xnoteWindow.document) {
            xnoteWindow.close();
        }
    };

    /**
     * FUNCTION
     * Applies the XNote tag to the selected message.
     * (Choice of tag in the preferences.)
     */
    pub.updateTag = function (noteText) {
        if (xnote.ns.Commons.useTag) {

            // dump('\n->updateTag');

            // If the note isn't empty,
            if (noteText != '') {
                // Add the XNote Tag.
                ToggleMessageTag("xnote", true);
            }
            // If the note is empty,
            else {
                // Remove the XNote Tag.
                ToggleMessageTag("xnote", false);
            }
        }
        //~ dump('\n<-updateTag');
    }



    /**
     * FUNCTION
     * For right click in message pane:
     *   - Instantiates an object notes for the message on which was clicked
     *   - Functions that are not currently possible are greyed out in the context
     *     menu, e.g., modify or delete a note for a message not containing a note.
     */
    pub.messageListClicked = function (e) {
        //~ dump('\n->messageListClicked');
        if (e.button == 2) {
            noteForRightMouseClick = xnote.ns.Note(pub.getMessageID());
            let noteExists = noteForRightMouseClick.exists();
            document.getElementById('xnote-context-ajout').setAttribute('hidden', noteExists);
            document.getElementById('xnote-context-modif').setAttribute('hidden', !noteExists);
            const messageArray = gFolderDisplay.selectedMessages;
            if (messageArray && messageArray.length == 1) {
                document.getElementById('xnote-mailContext-xNote').setAttribute('disabled', false);
            }
            else {
                document.getElementById('xnote-mailContext-xNote').setAttribute('disabled', true);
            }
        }
        let t = e.originalTarget;
        if (t.localName == 'treechildren') {
            let row = {};
            let col = {};
            let childElt = {};

            const tree = GetThreadTree();
            tree.treeBoxObject.getCellAt(e.clientX, e.clientY, row, col, childElt);
            currentIndex = row.value;
            //~ dump('\nrow.value = '+row.value);
        }
        //~ dump('\n<-messageListClicked');
    };

    /**
     * Get message id from selected message
     */
    pub.getMessageID = function () {
        const message = gFolderDisplay.selectedMessage;
        if (message != null) return message.messageId;
        return null;
    };

    /**
     * Enable XNote button for a single selected message.
     * Disable XNote button if no or several mails are selected.
     */
    pub.updateXNoteButton = function () {
        const messageArray = gFolderDisplay.selectedMessages;
        const xnoteButton = document.getElementById('xnote-toolbar-button');
        if (messageArray && messageArray.length == 1) {
            if (xnoteButton) {
                xnoteButton.setAttribute('disabled', false);
            }
            document.getElementById('xnote-mailContext-xNote').setAttribute('disabled', false);
        }
        else {
            if (xnoteButton) {
                xnoteButton.setAttribute('disabled', true);
            }
            document.getElementById('xnote-mailContext-xNote').setAttribute('disabled', true);
            pub.closeNote();
        }
    };

    /**
     * This function checks whether updates are necessary.
     * For example, it adds the XNote icon at the end of the toolbar if
     * XNote has been newly installed.
     */
    pub.checkInitialization = function (storedVersion) {
        let addButton = false;
        const xnotePrefs = xnote.ns.Commons.xnotePrefs;
        if (!storedVersion) {
            addButton = true;
        }

        if (addButton) {
            const toolbox = document.getElementById("mail-toolbox");
            const toolboxDocument = toolbox.ownerDocument;

            let xnoteButtonPresent = false;
            const toolbars = document.evaluate(".//.[local-name()='toolbar' and @customizable='true']", toolbox, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
            let toolbar = toolbars.iterateNext();
            while (toolbar && !xnoteButtonPresent) {
                //~dump("\n\nChecking toolbar '"+toolbar.id+"', currentSet="+toolbar.currentSet);
                if (toolbar.currentSet.indexOf("xnote-toolbar-button") > -1) {
                    xnoteButtonPresent = true;
                    //~dump("\nFound XNote button.");
                }
                toolbar = toolbars.iterateNext();
            }

            if (!xnoteButtonPresent) try {
                toolbar = document.getElementById("mail-bar3");
                if (!xnote.ns.Commons.isInThunderbird) {
                    toolbar = document.getElementById("msgToolbar");
                }
                const buttons = toolbar.currentSet.split(",");
                let newSet = "";
                for (let i = 0; i < buttons.length; i++) {
                    if (!xnoteButtonPresent && buttons[i] == "spring") {
                        newSet += "xnote-toolbar-button,";
                        xnoteButtonPresent = true;
                    }
                    newSet += buttons[i] + ",";
                }
                if (xnoteButtonPresent) {
                    newSet = newSet.substring(0, newSet.length - 1);
                }
                else {
                    newSet = toolbar.currentSet + ",xnote-toolbar-button";
                }
                toolbar.currentSet = newSet;

                toolbar.setAttribute("currentset", newSet);
                toolboxDocument.persist(toolbar.id, "currentset");
            }
            catch (e) {
                const consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                    .getService(Components.interfaces.nsIConsoleService);
                consoleService.logStringMessage("Could not add XNote button: " + e);
                logException(e, false, "Could not add XNote button: ");
            }
        }
    };

    const prefObserver = {
        observe: function (subject, topic, data) {
            //~dump("\nxnote pref observer called, topic=" + topic + ", data=" + data);
            if (topic != "nsPref:changed") {
                return;
            }

            switch (data) {
                case "extensions.xnote.storage_path":
                    xnote.ns.Storage.updateStoragePath();
                    break;
                case "extensions.xnote.usetag":
                    xnote.ns.Commons.checkXNoteTag();
                    break;
            }
        }
    };

    /**
     * At each boot of the extension, associate events such as selection of mails,
     * files, or right click on the list of messages. On selection show the associated
     * note.
     */
    pub.onLoad = function (e) {
        //dump("xnote: overlay.onLoad: "+JSON.stringify(xnote, null, 2)+"\n");
        xnote.ns.Commons.init();
        //console.log("qqq");
        //xnote.ns.xnotePrefs = xnote.ns.Commons.xnotePrefs;
        xnote.ns.Storage.updateStoragePath();
        const storedVersion = xnote.ns.Commons.xnotePrefs.prefHasUserValue("version") ?
            xnote.ns.Commons.xnotePrefs.getCharPref("version") : null;
        xnote.ns.Upgrades.checkUpgrades(
            storedVersion,
            xnote.ns.Commons.XNOTE_VERSION);
        xnote.ns.Commons.xnotePrefs.setCharPref("version", xnote.ns.Commons.XNOTE_VERSION);
        xnote.ns.Commons.checkXNoteTag();

        //The following statement does not work in SeaMonkey
//    xnote.ns.Commons.xnotePrefs.addObserver("", prefObserver, false);
        const prefs = Components.classes['@mozilla.org/preferences-service;1']
            .getService(Components.interfaces.nsIPrefBranch2);
        prefs.addObserver("extensions.xnote.", prefObserver, false);
        if (String(EnsureSubjectValue).search('extensionDejaChargee') == -1) {
            const oldEnsureSubjectValue = EnsureSubjectValue;
            EnsureSubjectValue = function () {
                let extensionDejaChargee;
                oldEnsureSubjectValue();
                setTimeout(xnote.ns.Overlay.initialise);
            };
        }
        try {
            let tree = document.getElementById('folderTree');
            tree.addEventListener('select', pub.closeNote, false);
            tree.addEventListener('select', pub.updateXNoteButton, false);
            tree = document.getElementById('threadTree');
            tree.addEventListener('contextmenu', pub.messageListClicked, false);
            tree = document.getElementById('threadTree');
            tree.addEventListener('select', pub.updateXNoteButton, false);
        }
        catch (e) {
            logException(e, false);
        }
        pub.checkInitialization(storedVersion);
    };

    return pub;
}();

/*function toOpenWindowByType(inType, uri) {
 var winopts = "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar";
 window.open(uri, "_blank", winopts);
 }
 start_venkman();*/

addEventListener('load', xnote.ns.Overlay.onLoad, true);

// dump("xnote: overlay - end: "+JSON.stringify(xnote, null, 2));

