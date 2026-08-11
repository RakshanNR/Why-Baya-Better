$root = "C:\Users\andre\OneDrive\Documents\Claude Code\BayaRadar"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8321/")
$listener.Start()
Write-Host "Serving $root on http://localhost:8321/"
$types = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css"; ".md"="text/plain; charset=utf-8"; ".json"="application/json"; ".svg"="image/svg+xml" }
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrEmpty($path)) { $path = "demo.html" }
    $file = Join-Path $root $path
    $resolved = [System.IO.Path]::GetFullPath($file)
    if ($resolved.StartsWith($root) -and (Test-Path $resolved -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch { Write-Host "req error: $_" }
}
