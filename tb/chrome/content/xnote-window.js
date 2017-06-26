// encoding='UTF-8'

/*
	# File : xnote-window.xul
	# Authors : Hugo Smadja, Lorenz Froihofer
	# Description : Functions associated with the XNote window (xnote-window.xul).
*/

if (!xnote) var xnote={};
if (!xnote.ns) xnote.ns={};

Components.utils.import("resource://xnote/modules/commons.js", xnote.ns);

xnote.ns.Window = function() {
  // Variables for window movement
  var xAvantDeplacement, yAvantDeplacement;
  // Variables for window resizing.
  var largeurAvantDeplacement, hauteurAvantDeplacement;
  
  var oldOpenerX, oldOpenerY;

  /** Displayed note. */
  var note;

  // result
  var pub = {};

  /**
   * APPELANT
   * type	: évènement load de l'élément XUL <window>
   * id	: xnote-window
   * FONCTION
   * Exécutée au chargement du post-it avant qu'elle ne soit affichée à l'écran.
   * C'est ici, que l'on peut modifier le style de la fenêtre dynamiquement
   */
  pub.onLoad = function (e) {
    //~ dump('\n->onLoad');
    // premet l'accès au préférences
    /*var pref = 	Components.classes['@mozilla.org/preferences-service;1']
          .getService(Components.interfaces.nsIPrefService);
    try
    {
      self.document.getElementById('xnote-note').style.setProperty('-moz-opacity', pref.getIntPref('xnote.transparence')/10, '');
    }
    catch(e) {}*/
    note = self.arguments[0];

    var texte=self.document.getElementById('xnote-texte');
    texte.value=note.text;

    //set date in the titlebar
    var modificationdate=self.document.getElementById("xnote-mdate");
    modificationdate.value=note.modificationDate;

    self.setTimeout(xnote.ns.Window.resizeWindow);
    //~ self.setTimeout("document.getElementById('xnote-window').style.setProperty('visibility','visible','')");
    //~ self.setTimeout("document.getElementById('xnote-window').setAttribute('background-color', 'black')");

      oldOpenerX = opener.screenX;
      oldOpenerY = opener.screenY;

    if (window.arguments[1]=='clicBouton')
      texte.focus();
    else
      self.setTimeout(window.opener.focus);
  //~ dump('\n<-onLoad');
  };

  pub.resizeWindow = function () {
      let maxW = Math.min(Math.max(note.DEFAULT_XNOTE_WIDTH, note.width), window.screen.availWidth);
      let maxH = Math.min(Math.max(note.DEFAULT_XNOTE_HEIGHT, note.height), window.screen.availHeight);
    window.resizeTo(maxW, maxH);
  };

  /**
   * CALLING XUL
   * Type: blur event of the XUL element <window>
   * Id: XNote-window
   * FUNCTION
   * Function called when the window loses focus. It assigns a
   * tag to the selected mail if the note contains text.
   */
  pub.updateTag = function () {
    //~ dump('\n->updateTag');
    opener.xnote.ns.Overlay.updateTag(document.getElementById('xnote-texte').value);
  //~ dump('\n<-updateTag');
  };

  /**
   * CALLER XUL
   * Type: unload event in XUL element <window>
   * Id: XNote-window
   * FUNCTION
   * Saves the note: location, size and content of the note,
   * A blank note will be deleted.
   */
  pub.saveNote = function () {
    //var dateformat= xnote.ns.Commons.xnotePrefs.getCharPref("dateformat");
    //var date = xnote.ns.Date;
    //var date1 = date.format(dateformat);
    //~ dump('\n->saveNote');
      let curnote = note || self.arguments[0];
    if (curnote.modified) {
      var oldText = curnote.text;
        curnote.text=document.getElementById('xnote-texte').value;
      if (curnote.text!='') {
          curnote.x=window.screenX-opener.screenX;
          curnote.y=window.screenY-opener.screenY;
          curnote.width=window.document.width;
          curnote.height=window.document.height;
        //if (oldText != note.text) {
        //  note.modificationDate=date1;
        //}
          curnote.saveNote();
      }
      else {
          curnote.deleteNote();
      }
    }
//  ~ dump('\n<-saveNote');
  };


  /**
   * CALLER XUL
   * Type: event input from XUL element <textbox>
   * Id: text
   * FUNCTION
   * Notification that the note was modified (edited, moved, ...).
   */
  pub.noteModified = function () {
    //~ dump('\n->modifierNote');
    note.modified = true;
  //~ dump('\n<-modifierNote');
  };

  /**
   * CALLER XUL
   * Type: event input from XUL element <textbox>
   * Id: text
   * FUNCTION
   * Change the set the note to be modified the note to be deleted when
   * the save method is called.
   */
  pub.deleteNote = function () {
    //~ dump('\n->supprimerNote');
    document.getElementById('xnote-texte').value='';
    pub.noteModified();
    pub.saveNote();
  //~ dump('\n<-supprimerNote');
  };

  /**
   * APPELANT XUL
   * type	: évènement mousedown de l'élément XUL <textbox>
   * id	: redim
   * FONCTION
   * Quand le bouton de la souris est enfoncé, sauve la taille et
   * lance la capture des évènements de déplacement et de relâchement
   */
  pub.startRedimensionnement = function (e) {
    if (e.button==0) {
      xAvantDeplacement = e.screenX;
      largeurAvantDeplacement = window.document.width;
      yAvantDeplacement = e.screenY;
      hauteurAvantDeplacement = window.document.height;
      //~ dump('\n xAvantDeplacement='+xAvantDeplacement+' ; yAvantDeplacement='+yAvantDeplacement);
      document.addEventListener('mousemove', xnote.ns.Window.redimenssionnement, true);
      document.addEventListener('mouseup', xnote.ns.Window.stopRedimenssionnement, true);
    }
  };

  /**
   * lors du déplacement de la souris, redimensionne la fenêtre grâce à la taille
   * enregistrée lors du clic.
   */
  pub.redimenssionnement = function (e) {
    //~ dump('\n w.document.width='+window.document.width+' ; w.document.height='+window.document.height);

    //~ dump('\nlargeur='+document.getElementById('xnote-texte').style.width);
    var nouvelleLargeur = largeurAvantDeplacement + e.screenX - xAvantDeplacement;
    var nouvelleHauteur = hauteurAvantDeplacement + e.screenY - yAvantDeplacement;
    nouvelleLargeur = nouvelleLargeur< 58 ?  58 : nouvelleLargeur;
    nouvelleHauteur = nouvelleHauteur< 88 ?  88 : nouvelleHauteur;
    window.resizeTo(nouvelleLargeur,nouvelleHauteur);
    pub.noteModified();
  };

  /**
   * quand le bouton de la souris est relaché, on supprime la capture
   * du déplacement de la souris.
   */
  pub.stopRedimenssionnement = function (e) {
    document.removeEventListener('mousemove', xnote.ns.Window.redimenssionnement, true);
    document.removeEventListener('mouseup', xnote.ns.Window.stopRedimenssionnement, true);
    var texte=self.document.getElementById('xnote-texte');
    texte.focus();
  };

  pub.checkOpenerMoved = function() {
    if (oldOpenerX != opener.screenX || oldOpenerY != opener.screenY) {
        let curnote = note || self.arguments[0];
      let newX = opener.screenX + curnote.x;//Math.min(opener.screenX + curnote.x, opener.screen.availWidth - curnote.width);
      let newY = opener.screenY + curnote.y;//Math.min(opener.screenY + curnote.y, opener.screen.availHeight - curnote.height);
      window.moveTo(newX, newY);
      oldOpenerX = opener.screenX;
      oldOpenerY = opener.screenY;
    }
  };

  pub.onUnload = function(e) {
//    ~dump("\n->onUnload");
    pub.saveNote();
  };

  pub.onOpenerUnload = function(e) {
    pub.saveNote();
  };

  /*pub.domAttrModified = function (e) {
    ~dump("domAttrModified: "+e.attrName+", node="+e.relatedNode.nodeName+", node.ownerElement="+e.relatedNode.ownerElement+"\n");
    //~for (var i in e.relatedNode.ownerElement) dump(i+"\n");
    //~dump("\n");
  }*/

  return pub;
}();

// Capture the Window focus lost event to update the XNote tag.
addEventListener('blur', xnote.ns.Window.updateTag, true);
addEventListener('load', xnote.ns.Window.onLoad, false);
addEventListener('unload', xnote.ns.Window.onUnload, false);

//For testing purposes
//addEventListener('DOMAttrModified', xnote.ns.Window.domAttrModified, false);

//Necessary for correct shutdown as we are otherwise unable to correctly
//save a modified note
opener.addEventListener("unload", xnote.ns.Window.onOpenerUnload, false);
//Unfortunately, there seems to be no better way to react on window
//movement.
setInterval(xnote.ns.Window.checkOpenerMoved, 500);
