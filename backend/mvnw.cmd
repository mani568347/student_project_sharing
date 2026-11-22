@REM Apache Maven Wrapper Startup Batch Script
@REM https://maven.apache.org/wrapper/
@REM
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM     http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.

@echo off

@REM Enable delayed expansion for better variable handling
setlocal enabledelayedexpansion

@REM MVNW_VERBOSE and MVNW_DEBUG for verbose/debug output
if not "%MVNW_VERBOSE%"=="" (
    set VERBOSE=1
)
if not "%MVNW_DEBUG%"=="" (
    set DEBUG=1
)

@REM Resolve the location of the 'mvnw.cmd' script
set "SELF_PATH=%~f0"
set "MVNW_DIR=%~dp0"
if "%MVNW_DIR:~-1%"=="\" set "MVNW_DIR=%MVNW_DIR:~0,-1%"

set "WRAPPER_DIR=%MVNW_DIR%\.mvn\wrapper"
set "WRAPPER_JAR=%WRAPPER_DIR%\maven-wrapper.jar"
set "WRAPPER_PROPERTIES=%WRAPPER_DIR%\maven-wrapper.properties"

@REM Default Maven version and URLs
set "DEFAULT_MAVEN_VERSION=3.9.6"
set "DEFAULT_WRAPPER_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%DEFAULT_MAVEN_VERSION%/apache-maven-%DEFAULT_MAVEN_VERSION%-bin.zip"

@REM Read Maven version and wrapper URL from properties file if it exists
if exist "%WRAPPER_PROPERTIES%" (
    for /f "usebackq tokens=1* delims==" %%A in (`findstr /R "^wrapperUrl=" "%WRAPPER_PROPERTIES%"`) do (
        set "WRAPPER_URL=%%B"
    )
    for /f "usebackq tokens=1* delims==" %%A in (`findstr /R "^distributionUrl=" "%WRAPPER_PROPERTIES%"`) do (
        set "DISTRIBUTION_URL=%%B"
    )
)

@REM Determine Maven home from environment
if not "%MAVEN_HOME%"=="" (
    set "MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd"
) else if not "%M2_HOME%"=="" (
    set "MVN_CMD=%M2_HOME%\bin\mvn.cmd"
) else (
    @REM Try to find maven in PATH
    where mvn >nul 2>&1
    if not errorlevel 1 (
        set "MVN_CMD=mvn.cmd"
    ) else (
        set "MVN_CMD="
    )
)

@REM If we have a maven command, use it directly
if not "%MVN_CMD%"=="" (
    if exist "%MVN_CMD%" (
        "%MVN_CMD%" %*
        exit /b %ERRORLEVEL%
    ) else (
        @REM mvn found in PATH
        mvn %*
        exit /b %ERRORLEVEL%
    )
)

@REM Check if wrapper jar exists
if exist "%WRAPPER_JAR%" (
    java -jar "%WRAPPER_JAR%" %*
    exit /b %ERRORLEVEL%
)

@REM Create wrapper directory if it doesn't exist
if not exist "%WRAPPER_DIR%" (
    mkdir "%WRAPPER_DIR%" 2>nul
)

@REM Set Maven version from properties or use default
set "MAVEN_VERSION=%DEFAULT_MAVEN_VERSION%"
if defined DISTRIBUTION_URL (
    @REM Extract version from distributionUrl if available
    set "DIST_URL=%DISTRIBUTION_URL%"
    @REM Try to extract version from URL like .../apache-maven-3.9.6-bin.zip
    for /f "tokens=2 delims=-" %%A in ("%DIST_URL%") do (
        for /f "tokens=1 delims=-" %%B in ("%%A") do (
            set "MAVEN_VERSION=%%B"
        )
    )
)

@REM Set distribution URL
set "MAVEN_DIST_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip"
if defined WRAPPER_URL (
    set "MAVEN_DIST_URL=%WRAPPER_URL%"
)

set "MAVEN_DIST_DIR=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%"
set "MAVEN_CMD=%MAVEN_DIST_DIR%\bin\mvn.cmd"
set "MAVEN_DIST_ZIP=%WRAPPER_DIR%\apache-maven-%MAVEN_VERSION%-bin.zip"

@REM Check if Maven is already extracted
if exist "%MAVEN_CMD%" (
    "%MAVEN_CMD%" %*
    exit /b %ERRORLEVEL%
)

@REM Download Maven distribution
echo Downloading Maven %MAVEN_VERSION% from %MAVEN_DIST_URL%...

@REM Use PowerShell to download (available on Windows 7+)
powershell -NoProfile -Command ^
    "try { ^
        Invoke-WebRequest -Uri '%MAVEN_DIST_URL%' -OutFile '%MAVEN_DIST_ZIP%' -ErrorAction Stop; ^
        exit 0 ^
    } catch { ^
        Write-Error $_.Exception.Message; ^
        exit 1 ^
    }"

if errorlevel 1 (
    echo ERROR: Failed to download Maven distribution.
    exit /b 1
)

@REM Extract using PowerShell
powershell -NoProfile -Command ^
    "try { ^
        Expand-Archive -Path '%MAVEN_DIST_ZIP%' -DestinationPath '%WRAPPER_DIR%' -Force; ^
        exit 0 ^
    } catch { ^
        Write-Error $_.Exception.Message; ^
        exit 1 ^
    }"

if errorlevel 1 (
    echo ERROR: Failed to extract Maven distribution.
    exit /b 1
)

@REM Clean up zip file
del "%MAVEN_DIST_ZIP%" 2>nul

@REM Run Maven
if exist "%MAVEN_CMD%" (
    "%MAVEN_CMD%" %*
    exit /b %ERRORLEVEL%
) else (
    echo ERROR: Failed to set up Maven.
    exit /b 1
)