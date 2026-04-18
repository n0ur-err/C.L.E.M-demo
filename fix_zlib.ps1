$src = "C:\Program Files (x86)\CLEM\python-apps\emotions\zlibwapi.dll"
$dest = "C:\Windows\System32\zlibwapi.dll"

Copy-Item $src $dest -Force
Write-Host "Copied from CLEM installation"

# Verify architecture
$bytes = [System.IO.File]::ReadAllBytes($dest)
$peOffset = [System.BitConverter]::ToInt32($bytes, 0x3C)
$machine = [System.BitConverter]::ToUInt16($bytes, $peOffset + 4)
if ($machine -eq 0x8664) { Write-Host "Confirmed: 64-bit (x64)" }
elseif ($machine -eq 0x14c) { Write-Host "WARNING: Still 32-bit!" }
else { Write-Host "Machine type: 0x$($machine.ToString('X4'))" }
