const fs = require('fs');
const path = require('path');

function readRequestBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => callback(body));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function requestFlag(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

function requestObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function fingerprintValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof value.value === 'string') {
    return value.value.trim();
  }
  return '';
}

function fingerprintAlgorithm(value) {
  if (value && typeof value === 'object' && typeof value.algorithm === 'string') {
    return value.algorithm.trim();
  }
  return '';
}

function assertRequestedFingerprintMatches(label, requested, expected) {
  const requestedValue = fingerprintValue(requested);
  if (!requestedValue) return;

  const expectedValue = fingerprintValue(expected);
  const requestedAlgorithm = fingerprintAlgorithm(requested);
  const expectedAlgorithm = fingerprintAlgorithm(expected);
  if (
    requestedValue !== expectedValue ||
    (requestedAlgorithm && expectedAlgorithm && requestedAlgorithm !== expectedAlgorithm)
  ) {
    const error = new Error(`${label} fingerprint mismatch. Refresh the style bake input and retry.`);
    error.statusCode = 409;
    throw error;
  }
}

function assertRequestedCacheKeyMatches(requestedCacheKey, expectedCacheKey) {
  const requestedValue =
    typeof requestedCacheKey === 'string' ? requestedCacheKey.trim() : '';
  if (!requestedValue) return;
  if (requestedValue === String(expectedCacheKey)) return;
  const error = new Error('Style bake cache key mismatch. Refresh the style bake input and retry.');
  error.statusCode = 409;
  throw error;
}

async function handleStyleRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route;
  const {
    BLENDER_EXPORT_ROOT,
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GENERATED_BLENDER_REIMPORT_ROOT,
    GENERATED_STYLE_LAB_ROOT,
    buildSafeAssetSlug,
    clampNumber,
    copyModelToGlb,
    createGeneratedStyleDirectory,
    detectBlenderExecutable,
    detectReferenceImageForAsset,
    ensureComfyUiReferenceImage,
    ensureDirectory,
    extractBoundingBoxFromInspectReport,
    findLatestBlenderExportForSource,
    findLatestModelInDirectory,
    findLatestStyleWorkspaceForAsset,
    formatBytes,
    getComfyUiInstallRoot,
    getHunyuanBackendStatus,
    inspectGltfAsset,
    launchBlenderFile,
    resolveBlenderExportDirectory,
    resolveInspectableModelAsset,
    resolvePublicAssetPath,
    runBlenderStyleBakeAsset,
    runGltfTransform,
    runStyleBakeAsset,
    slugify,
    timestampKey,
    toPublicAssetUrl,
    toRepoRelative,
  } = context;

  if (pathname === '/api/style/inspect' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;

      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const inspection = detectReferenceImageForAsset(assetUrl);
      const stats = fs.statSync(inspection.assetPath);
      let inspectReport = '';

      if (inspection.supportsReplacementGeneration) {
        try {
          inspectReport = await inspectGltfAsset(inspection.assetPath);
        } catch (error) {
          inspectReport = `glTF inspection unavailable: ${error.message}`;
        }
      }

      const bounds = extractBoundingBoxFromInspectReport(inspectReport);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        inspection,
        analysis: {
          sizeBytes: stats.size,
          sizeFormatted: formatBytes(stats.size),
          modifiedAt: stats.mtime.toISOString(),
          inspectReport,
          bounds,
        },
      }));
    } catch (error) {
      console.error('Style inspect error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Style inspect failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/style/fingerprint' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;

      if (!assetUrl) {
        sendJson(res, 400, { success: false, message: 'assetUrl is required' });
        return;
      }

      const { fingerprintFile } = await import('../lib/styleBakeProducts.mjs');
      const source = resolveInspectableModelAsset(assetUrl);
      const stats = fs.statSync(source.assetPath);
      const sourceAssetFingerprint = fingerprintFile(source.assetPath);

      sendJson(res, 200, {
        success: true,
        assetUrl,
        sourceAssetPath: toRepoRelative(source.assetPath),
        sourceAssetFingerprint,
        fingerprint: sourceAssetFingerprint,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      });
    } catch (error) {
      console.error('Style fingerprint error:', error);
      sendJson(res, 500, { success: false, message: `Style fingerprint failed: ${error.message}` });
    }
    return;
  }

  if (pathname === '/api/style/simplify' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          ratio = 0.6,
          error = 0.001,
          lockBorder = true,
          outputName = '',
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const targetRatio = clampNumber(ratio, 0.05, 1, 0.6);
        const targetError = clampNumber(error, 0.00001, 1, 0.001);
        const outputDirectory = createGeneratedStyleDirectory(outputName || source.assetName, 'simplified');
        const outputFileName = `${slugify(outputName || source.assetName)}-simplified.glb`;
        const outputPath = path.join(outputDirectory, outputFileName);

        const simplifyResult = await runGltfTransform([
          'simplify',
          source.assetPath,
          outputPath,
          '--ratio',
          String(targetRatio),
          '--error',
          String(targetError),
          '--lock-border',
          lockBorder ? 'true' : 'false',
        ]);

        if (simplifyResult.code !== 0) {
          throw new Error(simplifyResult.stderr || simplifyResult.stdout || 'Mesh simplification failed.');
        }

        const inspectReport = await inspectGltfAsset(outputPath).catch((inspectError) => (
          `glTF inspection unavailable: ${inspectError.message}`
        ));
        const outputStats = fs.statSync(outputPath);
        const manifestPath = path.join(outputDirectory, 'style-simplify.json');

        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          outputAssetUrl: toPublicAssetUrl(outputPath),
          ratio: targetRatio,
          error: targetError,
          lockBorder: Boolean(lockBorder),
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Created simplified mesh at ${toPublicAssetUrl(outputPath)}`,
          assetUrl: toPublicAssetUrl(outputPath),
          assetPath: toRepoRelative(outputPath),
          manifestPath: toRepoRelative(manifestPath),
          sizeBytes: outputStats.size,
          sizeFormatted: formatBytes(outputStats.size),
          inspectReport,
        }));
      } catch (error) {
        console.error('Style simplify error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Style simplify failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/bake-procedural' && req.method === 'POST') {
    readRequestBody(req, async (body) => {
      try {
        const {
          createStyleBakeProduct,
          fingerprintFile,
          getStyleBakeCacheKey,
          getStyleBakeProductStatus,
          getStyleBakeSettingsFingerprint,
          normalizeStyleBakeMode,
          normalizeStyleBakeSettings,
          readStyleBakeProductMetadata,
          styleBakeProceduralGenerator,
        } = await import('../lib/styleBakeProducts.mjs');
        const {
          assetUrl,
          outputName = '',
          styleProfileName = 'Painterly Storybook',
          prompt = '',
          textureSize = 256,
          lineStrength = 0.2,
          brushStrength = 0.2,
          aoStrength = 0,
          cavityStrength = 0,
          curvatureStrength = 0,
          geometrySimplification = 0,
          outputTier = 'runtime',
          mode = 'procedural-material',
          bakeMode = mode,
          sourceAssetFingerprint: requestedSourceAssetFingerprint = '',
          sourceNodeTransform = null,
          sourceLocalBounds = null,
          settings: requestedSettings = null,
          settingsFingerprint: requestedSettingsFingerprint = null,
          cacheKey: requestedCacheKey = '',
          levelId = '',
          nodeId = '',
          force = false,
        } = JSON.parse(body);

        if (!assetUrl) {
          sendJson(res, 400, { success: false, message: 'assetUrl is required' });
          return;
        }
        let normalizedBakeMode;
        try {
          normalizedBakeMode = bakeMode === 'procedural'
            ? 'procedural-material'
            : normalizeStyleBakeMode(bakeMode);
        } catch (modeError) {
          sendJson(res, 400, {
            success: false,
            message: modeError.message,
          });
          return;
        }

        if (normalizedBakeMode === 'blender-geometry') {
          sendJson(res, 400, {
            success: false,
            message:
              'Use /api/style/bake-blender for blender-geometry style bakes.',
          });
          return;
        }
        if (normalizedBakeMode === 'ai-texture-source') {
          sendJson(res, 400, {
            success: false,
            message:
              'AI texture source generation is optional art-source input and is not a deterministic procedural style bake backend.',
          });
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const settings = normalizeStyleBakeSettings({
          styleProfileName,
          prompt,
          textureSize,
          lineStrength,
          brushStrength,
          aoStrength,
          cavityStrength,
          curvatureStrength,
          geometrySimplification,
          outputTier,
          ...requestObject(requestedSettings),
        });
        const sourceAssetFingerprint = fingerprintFile(source.assetPath);
        assertRequestedFingerprintMatches(
          'Style source',
          requestedSourceAssetFingerprint,
          { algorithm: 'sha256', value: sourceAssetFingerprint },
        );
        const settingsFingerprint = getStyleBakeSettingsFingerprint(settings);
        assertRequestedFingerprintMatches(
          'Style settings',
          requestedSettingsFingerprint,
          settingsFingerprint,
        );
        const cacheKey = getStyleBakeCacheKey({
          sourceAssetFingerprint,
          settingsFingerprint,
          mode: normalizedBakeMode,
          generator: styleBakeProceduralGenerator,
        });
        assertRequestedCacheKeyMatches(requestedCacheKey, cacheKey);
        const cacheSlug = buildSafeAssetSlug(cacheKey, 80);
        const outputDirectory = path.join(GENERATED_STYLE_LAB_ROOT, 'baked-style', cacheSlug);
        ensureDirectory(outputDirectory);
        const outputFilePath = path.join(outputDirectory, `${cacheSlug}-style-baked.glb`);
        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        const cachedMetadata = readStyleBakeProductMetadata(metadataPath);
        const cachedProduct = cachedMetadata?.product ?? cachedMetadata?.styleBakeProduct ?? null;
        const cachedStatus = getStyleBakeProductStatus({
          product: cachedProduct,
          assetPath: outputFilePath,
          metadataPath,
          sourceAssetFingerprint,
          settingsFingerprint,
          cacheKey,
          generator: styleBakeProceduralGenerator,
        });

        if (!requestFlag(force) && cachedStatus === 'clean') {
          const outputStats = fs.statSync(outputFilePath);
          const inspectReport = await inspectGltfAsset(outputFilePath).catch((inspectError) => (
            `glTF inspection unavailable: ${inspectError.message}`
          ));
          const product = createStyleBakeProduct({
            assetUrl: toPublicAssetUrl(outputFilePath),
            metadataUrl: toPublicAssetUrl(metadataPath),
            sourceAssetUrl: assetUrl,
            sourceAssetPath: toRepoRelative(source.assetPath),
            sourceAssetFingerprint,
            nodeId,
            levelId,
            sourceNodeTransform,
            sourceLocalBounds,
            settings,
            generatedAt: cachedProduct.generatedAt || cachedMetadata?.createdAt || fs.statSync(metadataPath).mtime.toISOString(),
            cacheKey,
            settingsFingerprint,
            status: 'clean',
            mode: normalizedBakeMode,
            generator: styleBakeProceduralGenerator,
          });
          sendJson(res, 200, {
            success: true,
            cached: true,
            cacheStatus: 'clean',
            message: `Reused cached procedural style bake at ${toPublicAssetUrl(outputFilePath)}`,
            assetUrl: toPublicAssetUrl(outputFilePath),
            assetPath: toRepoRelative(outputFilePath),
            metadataUrl: toPublicAssetUrl(metadataPath),
            metadataPath: toRepoRelative(metadataPath),
            product,
            sizeBytes: outputStats.size,
            sizeFormatted: formatBytes(outputStats.size),
            inspectReport,
          });
          return;
        }

        await copyModelToGlb(source.assetPath, outputFilePath);
        const bakeResult = await runStyleBakeAsset([
          '--input',
          outputFilePath,
          '--output',
          outputFilePath,
          '--metadata-output',
          metadataPath,
          '--style-profile-name',
          String(settings.styleProfileName),
          '--prompt',
          String(settings.prompt),
          '--texture-size',
          String(settings.textureSize),
          '--line-strength',
          String(settings.lineStrength),
          '--brush-strength',
          String(settings.brushStrength),
          '--ao-strength',
          String(settings.aoStrength),
          '--cavity-strength',
          String(settings.cavityStrength),
          '--curvature-strength',
          String(settings.curvatureStrength),
          '--geometry-simplification',
          String(settings.geometrySimplification),
          '--output-tier',
          String(settings.outputTier),
          '--source-asset-url',
          String(assetUrl),
          '--asset-url',
          toPublicAssetUrl(outputFilePath),
          '--metadata-url',
          toPublicAssetUrl(metadataPath),
          '--level-id',
          String(levelId),
          '--node-id',
          String(nodeId),
        ]);

        if (bakeResult.code !== 0) {
          throw new Error(bakeResult.stderr || bakeResult.stdout || 'Procedural style bake failed.');
        }

        const prunedOutputFilePath = outputFilePath.replace(/\.glb$/i, '.pruned.glb');
        const pruneResult = await runGltfTransform([
          'prune',
          outputFilePath,
          prunedOutputFilePath,
        ]);
        if (pruneResult.code !== 0) {
          throw new Error(pruneResult.stderr || pruneResult.stdout || 'Procedural style bake prune failed.');
        }
        fs.copyFileSync(prunedOutputFilePath, outputFilePath);
        fs.unlinkSync(prunedOutputFilePath);

        const inspectReport = await inspectGltfAsset(outputFilePath).catch((inspectError) => (
          `glTF inspection unavailable: ${inspectError.message}`
        ));
        const outputStats = fs.statSync(outputFilePath);
        const bakeMetadata = fs.existsSync(metadataPath)
          ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
          : {};
        const generatedAt = new Date().toISOString();
        const product = createStyleBakeProduct({
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          sourceAssetFingerprint,
          nodeId,
          levelId,
          sourceNodeTransform,
          sourceLocalBounds,
          settings,
          generatedAt,
          cacheKey,
          settingsFingerprint,
          status: 'clean',
          mode: normalizedBakeMode,
          generator: styleBakeProceduralGenerator,
        });

        fs.writeFileSync(metadataPath, JSON.stringify({
          ...bakeMetadata,
          createdAt: generatedAt,
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          outputAssetUrl: toPublicAssetUrl(outputFilePath),
          outputAssetPath: toRepoRelative(outputFilePath),
          sourceAssetFingerprint: product.sourceAssetFingerprint,
          styleSettingsFingerprint: product.settingsFingerprint,
          styleProfileName: settings.styleProfileName,
          prompt: settings.prompt,
          textureSize: settings.textureSize,
          lineStrength: settings.lineStrength,
          brushStrength: settings.brushStrength,
          aoStrength: settings.aoStrength,
          cavityStrength: settings.cavityStrength,
          curvatureStrength: settings.curvatureStrength,
          geometrySimplification: settings.geometrySimplification,
          outputTier: settings.outputTier,
          generator: styleBakeProceduralGenerator.label,
          styleBakeProduct: product,
          product,
        }, null, 2));

        sendJson(res, 200, {
          success: true,
          cached: false,
          cacheStatus: cachedStatus,
          message: `Baked procedural style asset at ${toPublicAssetUrl(outputFilePath)}`,
          assetUrl: toPublicAssetUrl(outputFilePath),
          assetPath: toRepoRelative(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          metadataPath: toRepoRelative(metadataPath),
          product,
          sizeBytes: outputStats.size,
          sizeFormatted: formatBytes(outputStats.size),
          inspectReport,
        });
      } catch (error) {
        if (!error.statusCode || error.statusCode >= 500) {
          console.error('Procedural style bake error:', error);
        }
        sendJson(res, error.statusCode || 500, { success: false, message: `Procedural style bake failed: ${error.message}` });
      }
    });
    return;
  }

  if (pathname === '/api/style/bake-blender' && req.method === 'POST') {
    readRequestBody(req, async (body) => {
      try {
        const {
          createStyleBakeProduct,
          fingerprintFile,
          getStyleBakeCacheKey,
          getStyleBakeProductStatus,
          getStyleBakeSettingsFingerprint,
          normalizeStyleBakeSettings,
          readStyleBakeProductMetadata,
          styleBakeBlenderGeometryGenerator,
        } = await import('../lib/styleBakeProducts.mjs');
        const {
          assetUrl,
          mode = 'blender-geometry',
          bakeMode = mode,
          styleProfileName = 'Painterly Storybook',
          profileId = '',
          prompt = '',
          textureSize = 512,
          lineStrength = 0.35,
          brushStrength = 0.25,
          aoStrength = 0.8,
          cavityStrength = 0.65,
          curvatureStrength = 0.45,
          geometrySimplification = 0,
          outputTier = 'runtime',
          bevelCleanup = false,
          weightedNormalCleanup = true,
          lineGeometry = false,
          settings: requestedSettings = null,
          sourceAssetFingerprint: requestedSourceAssetFingerprint = '',
          sourceNodeTransform = null,
          sourceLocalBounds = null,
          settingsFingerprint: requestedSettingsFingerprint = null,
          cacheKey: requestedCacheKey = '',
          levelId = '',
          nodeId = '',
          force = false,
        } = JSON.parse(body);

        if (!assetUrl) {
          sendJson(res, 400, { success: false, message: 'assetUrl is required' });
          return;
        }
        if (bakeMode !== 'blender-geometry') {
          sendJson(res, 400, {
            success: false,
            message:
              'Use /api/style/bake-procedural for procedural-material style bakes.',
          });
          return;
        }

        const blenderExecutable = detectBlenderExecutable();
        if (!blenderExecutable) {
          sendJson(res, 503, {
            success: false,
            mode: 'blender-geometry',
            message: 'Blender executable not found. Install Blender or set BLENDER_PATH to enable blender-geometry style bakes.',
          });
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const settings = normalizeStyleBakeSettings({
          styleProfileName: profileId || styleProfileName,
          profileId: profileId || styleProfileName,
          prompt,
          textureSize,
          lineStrength,
          brushStrength,
          aoStrength,
          cavityStrength,
          curvatureStrength,
          geometrySimplification,
          outputTier,
          bevelCleanup,
          weightedNormalCleanup,
          lineGeometry,
          ...requestObject(requestedSettings),
        });
        const sourceAssetFingerprint = fingerprintFile(source.assetPath);
        assertRequestedFingerprintMatches(
          'Style source',
          requestedSourceAssetFingerprint,
          { algorithm: 'sha256', value: sourceAssetFingerprint },
        );
        const settingsFingerprint = getStyleBakeSettingsFingerprint(settings);
        assertRequestedFingerprintMatches(
          'Style settings',
          requestedSettingsFingerprint,
          settingsFingerprint,
        );
        const cacheKey = getStyleBakeCacheKey({
          sourceAssetFingerprint,
          mode: 'blender-geometry',
          settingsFingerprint,
          generator: styleBakeBlenderGeometryGenerator,
        });
        assertRequestedCacheKeyMatches(requestedCacheKey, cacheKey);
        const cacheSlug = buildSafeAssetSlug(cacheKey, 96);
        const outputDirectory = path.join(GENERATED_STYLE_LAB_ROOT, 'baked-style', 'blender-geometry', cacheSlug);
        ensureDirectory(outputDirectory);
        const outputFilePath = path.join(outputDirectory, `${cacheSlug}-blender-style.glb`);
        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        const cachedMetadata = readStyleBakeProductMetadata(metadataPath);
        const cachedProduct = cachedMetadata?.product ?? cachedMetadata?.styleBakeProduct ?? null;
        const cachedStatus = getStyleBakeProductStatus({
          product: cachedProduct,
          assetPath: outputFilePath,
          metadataPath,
          sourceAssetFingerprint,
          settingsFingerprint,
          cacheKey,
          generator: styleBakeBlenderGeometryGenerator,
        });

        if (!requestFlag(force) && cachedStatus === 'clean') {
          const outputStats = fs.statSync(outputFilePath);
          const inspectReport = await inspectGltfAsset(outputFilePath).catch((inspectError) => (
            `glTF inspection unavailable: ${inspectError.message}`
          ));
          const product = createStyleBakeProduct({
            mode: 'blender-geometry',
            assetUrl: toPublicAssetUrl(outputFilePath),
            metadataUrl: toPublicAssetUrl(metadataPath),
            sourceAssetUrl: assetUrl,
            sourceAssetFingerprint,
            nodeId,
            levelId,
            sourceNodeTransform,
            sourceLocalBounds,
            settings,
            generatedAt: cachedProduct.generatedAt || cachedMetadata?.createdAt || fs.statSync(metadataPath).mtime.toISOString(),
            cacheKey,
            settingsFingerprint,
            status: 'clean',
            generator: styleBakeBlenderGeometryGenerator,
          });
          sendJson(res, 200, {
            success: true,
            cached: true,
            cacheStatus: 'clean',
            mode: 'blender-geometry',
            message: `Reused cached Blender style bake at ${toPublicAssetUrl(outputFilePath)}`,
            assetUrl: toPublicAssetUrl(outputFilePath),
            assetPath: toRepoRelative(outputFilePath),
            metadataUrl: toPublicAssetUrl(metadataPath),
            metadataPath: toRepoRelative(metadataPath),
            blenderExecutable,
            product,
            sizeBytes: outputStats.size,
            sizeFormatted: formatBytes(outputStats.size),
            inspectReport,
          });
          return;
        }

        const blenderArgs = [
          '--input',
          source.assetPath,
          '--output',
          outputFilePath,
          '--metadata-output',
          metadataPath,
          '--profile-id',
          String(settings.profileId || settings.styleProfileName),
          '--texture-size',
          String(settings.textureSize),
          '--ao-strength',
          String(settings.aoStrength),
          '--cavity-strength',
          String(settings.cavityStrength),
          '--curvature-strength',
          String(settings.curvatureStrength),
          '--line-strength',
          String(settings.lineStrength),
          '--brush-strength',
          String(settings.brushStrength),
          '--geometry-simplification',
          String(settings.geometrySimplification),
          '--output-tier',
          String(settings.outputTier),
          '--source-asset-url',
          String(assetUrl),
          '--asset-url',
          toPublicAssetUrl(outputFilePath),
          '--metadata-url',
          toPublicAssetUrl(metadataPath),
          '--level-id',
          String(levelId),
          '--node-id',
          String(nodeId),
        ];
        if (requestFlag(bevelCleanup)) blenderArgs.push('--bevel-cleanup');
        if (requestFlag(weightedNormalCleanup)) {
          blenderArgs.push('--weighted-normal-cleanup');
        } else {
          blenderArgs.push('--no-weighted-normal-cleanup');
        }
        if (requestFlag(lineGeometry)) blenderArgs.push('--line-geometry');

        const bakeResult = await runBlenderStyleBakeAsset(blenderArgs);
        if (bakeResult.code !== 0) {
          const message = bakeResult.stderr || bakeResult.stdout || 'Blender geometry style bake failed.';
          throw new Error(message.trim());
        }

        const prunedOutputFilePath = outputFilePath.replace(/\.glb$/i, '.pruned.glb');
        const pruneResult = await runGltfTransform([
          'prune',
          outputFilePath,
          prunedOutputFilePath,
        ]);
        if (pruneResult.code !== 0) {
          throw new Error(pruneResult.stderr || pruneResult.stdout || 'Blender style bake prune failed.');
        }
        fs.copyFileSync(prunedOutputFilePath, outputFilePath);
        fs.unlinkSync(prunedOutputFilePath);

        const inspectReport = await inspectGltfAsset(outputFilePath).catch((inspectError) => (
          `glTF inspection unavailable: ${inspectError.message}`
        ));
        const outputStats = fs.statSync(outputFilePath);
        const bakeMetadata = fs.existsSync(metadataPath)
          ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
          : {};
        const generatedAt = new Date().toISOString();
        const product = createStyleBakeProduct({
          mode: 'blender-geometry',
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          sourceAssetUrl: assetUrl,
          sourceAssetFingerprint,
          nodeId,
          levelId,
          sourceNodeTransform,
          sourceLocalBounds,
          settings,
          generatedAt,
          cacheKey,
          settingsFingerprint,
          status: 'clean',
          generator: styleBakeBlenderGeometryGenerator,
        });

        fs.writeFileSync(metadataPath, JSON.stringify({
          ...bakeMetadata,
          createdAt: generatedAt,
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          outputAssetUrl: toPublicAssetUrl(outputFilePath),
          outputAssetPath: toRepoRelative(outputFilePath),
          sourceAssetFingerprint: product.sourceAssetFingerprint,
          styleSettingsFingerprint: product.settingsFingerprint,
          styleProfileName: settings.styleProfileName,
          profileId: settings.profileId,
          prompt: settings.prompt,
          textureSize: settings.textureSize,
          outputTier: settings.outputTier,
          blenderExecutable,
          generator: styleBakeBlenderGeometryGenerator.label,
          styleBakeProduct: product,
          product,
        }, null, 2));

        sendJson(res, 200, {
          success: true,
          cached: false,
          cacheStatus: cachedStatus,
          mode: 'blender-geometry',
          message: `Baked Blender geometry style asset at ${toPublicAssetUrl(outputFilePath)}`,
          assetUrl: toPublicAssetUrl(outputFilePath),
          assetPath: toRepoRelative(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          metadataPath: toRepoRelative(metadataPath),
          blenderExecutable,
          product,
          sizeBytes: outputStats.size,
          sizeFormatted: formatBytes(outputStats.size),
          inspectReport,
        });
      } catch (error) {
        if (!error.statusCode || error.statusCode >= 500) {
          console.error('Blender style bake error:', error);
        }
        sendJson(res, error.statusCode || 500, { success: false, message: `Blender style bake failed: ${error.message}` });
      }
    });
    return;
  }

  if (pathname === '/api/style/export-blender' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          exportName = '',
          referenceImageUrl = '',
          openInBlender = false,
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const source = resolveInspectableModelAsset(assetUrl);
        const inspection = detectReferenceImageForAsset(assetUrl);
        const exportDirectory = path.join(
          BLENDER_EXPORT_ROOT,
          `${slugify(exportName || source.assetName)}-${timestampKey()}`,
        );
        ensureDirectory(exportDirectory);

        const exportedGlbPath = path.join(exportDirectory, `${slugify(exportName || source.assetName)}.glb`);
        await copyModelToGlb(source.assetPath, exportedGlbPath);

        let resolvedReferenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl || '';
        let exportedReferencePath = '';
        if (resolvedReferenceUrl) {
          const referenceFullPath = resolvePublicAssetPath(resolvedReferenceUrl);
          const referenceTargetPath = path.join(exportDirectory, path.basename(referenceFullPath));
          fs.copyFileSync(referenceFullPath, referenceTargetPath);
          exportedReferencePath = referenceTargetPath;
        }

        const detectedBlenderExecutable = detectBlenderExecutable();
        const blenderLaunch = openInBlender
          ? launchBlenderFile(exportedGlbPath)
          : {
            blenderExecutable: detectedBlenderExecutable,
            openCommand: detectedBlenderExecutable ? `${detectedBlenderExecutable} "${exportedGlbPath}"` : '',
            openedInBlender: false,
          };
        const manifestPath = path.join(exportDirectory, 'merkin-blender-export.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(source.assetPath),
          exportedGlbPath,
          referenceImageUrl: resolvedReferenceUrl,
          referenceImagePath: exportedReferencePath,
          openCommand: blenderLaunch.openCommand,
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: blenderLaunch.openedInBlender
            ? 'Exported a Blender-ready GLB package and opened it in Blender.'
            : blenderLaunch.blenderExecutable
              ? 'Exported a Blender-ready GLB package and detected a Blender executable.'
              : 'Exported a Blender-ready GLB package.',
          exportDirectory,
          exportedGlbPath,
          referenceImagePath: exportedReferencePath,
          manifestPath,
          blenderExecutable: blenderLaunch.blenderExecutable,
          openCommand: blenderLaunch.openCommand,
          openedInBlender: blenderLaunch.openedInBlender,
        }));
      } catch (error) {
        console.error('Style Blender export error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Blender export failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/reimport-blender' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          sourceAssetUrl = '',
          exportPath = '',
          nodeName = '',
        } = JSON.parse(body);

        if (!sourceAssetUrl && !exportPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'sourceAssetUrl or exportPath is required' }));
          return;
        }

        let exportDirectory = exportPath ? resolveBlenderExportDirectory(exportPath) : '';
        let matchedExport = null;

        if (!exportDirectory) {
          matchedExport = findLatestBlenderExportForSource(sourceAssetUrl);
          if (!matchedExport) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'No Blender export package was found for this asset.' }));
            return;
          }
          exportDirectory = matchedExport.directory;
        }

        const latestModelPath = findLatestModelInDirectory(exportDirectory);
        if (!latestModelPath) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'No .glb or .gltf file was found in the Blender export directory.' }));
          return;
        }

        const assetBaseName = path.basename(latestModelPath, path.extname(latestModelPath));
        const assetSlug = buildSafeAssetSlug(nodeName || assetBaseName || 'blender-reimport');
        const outputDirectory = path.join(GENERATED_BLENDER_REIMPORT_ROOT, assetSlug);
        ensureDirectory(outputDirectory);

        const outputFilePath = path.join(outputDirectory, `${assetSlug}-blender-reimport-${timestampKey()}.glb`);
        await copyModelToGlb(latestModelPath, outputFilePath);

        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          sourceAssetUrl,
          exportDirectory,
          importedFrom: latestModelPath,
          manifestPath: matchedExport?.manifestPath || '',
          outputFilePath,
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Copied the latest Blender-edited model into generated assets.',
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataPath: toRepoRelative(metadataPath),
          exportedGlbPath: latestModelPath,
          exportDirectory,
        }));
      } catch (error) {
        console.error('Style Blender reimport error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Blender reimport failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/workspace' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          assetUrl,
          sourceName = '',
          styleProfileName = '',
          prompt = '',
          negativePrompt = '',
          loraNotes = '',
          controlNetNotes = '',
          referenceImageUrl = '',
          comfyUiApiUrl = `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`,
          comfyUiLowVramMode = false,
          hunyuanApiUrl = `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`,
          generateReferenceIfMissing = true,
        } = JSON.parse(body);

        if (!assetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
          return;
        }

        const inspection = detectReferenceImageForAsset(assetUrl);
        const workspaceDirectory = createGeneratedStyleDirectory(sourceName || inspection.assetName, 'workspace');
        const sourceDirectory = path.join(workspaceDirectory, 'source');
        const referenceDirectory = path.join(workspaceDirectory, 'reference');
        ensureDirectory(sourceDirectory);
        ensureDirectory(referenceDirectory);

        const sourceAssetPath = path.join(sourceDirectory, `${buildSafeAssetSlug(sourceName || inspection.assetName)}.glb`);
        await copyModelToGlb(inspection.assetPath, sourceAssetPath);

        let selectedReferenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl || '';
        let selectedReferencePath = selectedReferenceUrl ? resolvePublicAssetPath(selectedReferenceUrl) : '';
        let generatedReference = null;
        let referenceGenerationWarning = '';
        const lowVramMode = requestFlag(comfyUiLowVramMode);

        if (!selectedReferencePath && generateReferenceIfMissing && prompt.trim()) {
          const serverState = await getHunyuanBackendStatus(hunyuanApiUrl, comfyUiApiUrl, true, {
            lowVram: lowVramMode,
          }).catch(() => null);
          const comfyUiRoot = getComfyUiInstallRoot(serverState);
          if (comfyUiRoot) {
            try {
              generatedReference = await ensureComfyUiReferenceImage({
                apiUrl: comfyUiApiUrl,
                comfyUiRoot,
                sourceName: sourceName || inspection.assetName,
                prompt,
              });
              selectedReferenceUrl = generatedReference.publicUrl;
              selectedReferencePath = generatedReference.fullPath;
            } catch (error) {
              referenceGenerationWarning = error?.message || 'Reference image generation failed.';
            }
          }
        }

        let workspaceReferencePublicUrl = '';
        let workspaceReferencePath = '';
        if (selectedReferencePath) {
          workspaceReferencePath = path.join(
            referenceDirectory,
            path.basename(selectedReferencePath),
          );
          fs.copyFileSync(selectedReferencePath, workspaceReferencePath);
          workspaceReferencePublicUrl = toPublicAssetUrl(workspaceReferencePath);
        }

        const manifestPath = path.join(workspaceDirectory, 'style-request.json');
        fs.writeFileSync(manifestPath, JSON.stringify({
          createdAt: new Date().toISOString(),
          styleProfileName,
          sourceName: sourceName || inspection.assetName,
          sourceAssetUrl: assetUrl,
          sourceAssetPath: toRepoRelative(inspection.assetPath),
          packagedSourceAssetUrl: toPublicAssetUrl(sourceAssetPath),
          prompt,
          negativePrompt,
          loraNotes,
          controlNetNotes,
          comfyUiLowVramMode: lowVramMode,
          referenceGenerationWarning,
          referenceImageUrl: selectedReferenceUrl,
          workspaceReferenceImageUrl: workspaceReferencePublicUrl,
          generatedReferenceImageUrl: generatedReference?.publicUrl || '',
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: workspaceReferencePublicUrl
            ? 'Created a style workspace with a bundled source mesh and reference image.'
            : 'Created a style workspace with a bundled source mesh.',
          workspaceDirectory: toRepoRelative(workspaceDirectory),
          sourceAssetUrl: toPublicAssetUrl(sourceAssetPath),
          sourceAssetPath: toRepoRelative(sourceAssetPath),
          referenceImageUrl: workspaceReferencePublicUrl,
          referenceGenerationWarning,
          manifestUrl: toPublicAssetUrl(manifestPath),
          manifestPath: toRepoRelative(manifestPath),
          generatedReferenceImageUrl: generatedReference?.publicUrl || '',
        }));
      } catch (error) {
        console.error('Style workspace error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Style workspace failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/style/workspace/latest' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;
      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const latestWorkspace = findLatestStyleWorkspaceForAsset(assetUrl);
      if (!latestWorkspace) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workspace: null }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        workspace: {
          directory: toRepoRelative(latestWorkspace.directory),
          manifestPath: toRepoRelative(latestWorkspace.manifestPath),
          manifestUrl: toPublicAssetUrl(latestWorkspace.manifestPath),
          sourceAssetUrl: latestWorkspace.manifest?.packagedSourceAssetUrl || '',
          referenceImageUrl: latestWorkspace.manifest?.workspaceReferenceImageUrl || latestWorkspace.manifest?.referenceImageUrl || '',
          generatedReferenceImageUrl: latestWorkspace.manifest?.generatedReferenceImageUrl || '',
          styleProfileName: latestWorkspace.manifest?.styleProfileName || '',
          prompt: latestWorkspace.manifest?.prompt || '',
          negativePrompt: latestWorkspace.manifest?.negativePrompt || '',
          loraNotes: latestWorkspace.manifest?.loraNotes || '',
          controlNetNotes: latestWorkspace.manifest?.controlNetNotes || '',
          createdAt: latestWorkspace.manifest?.createdAt || '',
        },
      }));
    } catch (error) {
      console.error('Latest style workspace lookup error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Workspace lookup failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/style/source-asset' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          fileName = '',
          glbBase64 = '',
          sourceName = '',
          sourceKind = 'primitive',
          descriptor = '',
          levelId = '',
          nodeId = '',
        } = JSON.parse(body);

        if (!glbBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'glbBase64 is required' }));
          return;
        }

        const outputDirectory = createGeneratedStyleDirectory(sourceName || fileName || 'scene-source', 'sources');
        const baseName = buildSafeAssetSlug(path.basename(fileName || sourceName || 'scene-source', path.extname(fileName || '')));
        const outputFilePath = path.join(outputDirectory, `${baseName || 'scene-source'}.glb`);
        const metadataPath = outputFilePath.replace(/\.glb$/i, '.json');
        const outputBuffer = Buffer.from(glbBase64, 'base64');

        if (outputBuffer.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'The staged source mesh was empty.' }));
          return;
        }

        fs.writeFileSync(outputFilePath, outputBuffer);
        fs.writeFileSync(
          metadataPath,
          JSON.stringify({
            createdAt: new Date().toISOString(),
            sourceName,
            sourceKind,
            descriptor,
            levelId,
            nodeId,
          }, null, 2),
          'utf8',
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Staged an exportable scene source mesh for style baking.',
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(metadataPath),
          assetPath: toRepoRelative(outputFilePath),
          metadataPath: toRepoRelative(metadataPath),
        }));
      } catch (error) {
        console.error('Style source asset staging error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Source asset staging failed: ${error.message}` }));
      }
    });
    return;
  }


  return false;
}

module.exports = {
  handleStyleRoutes,
};
