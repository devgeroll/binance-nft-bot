<?php

const VERSION = "e85b79abfd76b7c13b1334d8d8c194a5";

header("Content-Type: application/json");

if(isset($_GET["v"]))
{
    if($_GET["v"] == VERSION)
    {
        echo json_encode(['success' => true]);
    }
    else
    {
        echo json_encode(['success' => false, 'error' => 'The bot is out of date. Please, upload the latest version from the Telegram group.']);
    }
}
else
{
    echo json_encode(['success' => false, 'error' => 'Unknown request.']);
}

?>