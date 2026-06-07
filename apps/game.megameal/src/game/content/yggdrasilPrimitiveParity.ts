// Target-owned primitive parity data migrated from the old Yggdrasil backup.
// Source evidence is tracked in docs/YGGDRASIL_MIGRATION_PROVENANCE.md.
// The generated JSON stores world-space primitive data; do not import or load the old editor scene at runtime.

import {
	type PrimitiveSceneContentOptions,
	createPrimitiveSceneContentIds,
	validatePrimitiveSceneContentData,
} from "./primitiveSceneContent.js";
import yggdrasilPrimitiveParityData from "./yggdrasilPrimitiveParity.generated.json";

const yggdrasilPrimitiveParity = validatePrimitiveSceneContentData(
	yggdrasilPrimitiveParityData,
	"Yggdrasil primitive parity",
);

export const yggdrasilPrimitiveParitySource = yggdrasilPrimitiveParity.source;
export const yggdrasilPrimitiveNodes = yggdrasilPrimitiveParity.nodes;
export const yggdrasilPrimitiveCollisionSourceIds =
	yggdrasilPrimitiveParity.collisionSourceIds;
export const yggdrasilPrimitiveWalkableSourceIds =
	yggdrasilPrimitiveParity.walkableSourceIds;

export const yggdrasilPrimitiveContentIds = createPrimitiveSceneContentIds({
	meshPrefix: "mesh_yggdrasil_primitive",
	materialPrefix: "material_yggdrasil_primitive",
	prefabPrefix: "yggdrasil_primitive",
	stablePrefix: "yggdrasil:primitive",
	stripSourcePrefix: "yggdrasil-",
});

export const yggdrasilPrimitiveContentOptions = {
	tag: "yggdrasil",
	ids: yggdrasilPrimitiveContentIds,
	walkableSourceIds: yggdrasilPrimitiveWalkableSourceIds,
} as const satisfies PrimitiveSceneContentOptions;
