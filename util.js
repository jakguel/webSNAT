import { promises as fs } from 'fs';
import { exec } from 'child_process';
import {stateFile} from './globals.js'


/**
 * Acquires a file-based lock by creating a lock file.
 *
 * @async
 * @param {string} lockFilePath - The path to the lock file.
 *
 * @description
 * - Implements a simple mutex pattern using a file as the synchronization mechanism.
 * - Polls the lock file's existence at 100ms intervals until it can be acquired.
 * - When the lock file doesn't exist, creates an empty file to establish the lock.
 * - Blocks execution until the lock is successfully acquired.
 * - Downside: Does not implement timeout or deadlock detection - callers must ensure proper release.
 * - Downside: Data races possible if two concurrent calls happen and the lock file is created too late.
 *
 */
export async function acquireLock(lockFilePath) {
  while (await fs.access(lockFilePath).catch(() => false)) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await fs.writeFile(lockFilePath, '');
}

/**
 * Releases a previously acquired file-based lock.
 *
 * @async
 * @param {string} lockFilePath - The path to the lock file.
 *
 * @description
 * - Removes the lock file to release the lock.
 * - Should only be called after a successful call to acquireLock().
 * - Will throw an error if the lock file doesn't exist or cannot be removed.
 */
export async function releaseLock(lockFilePath) {
    await fs.unlink(lockFilePath);
}

/**
 * Stores the application state in a JSON file, optionally allowing a callback to modify it.
 *
 * @async
 * @param {function} [callback] - Optional function that receives the current state object and can modify it.
 * @throws {Error} If an error occurs during file operations (e.g., reading/writing).
 *
 * @description
 * - Reads the state from "state.json" if it exists, or initializes an empty object.
 * - If no callback is provided, returns the state without modification.
 * - If a callback is provided, executes it with the state object (modifications are applied in-place).
 *    - Writes the modified state back to "state.json" after the callback completes.
 * - Handles file I/O errors gracefully and rethrows them with detailed messages.
 */
export async function store(callback) {
  try {
    // Acquire Lock
    await acquireLock('state.lock');
    let state;
    try {
      const data = await fs.readFile(stateFile, 'utf-8');
      state = JSON.parse(data) ?? {};
    } catch (err) { state = {};}
    // return state if callback not set
    if (!callback) return state;
    // pass state to callback
    callback(state);
    // write state to file again
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  } catch (err) {
    throw new Error(`Error while storing or reading state file '${stateFile}': ${err.message}`);
  } finally {
    await releaseLock('state.lock');
  }
}

/**
 * Executes a shell command and returns the result as a Promise.
 *
 * @param {string} command - The shell command to execute.
 * @returns {Promise<string>} A Promise that resolves with the trimmed stdout output.
 * @throws {Error} Enhanced error object with code, stdout, and stderr properties.
 *
 * @description
 * - Logs the command being executed to the console.
 * - Wraps the Node.js exec function in a Promise for easier async handling.
 * - On success: Resolves with the trimmed stdout content.
 * - On failure: Rejects with an enhanced Error object containing:
 *   - A descriptive error message with the command, exit code, stdout, and stderr.
 *   - Additional properties: code, stdout, and stderr for programmatic access.
 * - Trims whitespace from both stdout and stderr outputs.
 */
export function executeCommand(command) {
    console.log(`Executing command: ${command}`);
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                const fullError = new Error(`Command execution error: ${command}\nExit Code: ${error.code}\nStderr: ${stderr.trim()}\nStdout: ${stdout.trim()}`);
                fullError.stdout = stdout.trim();
                fullError.stderr = stderr.trim();
                fullError.code = error.code;
                reject(fullError);
                return;
            }
            resolve(stdout.trim());
        });
    });
}
