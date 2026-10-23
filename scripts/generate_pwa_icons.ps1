Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "public/inteckno-icon.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

# 1. Generate 512x512
$dest512 = New-Object System.Drawing.Bitmap 512, 512
$g512 = [System.Drawing.Graphics]::FromImage($dest512)
$g512.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g512.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g512.Clear([System.Drawing.Color]::White)

$targetW = 460
$targetH = [int](460 * ($src.Height / $src.Width))
$x = [int]((512 - $targetW) / 2)
$y = [int]((512 - $targetH) / 2)

$g512.DrawImage($src, $x, $y, $targetW, $targetH)
$dest512.Save("public/icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Generate 192x192
$dest192 = New-Object System.Drawing.Bitmap 192, 192
$g192 = [System.Drawing.Graphics]::FromImage($dest192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.Clear([System.Drawing.Color]::White)
$g192.DrawImage($dest512, 0, 0, 192, 192)
$dest192.Save("public/icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 3. Generate apple-touch-icon.png (180x180)
$dest180 = New-Object System.Drawing.Bitmap 180, 180
$g180 = [System.Drawing.Graphics]::FromImage($dest180)
$g180.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g180.Clear([System.Drawing.Color]::White)
$g180.DrawImage($dest512, 0, 0, 180, 180)
$dest180.Save("public/apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 4. Generate maskable icon (with safe area margin)
$destMaskable = New-Object System.Drawing.Bitmap 512, 512
$gMask = [System.Drawing.Graphics]::FromImage($destMaskable)
$gMask.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMask.Clear([System.Drawing.Color]::White)
$maskW = 380
$maskH = [int](380 * ($src.Height / $src.Width))
$maskX = [int]((512 - $maskW) / 2)
$maskY = [int]((512 - $maskH) / 2)
$gMask.DrawImage($src, $maskX, $maskY, $maskW, $maskH)
$destMaskable.Save("public/icon-maskable-512.png", [System.Drawing.Imaging.ImageFormat]::Png)

$src.Dispose()
$g512.Dispose()
$dest512.Dispose()
$g192.Dispose()
$dest192.Dispose()
$g180.Dispose()
$dest180.Dispose()
$gMask.Dispose()
$destMaskable.Dispose()

Write-Output "PWA icons created successfully!"
