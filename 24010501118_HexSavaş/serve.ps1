$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:3000/')
$listener.Start()
Write-Host 'Server running at http://localhost:3000'

$basePath = 'c:\Users\Arda\Desktop\stitch_alt_gen_otomatik_sava\stitch_alt_gen_otomatik_sava (1)'

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $resp = $ctx.Response
    $urlPath = $req.Url.LocalPath

    if ($urlPath -eq '/') { $urlPath = '/index.html' }

    $filePath = Join-Path $basePath ($urlPath.TrimStart('/'))

    if (Test-Path $filePath) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mimeTypes = @{
            '.html' = 'text/html; charset=utf-8'
            '.css'  = 'text/css; charset=utf-8'
            '.js'   = 'application/javascript; charset=utf-8'
            '.png'  = 'image/png'
            '.jpg'  = 'image/jpeg'
            '.svg'  = 'image/svg+xml'
        }
        $ct = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $resp.ContentType = $ct
        $resp.Headers.Add('Cache-Control', 'no-cache, no-store, must-revalidate')
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $resp.ContentLength64 = $bytes.Length
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $resp.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $resp.OutputStream.Close()
}
