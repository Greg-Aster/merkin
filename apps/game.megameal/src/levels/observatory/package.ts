import fireflyArchetype from "../global/npcs/firefly/archetype.json";
import { defineLevelPackage } from "../levelPackageData.js";
import data from "./data.json";
import fireflies from "./npcs/fireflies.json";
import skybox from "./skybox.json";

export const observatoryLevelPackage = defineLevelPackage(data, skybox, {
	archetypes: [fireflyArchetype],
	groups: [fireflies],
});
