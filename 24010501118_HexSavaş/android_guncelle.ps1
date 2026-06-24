Write-Host "Oyun dosyalari (HTML, CSS, JS) www klasorune kopyalaniyor..." -ForegroundColor Cyan
Copy-Item "index.html", "styles.css", "game.js", "audio.js", "screens.js", "skins.js", "achievements.js", "leaderboard.js", "store.js", "quests.js", "meta_progression.js" -Destination "www" -Force
Write-Host "Android projesi guncelleniyor..." -ForegroundColor Cyan
npx cap sync android
Write-Host "Basariyla tamamlandi! Degisiklikleriniz Android uygulamasina aktarildi." -ForegroundColor Green
Write-Host "Cikmak icin bir tusa basin..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
