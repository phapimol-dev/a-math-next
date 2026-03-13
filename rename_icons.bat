@echo off
setlocal
set "targetDir=C:\Users\User\Downloads\A-math-web\a-math-next\public\icons"
cd /d "%targetDir%"
if exist icon-192x192.png.png (
    ren icon-192x192.png.png icon-192x192.png
    echo Renamed 192
)
if exist icon-512x512.png.png (
    ren icon-512x512.png.png icon-512x512.png
    echo Renamed 512
)
dir
