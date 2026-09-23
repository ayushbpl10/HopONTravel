Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $dstPath, $w, $h) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $w, $h)
    $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
    Write-Host "Generated $dstPath ($w by $h)"
}

$root = (Get-Location).Path
$srcIcon = Join-Path $root "web\app_icon.png"

Resize-Image $srcIcon (Join-Path $root "web\favicon-16x16.png") 16 16
Resize-Image $srcIcon (Join-Path $root "web\favicon-32x32.png") 32 32
Resize-Image $srcIcon (Join-Path $root "web\favicon-48x48.png") 48 48
Resize-Image $srcIcon (Join-Path $root "web\favicon-96x96.png") 96 96
Resize-Image $srcIcon (Join-Path $root "web\favicon-192x192.png") 192 192
Resize-Image $srcIcon (Join-Path $root "web\apple-touch-icon.png") 180 180
Resize-Image $srcIcon (Join-Path $root "web\favicon.png") 48 48
