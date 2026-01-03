const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function findEmulatorPath() {
  const commonPaths = [];

  // Check environment variables
  if (process.env.ANDROID_HOME) {
    commonPaths.push(
      `${process.env.ANDROID_HOME}/emulator/emulator`,
      `${process.env.ANDROID_HOME}/tools/emulator`
    );
  }

  if (process.env.ANDROID_SDK_ROOT) {
    commonPaths.push(
      `${process.env.ANDROID_SDK_ROOT}/emulator/emulator`,
      `${process.env.ANDROID_SDK_ROOT}/tools/emulator`
    );
  }

  // Check common macOS/Linux locations
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    commonPaths.push(
      `${homeDir}/Library/Android/sdk/emulator/emulator`, // macOS
      `${homeDir}/Android/Sdk/emulator/emulator` // Linux
    );
  }

  // Check PATH
  commonPaths.push("emulator");

  const uniquePaths = [...new Set(commonPaths)];

  for (const path of uniquePaths) {
    try {
      await Promise.race([
        execAsync(`"${path}" -version`, { timeout: 3000 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 3000)
        ),
      ]);
      return path;
    } catch (error) {
      continue;
    }
  }

  return "emulator"; // fallback
}

async function testEmulatorOptions() {
  console.log("🔍 Testing Emulator Options...\n");

  // Find emulator path
  console.log("1. Finding emulator executable...");
  const emulatorPath = await findEmulatorPath();
  console.log(`   ✓ Found emulator at: ${emulatorPath}\n`);

  // Check emulator version
  console.log("2. Checking emulator version...");
  try {
    const { stdout: versionOutput } = await execAsync(
      `"${emulatorPath}" -version`,
      { timeout: 5000 }
    );
    console.log("   ✓ Emulator version:");
    console.log(
      versionOutput
        .split("\n")
        .map((line) => `      ${line}`)
        .join("\n")
    );
  } catch (error) {
    console.log(`   ✗ Failed to get version: ${error.message}`);
  }
  console.log();

  // List available AVDs
  console.log("3. Listing available AVDs...");
  try {
    const { stdout: avdOutput } = await execAsync(
      `"${emulatorPath}" -list-avds`,
      { timeout: 10000 }
    );
    const avds = avdOutput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (avds.length === 0) {
      console.log("   ⚠ No AVDs found. You need to create an AVD first.");
      console.log("   💡 To create an AVD:");
      console.log(
        "      - Use Android Studio: Tools > Device Manager > Create Device"
      );
      console.log(
        "      - Or use command line: avdmanager create avd -n <name> -k <system-image>"
      );
    } else {
      console.log(`   ✓ Found ${avds.length} AVD(s):\n`);
      avds.forEach((avd, index) => {
        console.log(`   ${index + 1}. ${avd}`);
      });
    }
  } catch (error) {
    console.log(`   ✗ Failed to list AVDs: ${error.message}`);
    console.log(
      "   💡 Make sure Android SDK is properly installed and configured."
    );
  }
  console.log();

  // Check environment variables
  console.log("4. Environment variables:");
  console.log(`   ANDROID_HOME: ${process.env.ANDROID_HOME || "not set"}`);
  console.log(
    `   ANDROID_SDK_ROOT: ${process.env.ANDROID_SDK_ROOT || "not set"}`
  );
  console.log(
    `   HOME: ${process.env.HOME || process.env.USERPROFILE || "not set"}`
  );
  console.log();

  console.log("✅ Test completed!");
}

testEmulatorOptions().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
