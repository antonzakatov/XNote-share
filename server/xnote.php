<?php
$msgid = $_REQUEST['msgid'];
$oper = $_REQUEST['oper'];
$user = null;
if($_REQUEST['user']) {
    $user = $_REQUEST['user'];
}

//var_dump($_REQUEST);
if(!$oper)
{
    http_response_code(400);
    return;
}

if($oper == 'save')
    {

	$res=saveNote($msgid, $_REQUEST['note'], $user);
	echo json_encode(['result' => $res]);
    }
else if ($oper == 'get')
{
	getNote($msgid, $user);
}
else
{
    http_response_code(400);
    return;
}

function saveNote($msgid, $note, $user = null)
{
    $result = 'OK';
    
    $mysqli = new mysqli("localhost", "xnote", "", "xnote");
    if ($mysqli->connect_errno) {
        return "Не удалось подключиться к MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
        
    }

    $mysqli->autocommit(false);
    
    $mysqli->begin_transaction();
    
    if($note=='')
    {
        $SQL = "DELETE FROM notes WHERE msgID=?";
        if ($stmt = $mysqli->prepare($SQL)) {
	     $stmt->bind_param($msgid);
    	     $stmt->execute();
                   //do stuff
        }
        else {
    	    return "Error prepare:" . $mysqli->error;
    	}
    }
    else
    {
	    $SQL = "INSERT INTO notes (msgID, author, txt) VALUES (?,?,?) ON DUPLICATE KEY UPDATE txt=?";
        if ($stmt = $mysqli->prepare($SQL)) {
	     $stmt->bind_param('ssss',$msgid, $user, $note, $note);
	     if(!$stmt->execute())  {
	        return "Не удалось вставить " . $stmt->error;
	     }
    	     $stmt->close();
        }
        else
        {
    	    return "Error prepare:" . $mysqli->error;
    	}

    	if($user) {
            $x = intval($_REQUEST['x']);
            $y = intval($_REQUEST['y']);
            $w = intval($_REQUEST['width']);
            $h = intval($_REQUEST['height']);

            $SQL = "INSERT INTO notes_user_prefs (msgID, user, x, y, w, h) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE x=?, y=?, w=?, h=?";
            if ($stmt = $mysqli->prepare($SQL)) {
                $stmt->bind_param('ssiiiiiiii',$msgid, $user, $x, $y, $w, $h, $x, $y, $w, $h);
                if(!$stmt->execute())  {
                    return "Не удалось вставить " . $stmt->error;
                }
                $stmt->close();
            }
            else
            {
                return "Error prepare:" . $mysqli->error;
            }

        }
    }
    
    if (!$mysqli->commit()) {
        return "Не удалось зафиксировать транзакцию:" . $mysqli->error;
        
    }
            
    
    $mysqli->close();
    return $result;
}


function getNote($msgid, $user)
{
    $rr = array();
    $mysqli = new mysqli("localhost", "xnote", "", "xnote");
    if ($mysqli->connect_errno) {
        $rr['result']= "Не удалось подключиться к MySQL: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error;
    }
    else {    
    
    $SQL = 'SELECT a.txt,UNIX_TIMESTAMP(a.dt_modif) as dt_modif,a.author
          , b.x, b.y, b.w, b.h   
          FROM notes a LEFT JOIN notes_user_prefs b ON a.msgID = b.msgID AND b.user = ? 
          WHERE a.msgID=?';

    if ($stmt = $mysqli->prepare($SQL)) {
    	 //$varm = '';//new DateTime_Extended;
         //$notex = "";
         //$user = "";

         $stmt->bind_param('ss',$user, $msgid);
         $stmt->execute();
         $result = $stmt->get_result();
         if($row = $result->fetch_assoc()) {

         }

         /*$stmt->store_result();
         $stmt->bind_result($notex,$varm,$user);
         $stmt->fetch();
         $stmt->close();

         if($notex == null) {
          $notex = '';
         }
         
	 //$rr = array('note' => $notex, 'msgid'=>$msgid);

	 if($varm !== null) {
	    $rr['date'] = $varm;
	 }
	 
	 if($user){
	    $rr['user'] = $user;
	 }
        */
        $stmt->close();

         $rr = array('note' => $row['txt'] ? $row['txt'] : '',
                     'msgid'=>$msgid, 'result' => 'OK');
        if($row['dt_modif'] !== null) {
            $rr['date'] = $row['dt_modif'];
        }

        if($row['author']){
            $rr['user'] = $row['author'];
        }
        //var_dump($row);

        if($row['x'] != null)
        {
            $rr['x'] = intval($row['x']);
            $rr['y'] = intval($row['y']);
            $rr['width'] = intval($row['w']);
            $rr['height'] = intval($row['h']);
        }
    }
    else
    {
	 $rr['result']="Error prepare:" . $mysqli->error;
    }

    $mysqli->close();
    }
    echo json_encode($rr);          
}

?>