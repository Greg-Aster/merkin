import { defineLevelPackage } from "../levelPackageData.js";
import data from "./data.json";
import performance from "./performance.json";
import skybox from "./skybox.json";

export const portalArenaLevelPackage = defineLevelPackage(
	data,
	skybox,
	{},
	{},
	performance,
);
