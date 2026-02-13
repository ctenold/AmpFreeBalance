# Build VSIX package manually (VSIX = ZIP with specific structure)
# Usage: powershell -ExecutionPolicy Bypass -File build-vsix.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Read version from package.json
$packageJson = Get-Content "$root\package.json" -Raw | ConvertFrom-Json
$version = $packageJson.version
$name = $packageJson.name
$displayName = $packageJson.displayName
$description = $packageJson.description
$publisher = $packageJson.publisher
$vsixName = "$name-$version.vsix"

Write-Host "Building $vsixName ..." -ForegroundColor Cyan

# Clean up any previous build
$stagingDir = "$root\_vsix_staging"
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\extension" | Out-Null
New-Item -ItemType Directory -Path "$stagingDir\extension\media" | Out-Null

# Copy extension files
Copy-Item "$root\package.json" "$stagingDir\extension\package.json"
Copy-Item "$root\extension.js" "$stagingDir\extension\extension.js"
Copy-Item "$root\README.md" "$stagingDir\extension\README.md"
Copy-Item "$root\media\*" "$stagingDir\extension\media\" -Recurse

# Create [Content_Types].xml
@"
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json" />
  <Default Extension=".js" ContentType="application/javascript" />
  <Default Extension=".md" ContentType="text/markdown" />
  <Default Extension=".png" ContentType="image/png" />
  <Default Extension=".svg" ContentType="image/svg+xml" />
  <Default Extension=".vsixmanifest" ContentType="text/xml" />
</Types>
"@ | Out-File -LiteralPath "$stagingDir\[Content_Types].xml" -Encoding utf8

# Create extension.vsixmanifest
@"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$name" Version="$version" Publisher="$publisher" />
    <DisplayName>$displayName</DisplayName>
    <Description xml:space="preserve">$description</Description>
    <Tags>amp,balance,monitoring,quota,usage</Tags>
    <Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.75.0" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value="" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace" />
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value="" />
      <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
    </Properties>
    <Icon>extension/media/status-bar-demo.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
  </Assets>
</PackageManifest>
"@ | Out-File -FilePath "$stagingDir\extension.vsixmanifest" -Encoding utf8

# Create the VSIX (ZIP) file
$vsixPath = "$root\$vsixName"
if (Test-Path $vsixPath) { Remove-Item $vsixPath -Force }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $vsixPath)

# Also copy as the generic name for easy install
Copy-Item $vsixPath "$root\AmpFreeBalance.vsix" -Force

# Clean up staging
Remove-Item $stagingDir -Recurse -Force

$fileSize = [math]::Round((Get-Item $vsixPath).Length / 1KB, 1)
Write-Host ""
Write-Host "Success! Built $vsixName ($fileSize KB)" -ForegroundColor Green
Write-Host "Also copied to AmpFreeBalance.vsix" -ForegroundColor Green
Write-Host ""
Write-Host "Install: Ctrl+Shift+P -> 'Install from VSIX' -> select $vsixName" -ForegroundColor Yellow
