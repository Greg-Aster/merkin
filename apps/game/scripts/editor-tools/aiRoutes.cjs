const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

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

function queryFlag(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprintObject(value) {
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(stableJson(value)).digest('hex'),
  };
}

function fingerprintFile(filePath) {
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }
  return {
    algorithm: 'sha256',
    value: createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
  };
}

async function handleAiRoutes(req, res, route, context) {
  const { pathname, parsedUrl } = route;
  const {
    DEFAULT_COMFYUI_PORT,
    DEFAULT_HUNYUAN_PORT,
    GENERATED_HUNYUAN_ROOT,
    buildComfyUiGenerateWorkflow,
    buildComfyUiGenerateWorkflowFromTemplate,
    buildComfyUiTextureWorkflow,
    buildComfyUiTextureWorkflowFromTemplate,
    buildEditableComfyUiWorkflowTemplate,
    buildSafeAssetSlug,
    cancelHunyuanJobs,
    centerModelForSceneReplacement,
    copyFileToComfyUiInput,
    createHunyuanJob,
    detectReferenceImageForAsset,
    ensureComfyUiReferenceImage,
    ensureComfyUiServer,
    ensureDirectory,
    fileToBase64,
    findComfyUiGeneratedMesh,
    getComfyUiHealth,
    getComfyUiInstallRoot,
    getHunyuanBackendStatus,
    getHunyuanJob,
    listRecentHunyuanJobs,
    processHunyuanJobQueue,
    queueComfyUiPrompt,
    resolvePublicAssetPath,
    serializeHunyuanJob,
    toPublicAssetUrl,
    waitForComfyUiPrompt,
  } = context;

  if (pathname === '/api/hunyuan3d/inspect' && req.method === 'GET') {
    try {
      const assetUrl = parsedUrl.query.assetUrl;

      if (!assetUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'assetUrl is required' }));
        return;
      }

      const inspection = detectReferenceImageForAsset(assetUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, inspection }));
    } catch (error) {
      console.error('Hunyuan inspect error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Inspect failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/hunyuan3d/status' && req.method === 'GET') {
    try {
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`;
      const comfyUiApiUrl = parsedUrl.query.comfyUiApiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const ensure = parsedUrl.query.ensure === '1';
      const lowVram =
        queryFlag(parsedUrl.query.lowVram) || queryFlag(parsedUrl.query.comfyUiLowVramMode);
      const status = await getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, ensure, { lowVram });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (error) {
      console.error('Hunyuan status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/comfyui/status' && req.method === 'GET') {
    try {
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const ensure = parsedUrl.query.ensure === '1';
      const lowVram =
        queryFlag(parsedUrl.query.lowVram) || queryFlag(parsedUrl.query.comfyUiLowVramMode);
      const status = ensure
        ? await ensureComfyUiServer(apiUrl, { lowVram })
        : await getComfyUiHealth(apiUrl);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status }));
    } catch (error) {
      console.error('ComfyUI status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/comfyui/workflow-template' && req.method === 'GET') {
    try {
      const mode = parsedUrl.query.mode || 'generate';
      const apiUrl = parsedUrl.query.apiUrl || `http://127.0.0.1:${DEFAULT_HUNYUAN_PORT}`;
      const comfyUiApiUrl = parsedUrl.query.comfyUiApiUrl || `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`;
      const assetUrl = parsedUrl.query.assetUrl || '';
      const sourceName = parsedUrl.query.sourceName || '';
      const referenceImageUrl = parsedUrl.query.referenceImageUrl || '';
      const workflowPath = parsedUrl.query.workflowPath || '';

      const result = await buildEditableComfyUiWorkflowTemplate({
        mode,
        apiUrl,
        comfyUiApiUrl,
        assetUrl,
        sourceName,
        referenceImageUrl,
        workflowPath,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (error) {
      console.error('ComfyUI workflow template error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Workflow template failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs' && req.method === 'GET') {
    try {
      const jobId = parsedUrl.query.jobId;
      if (!jobId) {
        const limit = parsedUrl.query.limit;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jobs: listRecentHunyuanJobs(limit) }));
        return;
      }

      const job = getHunyuanJob(jobId);
      if (!job) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Hunyuan job not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, job: serializeHunyuanJob(job) }));
    } catch (error) {
      console.error('Hunyuan job status error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: `Job status failed: ${error.message}` }));
    }
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const job = createHunyuanJob(payload);
        void processHunyuanJobQueue();

        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          job: serializeHunyuanJob(job),
          message: 'Hunyuan job queued.',
        }));
      } catch (error) {
        console.error('Hunyuan job queue error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Job queue failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/jobs/cancel' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const cancelledJobIds = await cancelHunyuanJobs({
          jobId: payload.jobId || '',
          all: payload.all === true,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          cancelledJobIds,
          message: cancelledJobIds.length > 0
            ? `Cancelled ${cancelledJobIds.length} AI job${cancelledJobIds.length === 1 ? '' : 's'}.`
            : 'No matching AI jobs were active or queued.',
        }));
      } catch (error) {
        console.error('Hunyuan job cancel error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Job cancel failed: ${error.message}` }));
      }
    });
    return;
  }

  if (pathname === '/api/hunyuan3d/run' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const {
          apiUrl = 'http://127.0.0.1:8080',
          comfyUiApiUrl = `http://127.0.0.1:${DEFAULT_COMFYUI_PORT}`,
          assetUrl,
          sourceName = '',
          mode = 'texture',
          prompt = '',
          referenceImageUrl = '',
          workflowPath = '',
          comfyUiLowVramMode = false,
          lowVram = false,
          faceCount,
        } = JSON.parse(body);

        if (!assetUrl && mode === 'texture') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'assetUrl is required for texture wrapping' }));
          return;
        }

        const inspection = assetUrl
          ? detectReferenceImageForAsset(assetUrl)
          : {
              assetUrl: '',
              assetPath: null,
              assetName: sourceName || 'generated-object',
              assetType: 'prompt',
              detectedReferenceImageUrl: '',
              message: 'Generating a fresh mesh from prompt or manually supplied reference.',
              supportsTextureWrap: false,
              supportsReplacementGeneration: true,
            };
        const lowVramMode = queryFlag(comfyUiLowVramMode) || queryFlag(lowVram);
        let referenceUrl = referenceImageUrl || inspection.detectedReferenceImageUrl;
        let referencePath = referenceUrl ? resolvePublicAssetPath(referenceUrl) : '';
        const sourceAssetFingerprint = inspection.assetPath
          ? fingerprintFile(inspection.assetPath)
          : null;
        const serverState = await getHunyuanBackendStatus(apiUrl, comfyUiApiUrl, true, {
          lowVram: lowVramMode,
        });
        if (!serverState.available) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: serverState.message,
            status: serverState,
          }));
          return;
        }

        if (mode === 'texture' && !inspection.supportsTextureWrap) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Texture wrapping currently supports only .gltf and .glb asset nodes.',
          }));
          return;
        }

        if (mode === 'generate' && !inspection.supportsReplacementGeneration) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Replacement mesh generation currently supports .gltf, .glb, image-backed asset nodes, and prompt-driven prefab generation.',
          }));
          return;
        }

        if (serverState.backend === 'comfyui') {
          if (mode === 'generate' && !serverState.supportsReplacementGeneration) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `${serverState.message} Mesh generation is unavailable until the Hunyuan shape checkpoint is installed.`,
              status: serverState,
            }));
            return;
          }

          if (mode === 'texture' && !serverState.supportsTextureWrap) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: `${serverState.message} Texture wrapping is not available until a Hunyuan paint model is installed for ComfyUI.`,
              status: serverState,
            }));
            return;
          }

          if (!referencePath) {
            try {
              const comfyUiRoot = getComfyUiInstallRoot(serverState);
              if (!comfyUiRoot) {
                throw new Error('ComfyUI install root could not be resolved for reference image generation.');
              }

              const generatedReference = await ensureComfyUiReferenceImage({
                apiUrl: serverState.apiUrl,
                comfyUiRoot,
                sourceName: inspection.assetName || sourceName || 'generated-object',
                prompt: prompt.trim() || inspection.assetName || sourceName || '',
              });

              referenceUrl = generatedReference.publicUrl;
              referencePath = generatedReference.fullPath;
            } catch (referenceError) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                message: `${mode === 'texture' ? 'Texture wrapping' : 'Mesh generation'} needs a reference image, and automatic reference generation failed: ${referenceError.message}`,
                status: serverState,
              }));
              return;
            }
          }

          if (mode === 'texture' && (!inspection.assetPath || path.extname(inspection.assetPath).toLowerCase() !== '.glb')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'The current ComfyUI texture workflow only supports .glb assets. Convert or import the asset as GLB first.',
              status: serverState,
            }));
            return;
          }

          const comfyUiRoot = getComfyUiInstallRoot(serverState);
          if (!comfyUiRoot) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'ComfyUI is online, but the local install root could not be resolved.',
              status: serverState,
            }));
            return;
          }

          const chosenPaintModel = mode === 'texture'
            ? (serverState.capabilities?.paintModelCandidates?.find((entry) => /turbo/i.test(entry))
              || serverState.capabilities?.paintModelCandidates?.[0])
            : null;
          const chosenShapeModel = mode === 'generate'
            ? (serverState.capabilities?.shapeModelCandidates?.find((entry) => /\.ckpt$/i.test(entry))
              || serverState.capabilities?.shapeModelCandidates?.find((entry) => /^hunyuan3d-dit/i.test(entry))
              || serverState.capabilities?.shapeModelCandidates?.[0])
            : null;

          if (mode === 'texture' && !chosenPaintModel) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'No Hunyuan paint model was found in ComfyUI/models/diffusers.',
              status: serverState,
            }));
            return;
          }
          if (mode === 'generate' && !chosenShapeModel) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'No Hunyuan shape model was found in ComfyUI/models/diffusion_models.',
              status: serverState,
            }));
            return;
          }

          const stagedReference = copyFileToComfyUiInput(referencePath, comfyUiRoot, inspection.assetName || sourceName || 'reference');
          const outputPrefix = `mesh/merkin/${buildSafeAssetSlug(inspection.assetName || sourceName || 'asset')}-${Date.now()}`;
          const rawOutputPrefix = `${outputPrefix}-raw`;
          const workflowSeed = Number(BigInt(Date.now()) % BigInt(0xffffffffffffffff));
          const comfyPrompt = mode === 'texture'
            ? (buildComfyUiTextureWorkflowFromTemplate({
                meshPath: inspection.assetPath,
                referenceImageFileName: stagedReference.fileName,
                outputPrefix,
                paintModelCandidates: serverState.capabilities?.paintModelCandidates ?? [],
                seed: workflowSeed,
                workflowPath,
              }) ?? buildComfyUiTextureWorkflow({
                meshPath: inspection.assetPath,
                referenceImageFileName: stagedReference.fileName,
                paintModel: chosenPaintModel,
                outputPrefix,
                seed: workflowSeed,
              }))
            : (buildComfyUiGenerateWorkflowFromTemplate({
                referenceImageFileName: stagedReference.fileName,
                outputPrefix,
                rawOutputPrefix,
                shapeModelCandidates: serverState.capabilities?.shapeModelCandidates ?? [],
                paintModelCandidates: serverState.capabilities?.paintModelCandidates ?? [],
                seed: workflowSeed,
                workflowPath,
              }) ?? buildComfyUiGenerateWorkflow({
                referenceImageFileName: stagedReference.fileName,
                shapeModel: chosenShapeModel,
                outputPrefix,
              }));

          const promptId = await queueComfyUiPrompt(serverState.apiUrl, comfyPrompt);
          await waitForComfyUiPrompt(serverState.apiUrl, promptId);

          const generatedMeshPath = findComfyUiGeneratedMesh(comfyUiRoot, outputPrefix, '.glb');
          if (!generatedMeshPath || !fs.existsSync(generatedMeshPath)) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              message: 'ComfyUI finished, but the expected textured GLB could not be found in the output directory.',
              status: serverState,
            }));
            return;
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const assetSlug = buildSafeAssetSlug(inspection.assetName || sourceName || 'asset');
          const outputDirectory = path.join(GENERATED_HUNYUAN_ROOT, assetSlug);
          const outputFileName = mode === 'texture'
            ? `${assetSlug}-texture-wrap-${timestamp}.glb`
            : `${assetSlug}-generated-${timestamp}.glb`;
          const outputFilePath = path.join(outputDirectory, outputFileName);
          const outputMetadataPath = outputFilePath.replace(/\.glb$/i, '.json');

          ensureDirectory(outputDirectory);
          fs.copyFileSync(generatedMeshPath, outputFilePath);
          await centerModelForSceneReplacement(outputFilePath, 'center').catch((error) => {
            console.warn('Generated ComfyUI mesh centering failed:', error);
          });
          fs.writeFileSync(
            outputMetadataPath,
            JSON.stringify(
              {
                sourceAssetUrl: assetUrl,
                sourceAssetFingerprint,
                sourceName: sourceName || inspection.assetName,
                sourceReferenceImageUrl: referenceUrl || null,
                backend: 'comfyui',
                apiUrl: serverState.apiUrl,
                comfyUiRoot,
                comfyUiLowVramMode: lowVramMode,
                promptId,
                prompt: prompt.trim() || null,
                mode,
                shapeModel: chosenShapeModel,
                paintModel: chosenPaintModel,
                styleSettingsFingerprint: fingerprintObject({
                  backend: 'comfyui',
                  mode,
                  prompt: prompt.trim() || null,
                  referenceImageUrl: referenceUrl || null,
                  shapeModel: chosenShapeModel,
                  paintModel: chosenPaintModel,
                }),
                generatedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
            'utf8',
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            assetUrl: toPublicAssetUrl(outputFilePath),
            metadataUrl: toPublicAssetUrl(outputMetadataPath),
            mode,
            referenceImageUrl: referenceUrl || null,
            status: serverState,
            message: mode === 'texture'
              ? 'Generated a textured GLB through the local ComfyUI Hunyuan workflow.'
              : 'Generated a new GLB through the local ComfyUI Hunyuan workflow.',
          }));
          return;
        }

        if (serverState.backend !== 'hunyuan-api') {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: serverState.message,
            status: serverState,
          }));
          return;
        }

        const resolvedApiUrl = String(serverState.apiUrl).replace(/\/+$/, '');

        if (!referencePath && !prompt.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'A reference image is required. Text-only generation depends on your local Hunyuan server configuration.',
          }));
          return;
        }

        const payload = {
          texture: true,
        };

        if (referencePath) {
          payload.image = fileToBase64(referencePath);
        }

        if (!referencePath && prompt.trim()) {
          payload.text = prompt.trim();
        }

        if (mode === 'texture') {
          payload.mesh = fileToBase64(inspection.assetPath);
        }

        if (Number.isFinite(Number(faceCount)) && Number(faceCount) > 0) {
          payload.face_count = Number(faceCount);
        }

        const hunyuanResponse = await fetch(`${resolvedApiUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!hunyuanResponse.ok) {
          const errorText = await hunyuanResponse.text();
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: `Hunyuan server error (${hunyuanResponse.status}): ${errorText}`,
          }));
          return;
        }

        const outputBuffer = Buffer.from(await hunyuanResponse.arrayBuffer());
        if (outputBuffer.length === 0) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            message: 'Hunyuan server returned an empty mesh file.',
          }));
          return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const assetSlug = buildSafeAssetSlug(inspection.assetName);
        const modeSlug = mode === 'texture' ? 'texture-wrap' : 'replacement-mesh';
        const outputDirectory = path.join(GENERATED_HUNYUAN_ROOT, assetSlug);
        const outputFileName = `${assetSlug}-${modeSlug}-${timestamp}.glb`;
        const outputFilePath = path.join(outputDirectory, outputFileName);
        const outputMetadataPath = outputFilePath.replace(/\.glb$/i, '.json');

        ensureDirectory(outputDirectory);
        fs.writeFileSync(outputFilePath, outputBuffer);
        await centerModelForSceneReplacement(outputFilePath, 'center').catch((error) => {
          console.warn('Generated Hunyuan API mesh centering failed:', error);
        });
        fs.writeFileSync(
          outputMetadataPath,
          JSON.stringify(
            {
              sourceAssetUrl: assetUrl,
              sourceAssetFingerprint,
              sourceName: sourceName || inspection.assetName,
              sourceReferenceImageUrl: referenceUrl || null,
              apiUrl: resolvedApiUrl,
              autoStartedServer: serverState.autoStarted,
              comfyUiLowVramMode: lowVramMode,
              prompt: prompt.trim() || null,
              mode,
              styleSettingsFingerprint: fingerprintObject({
                backend: 'hunyuan-api',
                mode,
                prompt: prompt.trim() || null,
                referenceImageUrl: referenceUrl || null,
                apiUrl: resolvedApiUrl,
              }),
              generatedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
          'utf8',
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          assetUrl: toPublicAssetUrl(outputFilePath),
          metadataUrl: toPublicAssetUrl(outputMetadataPath),
          mode,
          referenceImageUrl: referenceUrl || null,
          status: serverState,
          message:
            mode === 'texture'
              ? 'Generated a textured replacement mesh from the selected asset.'
              : 'Generated a new textured mesh from the selected asset reference.',
        }));
      } catch (error) {
        console.error('Hunyuan run error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: `Hunyuan run failed: ${error.message}` }));
      }
    });
    return;
  }


  return false;
}

module.exports = {
  handleAiRoutes,
};
