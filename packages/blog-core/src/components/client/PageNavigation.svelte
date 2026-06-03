<script lang="ts">
import { onDestroy, onMount } from "svelte";

type NavigationOptions = {
	pushState?: boolean;
	restoreHash?: boolean;
};

const containerSelectors = ["#banner-container", "#main-grid"];
const htmlCache = new Map<string, string>();
const managedHeadSelector = [
	'meta[name="description"]',
	'meta[name="author"]',
	'meta[property^="og:"]',
	'meta[property^="article:"]',
	'meta[name^="twitter:"]',
	'link[rel="canonical"]',
	'link[rel="alternate"]',
	'link[rel="icon"]',
].join(",");
const styleResourceSelector = ['link[rel~="stylesheet"][href]', "style"].join(
	",",
);

let abortController: AbortController | null = null;
let cleanupNavigation: (() => void) | null = null;
let preloadController: AbortController | null = null;

function isPlainLeftClick(event: MouseEvent) {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}

function getNavigableUrl(anchor: HTMLAnchorElement) {
	if (anchor.target && anchor.target !== "_self") return false;
	if (anchor.hasAttribute("download")) return false;
	if (anchor.dataset.navigation === "reload") return false;
	if (anchor.dataset.navigation === "off") return false;

	const nextUrl = new URL(anchor.href, window.location.href);
	if (nextUrl.origin !== window.location.origin) return false;

	const isSameDocument =
		nextUrl.pathname === window.location.pathname &&
		nextUrl.search === window.location.search;
	if (isSameDocument) return false;

	return !/\.(?:7z|avi|css|csv|docx?|gif|glb|gltf|gz|ico|jpe?g|json|m4a|mov|mp3|mp4|ogg|pdf|png|rar|rss|svg|tar|txt|wav|webm|webp|xml|zip)$/i.test(
		nextUrl.pathname,
	)
		? nextUrl
		: false;
}

function shouldHandleLink(anchor: HTMLAnchorElement, event: MouseEvent) {
	if (event.defaultPrevented || !isPlainLeftClick(event)) return false;
	return Boolean(getNavigableUrl(anchor));
}

function dispatchPageEvent(name: string, detail: Record<string, unknown>) {
	document.dispatchEvent(new CustomEvent(name, { detail }));
}

function isStylesheetLink(element: Element): element is HTMLLinkElement {
	return (
		element.tagName.toLowerCase() === "link" &&
		element
			.getAttribute("rel")
			?.toLowerCase()
			.split(/\s+/)
			.includes("stylesheet") === true &&
		element.hasAttribute("href")
	);
}

function isStyleElement(element: Element): element is HTMLStyleElement {
	return element.tagName.toLowerCase() === "style";
}

function getStyleResourceKey(element: Element, baseUrl: string) {
	if (isStylesheetLink(element)) {
		const href = element.getAttribute("href");
		if (!href) return "";

		return [
			"link",
			new URL(href, baseUrl).href,
			element.getAttribute("media") ?? "",
			element.getAttribute("integrity") ?? "",
			element.getAttribute("crossorigin") ?? "",
		].join("::");
	}

	if (isStyleElement(element)) {
		return [
			"style",
			element.getAttribute("media") ?? "",
			element.getAttribute("data-astro-id") ?? "",
			element.getAttribute("data-vite-dev-id") ?? "",
			element.textContent ?? "",
		].join("::");
	}

	return "";
}

function collectStyleResources(root: ParentNode, baseUrl: string) {
	return Array.from(root.querySelectorAll(styleResourceSelector))
		.map((element) => ({
			element,
			key: getStyleResourceKey(element, baseUrl),
		}))
		.filter((resource) => resource.key);
}

function waitForStylesheetLoad(link: HTMLLinkElement, signal?: AbortSignal) {
	return new Promise<void>((resolve, reject) => {
		if (signal?.aborted) {
			reject(new DOMException("Navigation aborted", "AbortError"));
			return;
		}

		let settled = false;
		const cleanup = () => {
			window.clearTimeout(timeout);
			link.removeEventListener("load", finish);
			link.removeEventListener("error", fail);
			signal?.removeEventListener("abort", abort);
		};
		const settle = (callback: () => void) => {
			if (settled) return;
			settled = true;
			cleanup();
			callback();
		};
		const finish = () => settle(resolve);
		const fail = () =>
			settle(() =>
				reject(new Error(`Unable to load stylesheet: ${link.href}`)),
			);
		const abort = () =>
			settle(() =>
				reject(new DOMException("Navigation aborted", "AbortError")),
			);
		const timeout = window.setTimeout(finish, 5000);

		link.addEventListener("load", finish);
		link.addEventListener("error", fail);
		signal?.addEventListener("abort", abort);
	});
}

async function prepareStyleResources(
	nextDocument: Document,
	pageUrl: string,
	signal?: AbortSignal,
) {
	const currentResources = collectStyleResources(
		document.head,
		window.location.href,
	);
	const nextResources = collectStyleResources(nextDocument.head, pageUrl);
	const currentKeys = new Set(currentResources.map(({ key }) => key));
	const nextKeys = new Set(nextResources.map(({ key }) => key));
	const staleElements = currentResources
		.filter(({ key }) => !nextKeys.has(key))
		.map(({ element }) => element);
	const addedElements: Element[] = [];
	const loadPromises: Array<Promise<void>> = [];

	for (const { element, key } of nextResources) {
		if (currentKeys.has(key)) continue;

		const importedElement = document.importNode(element, true);
		addedElements.push(importedElement);

		if (isStylesheetLink(importedElement)) {
			const href = importedElement.getAttribute("href");
			if (href) importedElement.href = new URL(href, pageUrl).href;
			loadPromises.push(waitForStylesheetLoad(importedElement, signal));
		}

		document.head.appendChild(importedElement);
	}

	try {
		await Promise.all(loadPromises);
	} catch (error) {
		for (const element of addedElements) {
			element.remove();
		}
		throw error;
	}

	return () => {
		for (const element of staleElements) {
			element.remove();
		}
	};
}

function updateManagedHead(nextDocument: Document) {
	document.title = nextDocument.title;

	for (const element of document.querySelectorAll(managedHeadSelector)) {
		element.remove();
	}

	for (const element of nextDocument.querySelectorAll(managedHeadSelector)) {
		document.head.appendChild(document.importNode(element, true));
	}
}

function executeInsertedScripts(root: ParentNode) {
	for (const originalScript of root.querySelectorAll("script")) {
		const script = document.createElement("script");

		for (const attribute of Array.from(originalScript.attributes)) {
			script.setAttribute(attribute.name, attribute.value);
		}

		script.textContent = originalScript.textContent;
		originalScript.replaceWith(script);
	}
}

function focusMainContent() {
	const target =
		document.getElementById("main-content-wrapper") ??
		document.getElementById("main");
	if (!(target instanceof HTMLElement)) return;

	const originalTabIndex = target.getAttribute("tabindex");
	target.setAttribute("tabindex", "-1");
	target.focus({ preventScroll: true });

	if (originalTabIndex === null) {
		window.setTimeout(() => target.removeAttribute("tabindex"), 0);
	} else {
		target.setAttribute("tabindex", originalTabIndex);
	}
}

async function fetchHtml(url: URL, signal?: AbortSignal) {
	const cachedHtml = htmlCache.get(url.href);
	if (cachedHtml) return cachedHtml;

	const response = await fetch(url.href, {
		credentials: "same-origin",
		headers: { Accept: "text/html" },
		signal,
	});

	const contentType = response.headers.get("content-type") ?? "";
	if (!response.ok || !contentType.includes("text/html")) return null;

	const html = await response.text();
	htmlCache.set(url.href, html);
	return html;
}

function swapContainers(nextDocument: Document) {
	const replacements: Array<{
		currentElement: Element;
		nextElement: Element;
	}> = [];

	for (const selector of containerSelectors) {
		const currentElement = document.querySelector(selector);
		const nextElement = nextDocument.querySelector(selector);
		if (!currentElement || !nextElement) return false;
		replacements.push({ currentElement, nextElement });
	}

	dispatchPageEvent("astro:before-swap", {
		newDocument: nextDocument,
		selectors: containerSelectors,
	});

	for (const { currentElement, nextElement } of replacements) {
		const importedElement = document.importNode(nextElement, true);
		currentElement.replaceWith(importedElement);
		executeInsertedScripts(importedElement);
	}

	return true;
}

function syncScroll(url: URL, restoreHash = true) {
	if (restoreHash && url.hash) {
		const target = document.getElementById(
			decodeURIComponent(url.hash.slice(1)),
		);
		if (target) {
			target.scrollIntoView();
			return;
		}
	}

	window.scrollTo(0, 0);
}

async function navigate(url: URL, options: NavigationOptions = {}) {
	abortController?.abort();
	abortController = new AbortController();

	dispatchPageEvent("merkin:navigation-start", { url: url.href });
	document.documentElement.dataset.navigation = "loading";

	try {
		const html = await fetchHtml(url, abortController.signal);
		if (!html) {
			window.location.href = url.href;
			return;
		}

		const nextDocument = new DOMParser().parseFromString(html, "text/html");
		const finishStyleTransition = await prepareStyleResources(
			nextDocument,
			url.href,
			abortController.signal,
		);

		if (!swapContainers(nextDocument)) {
			window.location.href = url.href;
			return;
		}

		updateManagedHead(nextDocument);
		finishStyleTransition();

		if (options.pushState !== false) {
			history.pushState({ merkinNavigation: true }, "", url.href);
		}

		syncScroll(url, options.restoreHash);
		focusMainContent();

		dispatchPageEvent("astro:page-load", { url: url.href });
		dispatchPageEvent("merkin:page-load", { url: url.href });
		dispatchPageEvent("merkin:navigation-complete", { url: url.href });
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") return;
		window.location.href = url.href;
	} finally {
		if (!abortController?.signal.aborted) {
			abortController = null;
		}
		document.documentElement.dataset.navigation = "idle";
	}
}

function handleDocumentClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const anchor = target.closest("a[href]");
	if (!(anchor instanceof HTMLAnchorElement)) return;
	if (!shouldHandleLink(anchor, event)) return;

	event.preventDefault();
	navigate(new URL(anchor.href, window.location.href));
}

function handleDocumentPreload(event: Event) {
	const target = event.target;
	if (!(target instanceof Element)) return;

	const anchor = target.closest("a[href]");
	if (!(anchor instanceof HTMLAnchorElement)) return;

	const url = getNavigableUrl(anchor);
	if (!url || htmlCache.has(url.href)) return;

	preloadController?.abort();
	preloadController = new AbortController();
	fetchHtml(url, preloadController.signal).catch(() => {});
}

function handlePopState() {
	navigate(new URL(window.location.href), {
		pushState: false,
		restoreHash: false,
	});
}

onMount(() => {
	cleanupNavigation?.();

	document.addEventListener("click", handleDocumentClick);
	document.addEventListener("focusin", handleDocumentPreload);
	document.addEventListener("pointerover", handleDocumentPreload);
	window.addEventListener("popstate", handlePopState);
	history.replaceState(
		{ ...(history.state ?? {}), merkinNavigation: true },
		"",
		window.location.href,
	);

	cleanupNavigation = () => {
		abortController?.abort();
		preloadController?.abort();
		document.removeEventListener("click", handleDocumentClick);
		document.removeEventListener("focusin", handleDocumentPreload);
		document.removeEventListener("pointerover", handleDocumentPreload);
		window.removeEventListener("popstate", handlePopState);
	};

	return cleanupNavigation;
});

onDestroy(() => {
	cleanupNavigation?.();
});
</script>
