set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
call npx cap sync android
cd android
call gradlew assembleDebug
cd ..
copy android\app\build\outputs\apk\debug\app-debug.apk hexsavas.apk /Y
