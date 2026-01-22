<?php
// Force JavaScript MIME type
if (preg_match('/\.js$/', $_SERVER['REQUEST_URI'])) {
    header('Content-Type: application/javascript');
    readfile(__DIR__ . $_SERVER['REQUEST_URI']);
    exit;
}

// Serve HTML for root
readfile(__DIR__ . '/index.html');
?>