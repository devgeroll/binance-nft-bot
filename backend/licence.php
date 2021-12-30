<?php

header("Content-Type: application/json");

$users = [
    "142734452" => 1640825815
];

if(isset($_GET["u"]))
{
    if(array_key_exists($_GET["u"], $users))
    {
        if($users[$_GET["u"]] > time())
        {
            echo json_encode(['success' => true]);
        }
        else
        {
            echo json_encode(['success' => false, 'error' => 'Your license is already expired!']);
        }
    }
    else
    {
        echo json_encode(['success' => false, 'error' => "Your account isn't registered!"]);
    }
}
else
{
    echo json_encode(['success' => false, 'error' => 'Unknown request.']);
}

?>