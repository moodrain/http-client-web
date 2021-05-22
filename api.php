<?php

use Muyu\Curl;

require __DIR__ . '/vendor/autoload.php';

$request = json_decode(file_get_contents('php://input'), true);
$response = [];

$curl = new Curl($request['url']);

is_string($request['body']) && parse_str($request['body'], $request['body']);
! empty($request['contentType']) && $request['header']['Content-Type'] = $request['contentType'];
$curl->header($request['header']);
$curl->cookie($request['cookie']);

$method = strtolower($request['method']);
$method == 'get' && $curl->query($request['body']);
in_array($method, ['post', 'put', 'patch']) && $curl->data($request['body']);

$curl->$method();

$response['body'] = $curl->content();
$response['header'] = $curl->responseHeader();
$response['cookie'] = $curl->responseCookie();

header('Content-Type: application/json');
echo json_encode([
    'body' => $response['body'],
    'header' => $response['header'],
    'cookie' => $response['cookie'],
], JSON_UNESCAPED_UNICODE);