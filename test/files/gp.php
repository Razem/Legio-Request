<?php
header("Content-Type: text/plain;charset=utf-8");

echo "GET:";
if (isset($_GET["a"])) { echo "a" . $_GET["a"]; }
if (isset($_GET["b"])) { echo "b" . $_GET["b"]; }

echo "|";

echo "POST:";
if (isset($_POST["a"])) { echo "a" . $_POST["a"]; }
if (isset($_POST["b"])) { echo "b" . $_POST["b"]; }
