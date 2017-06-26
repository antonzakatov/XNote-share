//"use strict";
if (!xnote) var xnote = {};
if (!xnote.ns) xnote.ns = {};

Components.utils.import("resource://xnote/modules/commons.js", xnote.ns);

xnote.ns.ColumnNote = function () {

    function getHeaderForRow(row) {
        //return gDBView.getFolderForViewIndex(row).GetMessageHeader(gDBView.getKeyAt(row));
        return gDBView.getMsgHdrAt(row);
    }

    //var xnotePrefs = xnote.ns.Commons.xnotePrefs;
    //console.log("Qqqq:" + xnotePrefs);
    //const char_count = xnote.ns.Commons.xnotePrefs.getIntPref("show_first_x_chars_in_col");
    function char_count () {
        return xnote.ns.Commons.xnotePrefs.getIntPref("show_first_x_chars_in_col");
    };

    var pub = {
             columnHandler: {
                getCellText: function (row, col) {
                    // ~ dump("xnote: getCellText: "+JSON.stringify(xnote, null, 2)+"\n");
                    const note = xnote.ns.Note(getHeaderForRow(row).messageId);
                    return note.smalltext();
                    /*if (char_count() > 0) {

                        //if (note.exists()) {
                        let txt = note.text.trim().substr(0, char_count);
                        if(txt.length > 0) {
                            return " " + txt;
                        }
                    }
                    return null;*/
                },
                getSortStringForRow: function (hdr) {
                    const note = xnote.ns.Note(hdr.messageId);
                    return note.smalltext();
                    /*if (char_count() > 0) {
                        let note = xnote.ns.Note(hdr.messageId);
                        let txt = note.text.trim().substr(0, this.char_count);
                        if(txt.length > 0)
                            return " " + txt;
                    }

                    return ""*/
                    //return pub.hasNote(hdr.messageId);
                },
                isString: function () {
                    return true;
                },

                getCellProperties: function (row, col,  aProps) {
                },

                getRowProperties: function (row,  aProps) {
                },
                getImageSrc: function (row, col) {
                    let hdr = getHeaderForRow(row);
                    let kkk = hdr.getStringProperty("keywords").split(" ");
                    //console.log(kkk);
                    //if(hdr.label.match('/xnote/'))
                    if (kkk.indexOf("xnote")!== -1/*pub.hasNote(hdr.messageId)*/) {
                        return "chrome://xnote/skin/xnote_context.png";
                    }
                    else {
                        return null;
                    }
                },
                getSortLongForRow: function (hdr) {
                    return pub.hasNote(hdr.messageId) ? 1 : 0;
                },

                isEditable: function(aRow, aCol) {return false;},
            },

            DbObserver: {
                // Components.interfaces.nsIObserver
                observe: function (aMsgFolder, aTopic, aData) {
                    pub.addCustomColumnHandler();
                }
            },
            /*
             * Get the notes file associated with the selected mail. Returns a handle to the
             * notes file if the message has a note, i.e., the corresponding file exists.
             * Returns null otherwise.
             */
            hasNote: function (messageID) {
                return xnote.ns.Note(messageID).exists();
            },

            doOnceLoaded: function () {
                //xnote.ns.Commons.init();
                const ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
                ObserverService.addObserver(pub.DbObserver, "MsgCreateDBView", false);
            },

            addCustomColumnHandler: function () {
                gDBView.addColumnHandler("xnoteCol", pub.columnHandler);
            }
        }
    ;

    return pub;
}();

window.addEventListener("load", xnote.ns.ColumnNote.doOnceLoaded, false);
//dump("xnote: xnote-columnnote - end: "+JSON.stringify(xnote, null, 2));
