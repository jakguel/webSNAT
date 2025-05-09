import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { STATE_FILE } from './globals.js'
import {Mutex, withTimeout} from 'async-mutex';

const mutex_store = new Mutex();

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
  const release = await mutex_store.acquire();
  try {
    let state;
    try {
      const data = await fs.readFile(STATE_FILE, 'utf-8');
      state = JSON.parse(data) ?? {};
    } catch (err) { state = {};}
    // return state if callback not set
    if (!callback) return state;
    // else pass state to callback and store
    callback(state);
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    throw new Error(`Error while storing or reading state file '${STATE_FILE}': ${err.message}`);
  } finally {
    await release();
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
