<?php
header("Content-Type: text/javascript;charset=utf-8");

if (isset($_GET["callback"])) {
  echo preg_replace('/[^\w\$]/', "", $_GET["callback"]) . "(" . file_get_contents(__DIR__ . "/json.txt") . ");";
}
