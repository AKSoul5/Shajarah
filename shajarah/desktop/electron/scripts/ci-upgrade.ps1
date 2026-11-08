# CI only (a fresh Windows runner): a real upgrade from a published release
# to the candidate, with data created by the old release itself.
#
#   1. install the old release; start it; create a family through its own API; close it
#   2. update it to the candidate through the OLD program's own updater, from a
#      local feed serving the candidate's latest.yml and installer (nothing published)
#   3. start the candidate; the family must be exactly as the old release left it
#   4. (with -Recovery) the candidate's --recovery-test on a copy of that database
#      with PG_VERSION removed: reported, and not one byte of the copy changed
#   5. (with -DownAndUp) reinstall the old release: it still opens the family
#   6. (with -RedProof) the old release itself, on that database with PG_VERSION
#      removed, deletes it: the defect 1.0.52 fixes, shown on Windows
#
# Exits non-zero on the first failure.
param(
  [Parameter(Mandatory)] [string] $OldInstaller,
  [Parameter(Mandatory)] [string] $OldVersion,
  [Parameter(Mandatory)] [string] $CandidateDir,   # holds latest.yml, the installer and its blockmap
  [Parameter(Mandatory)] [string] $NewVersion,
  [switch] $Recovery,
  [switch] $DownAndUp,
  [switch] $RedProof
)
$ErrorActionPreference = 'Stop'
$exe = Join-Path $env:LOCALAPPDATA 'Programs\Shajarah\Shajarah.exe'
$resources = Join-Path $env:LOCALAPPDATA 'Programs\Shajarah\resources'
$data = Join-Path $env:APPDATA 'Shajarah'
$logFile = Join-Path $data 'logs\shajarah.log'

function Installed { if (Test-Path $exe) { "$((Get-Item $exe).VersionInfo.ProductVersion)" } else { '' } }

function Install-Release([string] $installer, [string] $version) {
  Start-Process -FilePath $installer -ArgumentList '/S' -Wait
  if (-not (Installed).StartsWith($version)) { throw "Installing $version failed (installed: '$(Installed)')" }
  "installed $version"
}

# Starts the installed program normally and returns its process and address.
function Start-App {
  $lines = if (Test-Path $logFile) { (Get-Content $logFile).Count } else { 0 }
  $p = Start-Process -FilePath $exe -PassThru
  $clock = [Diagnostics.Stopwatch]::StartNew()
  while ($clock.Elapsed.TotalSeconds -lt 240) {
    Start-Sleep 2
    if (Test-Path $logFile) {
      $new = Get-Content $logFile | Select-Object -Skip $lines
      $ready = $new | Select-String 'ready at (http://127\.0\.0\.1:\d+)' | Select-Object -Last 1
      if ($ready) { return @{ Process = $p; Url = $ready.Matches[0].Groups[1].Value } }
      if ($new | Select-String 'failed:') { $new | Select-Object -Last 30; throw 'The program failed to start' }
    }
    if ($p.HasExited) { throw "The program exited ($($p.ExitCode)) before it was ready" }
  }
  throw 'The program was not ready in 4 minutes'
}

# Closes the program as a person would (its window), so it stops its database cleanly.
function Stop-App($app) {
  $p = Get-Process -Id $app.Process.Id -ErrorAction SilentlyContinue
  if ($p) {
    $null = $p.CloseMainWindow()
    if (-not $p.WaitForExit(90000)) { Stop-Process -Id $p.Id -Force; throw 'The program did not close in 90 s' }
  }
  Start-Sleep 3
  if (Get-Process -Name 'postgres' -ErrorAction SilentlyContinue) { throw 'PostgreSQL is still running after the program closed' }
}

function Api($app, [string] $method, [string] $path, $body = $null) {
  $req = @{ Method = $method; Uri = "$($app.Url)$path"; ContentType = 'application/json; charset=utf-8' }
  if ($null -ne $body) { $req.Body = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Compress)) }
  Invoke-RestMethod @req
}

# The family as names and relationships (ids differ between nothing here, but names are what a person sees).
function Describe-Family($tree) {
  $byId = @{}; foreach ($m in $tree.members) { $byId[$m.id] = $m }
  $people = $tree.members | ForEach-Object {
    "$($_.name)|$($_.gender)|father=$(if ($_.fatherId) { $byId[$_.fatherId].name })|mother=$(if ($_.motherId) { $byId[$_.motherId].name })|order=$($_.birthOrder)"
  } | Sort-Object
  $couples = $tree.marriages | ForEach-Object { (@($byId[$_.spouseAId].name, $byId[$_.spouseBId].name) | Sort-Object) -join '+' } | Sort-Object
  (@("tree=$($tree.name)|root=$(if ($tree.rootMemberId) { $byId[$tree.rootMemberId].name })") + $people + $couples) -join "`n"
}

function Fingerprint([string] $dir) {
  (Get-ChildItem $dir -Recurse -File | Sort-Object FullName | ForEach-Object {
    "$($_.FullName.Substring($dir.Length))|$($_.Length)|$((Get-FileHash $_.FullName -Algorithm SHA256).Hash)"
  }) -join "`n"
}

# ── 1. the old release creates a family
Install-Release $OldInstaller $OldVersion
$app = Start-App
$tree = Api $app POST '/api/trees' @{ name = 'Upgrade test family' }
$id = $tree.id
$t = Api $app POST "/api/trees/$id/members" @{ name = 'Adam'; gender = 'MALE' }
$adam = ($t.members | Where-Object name -eq 'Adam').id
$t = Api $app POST "/api/trees/$id/members" @{ name = 'Hawa'; gender = 'FEMALE' }
$hawa = ($t.members | Where-Object name -eq 'Hawa').id
$null = Api $app POST "/api/trees/$id/members" @{ name = 'Bakr'; gender = 'MALE'; fatherId = $adam; motherId = $hawa }
$null = Api $app POST "/api/trees/$id/members" @{ name = 'نوري'; gender = 'MALE'; fatherId = $adam; motherId = $hawa }
$null = Api $app POST "/api/trees/$id/members" @{ name = 'Salma'; gender = 'FEMALE'; fatherId = $adam }
$null = Api $app POST "/api/trees/$id/marriages" @{ spouseAId = $adam; spouseBId = $hawa }
$before = Describe-Family (Api $app GET "/api/trees/$id")
"family created by $OldVersion`n$before"
Stop-App $app

# ── 2. the old program's own updater, from a local feed
$feed = Start-Process -FilePath 'python' -ArgumentList '-m', 'http.server', '8411', '--bind', '127.0.0.1', '--directory', $CandidateDir -PassThru -WindowStyle Hidden
try {
  Start-Sleep 3
  $yml = Join-Path $resources 'app-update.yml'
  "app-update.yml was:"; Get-Content $yml
  Set-Content -Path $yml -Value "provider: generic`nurl: http://127.0.0.1:8411/`nupdaterCacheDirName: shajarah-desktop-updater" -Encoding utf8
  $p = Start-Process -FilePath $exe -ArgumentList '--update-test' -PassThru
  if (-not $p.WaitForExit(300000)) { $p.Kill(); throw 'The update check did not finish in 5 minutes' }
  Get-Content (Join-Path $data 'logs\update-test.txt')
  if ($p.ExitCode -ne 0) { throw "The $OldVersion updater did not take the update (exit $($p.ExitCode))" }
  $clock = [Diagnostics.Stopwatch]::StartNew()
  Start-Sleep 5
  while ((Get-Process -Name 'Shajarah-Setup*' -ErrorAction SilentlyContinue) -and $clock.Elapsed.TotalSeconds -lt 300) { Start-Sleep 3 }
  while (-not (Installed).StartsWith($NewVersion) -and $clock.Elapsed.TotalSeconds -lt 300) { Start-Sleep 5 }
  if (-not (Installed).StartsWith($NewVersion)) { throw "The update did not install $NewVersion (installed: '$(Installed)')" }
  "updated $OldVersion -> $(Installed) through the updater ($([int]$clock.Elapsed.TotalSeconds) s)"
} finally {
  Stop-Process -Id $feed.Id -Force -ErrorAction SilentlyContinue
}

# ── 3. the candidate opens the same family
Start-Sleep 5
$app = Start-App
$after = Describe-Family (Api $app GET "/api/trees/$id")
Stop-App $app
if ($after -ne $before) { "after:`n$after"; throw "The family changed in the upgrade from $OldVersion" }
"family identical after the upgrade from $OldVersion"
if (Test-Path (Join-Path $data 'database\active.json')) { throw 'An upgrade must keep using the existing database folder (no active.json)' }

# ── 4. the candidate on a copy with PG_VERSION missing changes nothing
if ($Recovery) {
  $root = Join-Path $env:RUNNER_TEMP 'damaged'
  $copy = Join-Path $root 'database'
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  Copy-Item -Recurse (Join-Path $data 'database') $copy
  Remove-Item (Join-Path $copy 'cluster\PG_VERSION')
  $fp = Fingerprint $copy
  $env:SHAJARAH_USER_DATA = $root
  $p = Start-Process -FilePath $exe -ArgumentList '--recovery-test' -PassThru -Wait
  Remove-Item Env:SHAJARAH_USER_DATA
  $report = Get-Content (Join-Path $root 'logs\recovery-test.txt')
  $report
  if ($p.ExitCode -ne 3 -or -not ($report -match '"kind":"marker-missing"')) { throw "--recovery-test did not report marker-missing (exit $($p.ExitCode))" }
  if ((Fingerprint $copy) -ne $fp) { throw 'The candidate changed the damaged database folder' }
  'recovery test: marker-missing reported; the folder is byte-identical'
}

# ── 5. back to the old release, and up again
if ($DownAndUp) {
  Install-Release $OldInstaller $OldVersion
  $app = Start-App
  $back = Describe-Family (Api $app GET "/api/trees/$id")
  Stop-App $app
  if ($back -ne $before) { throw "$OldVersion no longer opens the family after the upgrade" }
  "reinstalled $OldVersion over $NewVersion: the family opens unchanged"
  Install-Release (Get-ChildItem $CandidateDir -Filter 'Shajarah-Setup-*.exe' | Select-Object -First 1).FullName $NewVersion
  $app = Start-App
  $again = Describe-Family (Api $app GET "/api/trees/$id")
  Stop-App $app
  if ($again -ne $before) { throw "$NewVersion did not open the family after the round trip" }
  "and $NewVersion again: unchanged"
}

# ── 6. red proof: the old release deletes a database whose PG_VERSION is missing
if ($RedProof) {
  Install-Release $OldInstaller $OldVersion
  Remove-Item (Join-Path $data 'database\cluster\PG_VERSION')
  $app = Start-App   # 1.0.51 deletes the folder, then sets up an empty database
  $trees = @(Api $app GET '/api/trees')
  Stop-App $app
  if ($trees | Where-Object id -eq $id) { throw "Red proof not reproduced: $OldVersion kept the family" }
  "RED PROOF CONFIRMED: $OldVersion deleted the family database (families now: $($trees.Count))"
}
