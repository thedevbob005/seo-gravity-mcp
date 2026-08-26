<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/pricing', function () {
    return view('pricing');
});

Route::get('/posts/{slug}', function ($slug) {
    return view('posts.show', ['slug' => $slug]);
});
