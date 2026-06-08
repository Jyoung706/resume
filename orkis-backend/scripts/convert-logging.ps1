# ORKIS Backend - console.log를 logger로 일괄 변환 스크립트
# 사용법: .\convert-logging.ps1 <파일경로>

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

if (-not (Test-Path $FilePath)) {
    Write-Error "파일을 찾을 수 없습니다: $FilePath"
    exit 1
}

Write-Host "로깅 변환 시작: $FilePath" -ForegroundColor Green

$content = Get-Content $FilePath -Raw

# logger import 확인 및 추가
if ($content -notmatch "import.*logger.*from.*@orkis/core/utils") {
    Write-Host "logger import 추가중..." -ForegroundColor Yellow

    # import 구문 찾기
    if ($content -match "(import[^;]+;)") {
        $lastImport = $Matches[0]
        $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { logger } from '@orkis/core/utils';"
    }
}

# console.log → logger.info
$count = ($content | Select-String -Pattern "console\.log\(" -AllMatches).Matches.Count
$content = $content -replace "console\.log\(", "logger.info("
if ($count -gt 0) {
    Write-Host "  console.log → logger.info: $count 개" -ForegroundColor Cyan
}

# console.error → logger.error
$count = ($content | Select-String -Pattern "console\.error\(" -AllMatches).Matches.Count
$content = $content -replace "console\.error\(", "logger.error("
if ($count -gt 0) {
    Write-Host "  console.error → logger.error: $count 개" -ForegroundColor Cyan
}

# console.warn → logger.warn
$count = ($content | Select-String -Pattern "console\.warn\(" -AllMatches).Matches.Count
$content = $content -replace "console\.warn\(", "logger.warn("
if ($count -gt 0) {
    Write-Host "  console.warn → logger.warn: $count 개" -ForegroundColor Cyan
}

# console.debug → logger.debug
$count = ($content | Select-String -Pattern "console\.debug\(" -AllMatches).Matches.Count
$content = $content -replace "console\.debug\(", "logger.debug("
if ($count -gt 0) {
    Write-Host "  console.debug → logger.debug: $count 개" -ForegroundColor Cyan
}

# 파일 저장
$content | Set-Content $FilePath -NoNewline

Write-Host "변환 완료!" -ForegroundColor Green
Write-Host ""

# 변환 결과 샘플 표시
Write-Host "변환된 라인 샘플 (상위 5개):" -ForegroundColor Yellow
Get-Content $FilePath | Select-String "logger\." | Select-Object -First 5 | ForEach-Object {
    Write-Host "  Line $($_.LineNumber): $($_.Line.Trim())"
}
