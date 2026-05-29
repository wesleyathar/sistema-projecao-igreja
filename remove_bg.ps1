Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("C:\VScode\Projetos\Sistema\logo_igreja.jpeg")
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()
$width = $bmp.Width
$height = $bmp.Height
for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -gt 235 -and $pixel.G -gt 235 -and $pixel.B -gt 235) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        }
    }
}
$bmp.Save("C:\VScode\Projetos\Sistema\logo_igreja_transparent.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
