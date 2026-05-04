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

async function handleStyleRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route;
  const {
    BLENDER_EXPORT_ROOT,
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GENERATED_BLENDER_REIMPORT_ROOT,
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
    runGltfTransform,
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

        if (!selectedReferencePath && generateReferenceIfMissing && prompt.trim()) {
          const serverState = await getHunyuanBackendStatus(hunyuanApiUrl, comfyUiApiUrl, true).catch(() => null);
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
