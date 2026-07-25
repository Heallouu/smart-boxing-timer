#!/usr/bin/env bash
set +e

APK="$GITHUB_WORKSPACE/DubSirenDS01-v1.2.1-Android13.apk"

adb install -r "$APK" > "$GITHUB_WORKSPACE/android13-install.txt" 2>&1
INSTALL_RC=$?

adb logcat -c
adb shell am start -W -n com.dubsiren.ds01/.MainActivity > "$GITHUB_WORKSPACE/android13-start.txt" 2>&1
START_RC=$?

sleep 10
PID="$(adb shell pidof com.dubsiren.ds01 2>/dev/null | tr -d '\r')"
adb shell dumpsys activity activities > "$GITHUB_WORKSPACE/android13-activities.txt" 2>&1
adb shell dumpsys package com.dubsiren.ds01 > "$GITHUB_WORKSPACE/android13-package.txt" 2>&1
adb logcat -d > "$GITHUB_WORKSPACE/android13-logcat.txt" 2>&1
adb exec-out screencap -p > "$GITHUB_WORKSPACE/DubSirenDS01-Android13-smoke-test.png" 2>/dev/null
SCREENSHOT_RC=$?

{
  echo "INSTALL_RC=$INSTALL_RC"
  echo "START_RC=$START_RC"
  echo "PID=$PID"
  echo "SCREENSHOT_RC=$SCREENSHOT_RC"
} > "$GITHUB_WORKSPACE/android13-result.txt"

exit 0
