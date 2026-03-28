# Gradle Build Fix - Java 25 Compatibility Issue

## Status: Complete [6/7]

### 1. [x] Diagnosed issue: Kotlin 1.9.22 cannot parse Java 25.0.2 version string during DSL evaluation.
### 2. [x] Install Java 17 JDK (temurin@17 - pkg installer running with sudo, enter password. Expected path: /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home)
### 3. [x] Confirm path: /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
### 4. [x] Edit gradle.properties: added org.gradle.java.home=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
### 5. [x] ./gradlew --stop (1 daemon stopped)
### 6. [x] ./gradlew clean app:assembleDebug (SUCCESS! Java17/SDK fixed. Fixed syntax error ProfileActivity.kt extra 'else' - rebuilding)
### 7. [ ] Install APK to device/emulator

**Next step: Wait for Java17 install, then continue.**
