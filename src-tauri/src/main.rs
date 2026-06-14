/*
 * WhatsRemind - Desktop Notification Application
 * Copyright (c) 2026 famtiago. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ws_remind_lib::run()
}
