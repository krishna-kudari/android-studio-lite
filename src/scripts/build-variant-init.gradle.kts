/**
 * This is a Gradle init script that is used to print the Android variants to the console.
 * format:
 * ```
 * ANDROID_BUILD_VARIANTS_PROTOCOL={
 *   "schemaVersion": 1,
 *   "generatedAt": 1768111154600,
 *   "modules": {
 *     ":app": {
 *       "type": "application",
 *       "variants": [
 *         {
 *           "name": "ProductionDebug",
 *           "buildType": "debug",
 *           "flavors": [
 *             "Production"
 *           ],
 *           "applicationId": "com.krishna.github_fastlane_ci_cd.debug",
 *           "tasks": {
 *             "assemble": "assembleProductionDebug",
 *             "install": "installProductionDebug"
 *           }
 *         },
 *         {
 *           "name": "ProductionRelease",
 *           "buildType": "release",
 *           "flavors": [
 *             "Production"
 *           ],
 *           "applicationId": "com.krishna.github_fastlane_ci_cd",
 *           "tasks": {
 *             "assemble": "assembleProductionRelease",
 *             "bundle": "bundleProductionRelease"
 *           }
 *         }
 *       ]
 *     },
 *     ":applite": {
 *       "type": "application",
 *       "variants": [
 *         {
 *           "name": "debug",
 *           "buildType": "debug",
 *           "flavors": [],
 *           "applicationId": "com.example.applite",
 *           "tasks": {
 *             "assemble": "assembleDebug",
 *             "install": "installDebug"
 *           }
 *         },
 *         {
 *           "name": "release",
 *           "buildType": "release",
 *           "flavors": [],
 *           "applicationId": "com.example.applite",
 *           "tasks": {
 *             "assemble": "assembleRelease",
 *             "bundle": "bundleRelease"
 *           }
 *         }
 *       ]
 *     },
 *     ":authsdk": {
 *       "type": "library",
 *       "variants": [
 *         {
 *           "name": "debug",
 *           "buildType": "debug",
 *           "flavors": [],
 *           "applicationId": null,
 *           "tasks": {
 *             "assemble": "assembleDebug"
 *           }
 *         },
 *         {
 *           "name": "release",
 *           "buildType": "release",
 *           "flavors": [],
 *           "applicationId": null,
 *           "tasks": {
 *             "assemble": "assembleRelease"
 *           }
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
gradle.rootProject {

    tasks.create("printAndroidVariants") {

        doLast {

            val modules = mutableMapOf<String, Any?>()

            fun capitalize(name: String): String =
                name.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

            for (project in rootProject.subprojects) {

                val isApp = project.plugins.hasPlugin("com.android.application")
                val isLib = project.plugins.hasPlugin("com.android.library")

                if (!isApp && !isLib) continue

                val androidExt = project.extensions.findByName("android") ?: continue

                val variantsList = mutableListOf<Map<String, Any?>>()

                fun readVariants(methodName: String) {
                    var target: java.lang.reflect.Method? = null

                    for (m in androidExt.javaClass.methods) {
                        if (m.name == methodName) {
                            target = m
                            break
                        }
                    }
                    if (target == null) return

                    val variants = target.invoke(androidExt) as Iterable<*>

                    for (variant in variants) {
                        val v = variant ?: continue

                        val name =
                            v.javaClass.getMethod("getName")
                                .invoke(v) as String

                        val applicationId: String? =
                            if (isApp) {
                                try {
                                    val getAppId = v.javaClass.methods
                                        .firstOrNull { it.name == "getApplicationId" }

                                    when (val value = getAppId?.invoke(v)) {
                                        is String -> value
                                        else -> null
                                    }
                                } catch (_: Throwable) {
                                    null
                                }
                            } else null
                        val buildTypeObj =
                            v.javaClass.getMethod("getBuildType")
                                .invoke(v)

                        val buildType =
                            buildTypeObj.javaClass
                                .getMethod("getName")
                                .invoke(buildTypeObj) as String

                        val flavorObjs =
                            v.javaClass.getMethod("getProductFlavors")
                                .invoke(v) as List<*>

                        val flavorNames = mutableListOf<String>()
                        for (f in flavorObjs) {
                            flavorNames.add(
                                f!!.javaClass.getMethod("getName")
                                    .invoke(f) as String
                            )
                        }

                        val variantCap = capitalize(name)

                        val tasks = mutableMapOf<String, String>()
                        tasks["assemble"] = "assemble$variantCap"

                        if (isApp && buildType == "debug") {
                            tasks["install"] = "install$variantCap"
                        }

                        if (isApp && buildType == "release") {
                            tasks["bundle"] = "bundle$variantCap"
                        }

                        variantsList.add(
                            mapOf(
                                "name" to name,
                                "buildType" to buildType,
                                "flavors" to flavorNames,
                                "applicationId" to applicationId,
                                "tasks" to tasks
                            )
                        )
                    }
                }

                // Legacy + current AGP support
                readVariants("getApplicationVariants")
                readVariants("getLibraryVariants")

                if (variantsList.isNotEmpty()) {
                    modules[project.path] = mapOf(
                        "type" to if (isApp) "application" else "library",
                        "variants" to variantsList
                    )
                }
            }

            val result = mapOf(
                "schemaVersion" to 1,
                "generatedAt" to System.currentTimeMillis(),
                "modules" to modules
            )

            fun toJson(value: Any?): String =
                when (value) {
                    null -> "null"
                    is String -> "\"${value.replace("\"", "\\\"")}\""
                    is Number, is Boolean -> value.toString()
                    is Map<*, *> ->
                        value.entries.joinToString(
                            prefix = "{",
                            postfix = "}"
                        ) { (k, v) ->
                            "\"$k\":${toJson(v)}"
                        }
                    is Iterable<*> ->
                        value.joinToString(
                            prefix = "[",
                            postfix = "]"
                        ) { toJson(it) }
                    else -> "\"$value\""
                }

            println("ANDROID_BUILD_VARIANTS_PROTOCOL=${toJson(result)}")
        }
    }
}
