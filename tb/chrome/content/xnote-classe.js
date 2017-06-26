// encoding='UTF-8'

/**
 # File : xnote-classe.xul
 # Author : Hugo Smadja, Lorenz Froihofer
 # Description : classe Note permettant d'instancier des notes.
 */

if (!xnote) var xnote = {};
if (!xnote.ns) xnote.ns = {};

//let {interfaces: Ci, utils: Cu, classes: Cc} = Components;

Components.utils.import("resource:///modules/imXPCOMUtils.jsm", xnote.ns);
Components.utils.import("resource:///modules/imServices.jsm", xnote.ns);
Components.utils.import("resource://gre/modules/Http.jsm", xnote.ns);

Components.utils.import("resource://xnote/modules/storage.js", xnote.ns);
Components.utils.import("resource://xnote/modules/commons.js", xnote.ns);
//Components.utils.import("resource://gre/modules/commonjs/toolkit/require.js", xnote.ns)
Components.utils.import("resource://gre/modules/Promise.jsm", xnote.ns);

/**
 * Constructor for the class Note using a file descriptor during creation of
 * the note. If the file does not exist, the note is initialized with
 * default values, otherwise it is initialized with the contents of the file.
 */
xnote.ns.Note1 = function (messageId) {
    //~ dump('\n->Note');

    // --- internal variables ------------------------------------------
    let _notesFile;
    let _isweb = false;
    const xnotePrefs = xnote.ns.Commons.xnotePrefs;
    if (xnotePrefs.prefHasUserValue("storage_path") && xnote.ns.UTF8Coder.decode(xnotePrefs.getCharPref('storage_path').trim()).search(/https?:\/\//) >= 0) {
        _isweb = true;
    }
    _notesFile = _isweb ? xnotePrefs.getCharPref('storage_path').trim() : xnote.ns.Storage.getNotesFile(messageId);// xnote.ns.UTF8Coder.decode(
    //dump(messageId);
    //dump(_notesFile);
    let _modified = false;
    //var _msgId = messageId;
    //_isweb = _notesFile.search(/https?:\/\//) >= 0;
    //result

    function GetAccountIdenty() {
        const acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        const accounts = acctMgr.accounts;
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
            //Application.console.log(account.key);
            // account.incomingServer is an nsIMsgIncomingServer
            // account.identities is an nsISupportsArray of nsIMsgIdentity objects
            //                    you can loop through it just like acctMgr.accounts above
            // account.defaultIdentity is an nsIMsgIdentity
            if (account.defaultIdentity) {
                return account.defaultIdentity.email;
            }
        }
    }

    let pub;
    pub = {
        //--- properties ----------------------------------------------------
        get modified() {
            return _modified;
        },
        set modified(value) {
            _modified = value;
        },

        _msgId: messageId,
        _notesFile: _notesFile,
        user: GetAccountIdenty() || '',


        // Default values for a note window
        DEFAULT_XNOTE_WIDTH: xnotePrefs.getIntPref("width"),
        DEFAULT_XNOTE_HEIGHT: xnotePrefs.getIntPref("height"),
        DEFAULT_X: (window.outerWidth - xnotePrefs.getIntPref("width")) / 2,
        DEFAULT_Y: (window.outerHeight - xnotePrefs.getIntPref("height")) / 2,

        x: (window.outerWidth - xnotePrefs.getIntPref("width")) / 2,
        y: (window.outerHeight - xnotePrefs.getIntPref("height")) / 2,
        width: xnotePrefs.getIntPref("width"),
        height: xnotePrefs.getIntPref("height"),
        text: "",
        modificationDate: "",
      };
    //  const { defer } = require('sdk/core/promise');
    //--- Intialisation (either from file or defaults) --------------------------

    pub.smalltext = function() {
        "use strict";
        if(!pub.text && pub.text == "")
            return "";
        let chrcnt = xnote.ns.Commons.xnotePrefs.getIntPref("show_first_x_chars_in_col");
        if(chrcnt > 0)
        {
            let txt = pub.text.trim().substr(0, chrcnt);
            return " "+txt;
        }
        return "";
    }

    if (_isweb) {
        //dump('\n->Note qwqw');
        pub.callweb = function (reqobj) {
            reqobj.msgid = pub._msgId;
            reqobj.user = pub.user;

            return new Promise(function (resolve, reject) {

                const objectToArray = function (obj) {
                    const arr = [];
                    if ('object' !== typeof obj || 'undefined' === typeof obj || Array.isArray(obj)) {
                        return obj;
                    } else {
                        Object.keys(obj).map(function (x) {
                            arr.push([x, obj[x]])
                        });
                    }
                    return arr;
                };

                const options = {
                    postData: objectToArray(reqobj),
                    method: 'POST',
                    onLoad: function (aRequest) {
                        data = JSON.parse(aRequest);
                        resolve(data);
                    }
                    /*onError: this.ERROR.bind(this),
                     logger: {log: this.LOG.bind(this),
                     debug: this.LOG.bind(this)
                     }*/
                };
                 //"http://ajax.last.fm/user/" + this.userName + "/now"
                let ajax = xnote.ns.httpRequest(_notesFile, options);
                /*ajax.onload = function(aRequest) {
                 let data = JSON.parse(aRequest.target.responseText);
                 resolve(data);
                 }*/

            });

        };

        pub.deleteNote = function () {
            //~ dump('\n->note_supprimer');
            pub.callweb({
                oper: "delete",
            });

            return true;
        };

        pub.toString = function () {
            return ('\n' +
            this.x +
            ' ; ' +
            this.y +
            ' ; ' +
            this.width +
            ' ; ' +
            this.height +
            ' ; ' +
            this.text +
            ' ; ')
        };

        pub.saveNote = function () {
            //~ dump('\n->saveNote');

            if (pub.text == '') {
                pub.deleteNote();
                return false;
            }

            pub.callweb({
                oper: "save",
                note: pub.text.replace(/\n/g, '<BR>'),
                x: pub.x,
                y: pub.y,
                width: pub.width,
                height: pub.height
            }).then(function (q1) {
                if(q1 && q1["result"]=='OK') return;
                let retstr = "unknown error";
                if(q1 && q1["result"]) retstr = q1["result"] || "unknown error";
                console.log("Error save Note:" + retstr);
                alert("Error save Note:" + retstr);
            });

            pub.modified = false;
            //~ dump('\n<-saveNote');
            return true;
        };

        pub.exists = function () {
            /* var q = pub.callweb({ oper: 'get' });
             //if (q && q.note) {
             var ex = false;
             q.then(function (q1) {
             if (q1 && q1["note"] && q1.note != '') {
             ex=true;
             }
             });
             return ex;*/
            return pub.text.length > 0;
        };



        const q = pub.callweb({oper: 'get'});
        //if (q && q.note) {
        q.then(function (q1) {
            if (q1 && q1["note"] && q1.note !== '') {

                pub.text = decodeURIComponent(q1.note).replace(/<BR>/g, '\n');
                pub.modificationDate = new Date(q1['date'] * 1000);
                if(q1["x"]) {
                    try {
                    pub.x = q1.x || pub.DEFAULT_X;
                    pub.y = q1.y || pub.DEFAULT_Y;
                    pub.height = q1.height || pub.DEFAULT_XNOTE_HEIGHT;
                    pub.width = q1.width || pub.DEFAULT_XNOTE_WIDTH;
                    }
                    catch (ex) {
                    }
                }

            }
        });

        /* var q1 = q.note;
         var q2 = q.value.note;
         if (q1) {
         pub.text = decodeURIComponent(q1).replace(/<BR>/g, '\n');
         //pub.text = q1.note;
         //pub.modificationDate = q1.dtmod;
         }
         //}*/

    } else {
        //dump('\n<-Note2222');
        if (!_notesFile || !_notesFile.exists()) {
  /*          pub.x = pub.DEFAULT_X;
            pub.y = pub.DEFAULT_Y;
            pub.width = pub.DEFAULT_XNOTE_WIDTH;
            pub.height = pub.DEFAULT_XNOTE_HEIGHT;
            pub.text = '';
            pub.modificationDate = '';*/
            //~ dump('\n<-note_charger');
        } else {
            const fileInStream =
                Components.classes['@mozilla.org/network/file-input-stream;1'].createInstance(Components.interfaces
                    .nsIFileInputStream);
            const fileScriptableIO =
                Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces
                    .nsIScriptableInputStream);
            fileInStream.init(_notesFile, 0x01, parseInt("0444", 8), null);
            fileScriptableIO.init(fileInStream);
            pub.x = parseInt(fileScriptableIO.read(4));
            pub.y = parseInt(fileScriptableIO.read(4));
            pub.width = parseInt(fileScriptableIO.read(4));
            pub.height = parseInt(fileScriptableIO.read(4));
            pub.modificationDate = fileScriptableIO.read(32);
            // Changed because of this:
            // Just one comment - seems like xnote doesnt allow non-latin characters.
            // I am from Latvia (Letonnie in French I believe) and we have characters
            // like al�ki which are not preserved when saving a note ...
            //
            // this.text = fileScriptableIO.read(_notesFile.fileSize-16);
            pub.text = decodeURIComponent(
                fileScriptableIO.read(_notesFile.fileSize - 48));

            fileScriptableIO.close();
            fileInStream.close();
            pub.text = pub.text.replace(/<BR>/g, '\n');
            //~ dump('\n<-note_charger');
        }

        //--- METHOD DEFINITIONS -------------------------------------------------

        /**
         * Save the note in a file with the name of the message-id. If the content
         * of an existing note is empty, e.g., text was deleted, the note will be
         * deleted.
         */
        pub.saveNote = function () {
            //~ dump('\n->saveNote');

            if (pub.text == '') {
                if (_notesFile.exists()) {
                    _notesFile.remove(false);
                }
                return false;
            }
            pub.text = pub.text.replace(/\n/g, '<BR>');

            const tempFile = _notesFile.parent.clone();
            tempFile.append("~" + _notesFile.leafName + ".tmp");
            tempFile.createUnique(tempFile.NORMAL_FILE_TYPE, parseInt("0600", 8));

            const fileOutStream =
                Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces
                    .nsIFileOutputStream);
            with (fileOutStream) {
                init(tempFile, 2, 0x200, false); // Opens for writing only
                write(pub.x, 4);
                write(pub.y, 4);
                write(pub.width, 4);
                write(pub.height, 4);
                write(pub.modificationDate, 32);

                // Changed because of this:
                // Just one comment - seems like xnote doesnt allow non-latin characters.
                // I am from Latvia (Letonnie in French I believe) and we have characters
                // like al�ki which are not preserved when saving a note ...
                //
                // fileOutStream.write(pub.text, pub.text.length);
                const contentencode = encodeURIComponent(pub.text);
                write(contentencode, contentencode.length);

                close();
            }
            tempFile.moveTo(null, _notesFile.leafName);
            pub.modified = false;
            //~ dump('\n<-saveNote');
            return true;
        };

        /**
         * Deletes the note on the disk drive.
         */
        pub.deleteNote = function () {
            //~ dump('\n->note_supprimer');
            if (_notesFile.exists()) {
                _notesFile.remove(false);
                //~ dump('\n->note_supprimer');
                return true;
            } else {
                //~ dump('\n->note_supprimer');
                return false;
            }
        };

        pub.toString = function () {
            return ('\n' +
            this.x +
            ' ; ' +
            this.y +
            ' ; ' +
            this.width +
            ' ; ' +
            this.height +
            ' ; ' +
            this.text +
            ' ; ')
        };

        pub.exists = function () {
            return _notesFile.exists();
        }
    }

    return pub;
};

xnote.ns._NoteCache =  new Map();
xnote.ns._NoteCacheClear = setInterval(function () {
    var todel = new Set();
    var cdt = Date.now();
    xnote.ns._NoteCache.forEach(
        function (val, key, map) {
            if(!val || (cdt - val.dt) >= 5*1000)
            {
                todel.add(key);
            }
        }
    );
    todel.forEach(function (val1, val2, set) {
        xnote.ns._NoteCache.delete(val1);
    });

}, 5000);
xnote.ns.Note = function (messageId) {
    "use strict";
    //console.log("Get " + messageId);
    let n = xnote.ns._NoteCache.get(messageId);
    var p = null;
    if (n == undefined || Date.now() - n.dt > 10*1000) {
      //  console.log("Load " + messageId);
        p = xnote.ns.Note1(messageId);
        //console.log("Add " + messageId);
        xnote.ns._NoteCache.set(messageId, {dt: Date.now(), note: p});
    }
    else {
        p = n.note;
    }
    //console.log("Return " + messageId);
    return p;
};
