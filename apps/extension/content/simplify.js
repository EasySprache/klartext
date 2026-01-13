const API_ENDPOINT = "";

function isSkippableElement(element) {
  if (!element) return true;
  const tag = element.tagName?.toLowerCase();
  return (
    tag === "script" ||
    tag === "style" ||
    tag === "noscript" ||
    tag === "textarea" ||
    tag === "input" ||
    tag === "select" ||
    tag === "option" ||
    tag === "code" ||
    tag === "pre"
  );
}

function mockSimplify(text) {
    const wordCount = text.split(/\s+/).length;
    
    const loremWords = [
        "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
        "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
        "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud"
    ];
    
    let result = [];
    for (let i = 0; i < wordCount; i++) {
        result.push(loremWords[i % loremWords.length]);
    }
    
    return result.join(" ");
}

async function simplifyViaApi(text) {
    if (!API_ENDPOINT) return null;

    const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = typeof data?.text === "string" ? data.text : null;
  return result;
}

async function simplifyText(text) {
  const apiResult = await simplifyViaApi(text).catch(() => null);
  return apiResult ?? mockSimplify(text);
}

async function simplifyDocumentText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || isSkippableElement(parent)) return NodeFilter.FILTER_REJECT;
      const value = node.nodeValue ?? "";
      if (!value.trim()) return NodeFilter.FILTER_REJECT;
      if (value.trim().length < 20) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[contenteditable='true']")) return NodeFilter.FILTER_REJECT;
      if (parent.dataset?.simplifiedText === "1") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);

  for (const node of nodes) {
    const original = node.nodeValue ?? "";
    const simplified = await simplifyText(original);
    if (!simplified || simplified === original) continue;

    node.nodeValue = simplified;
    node.parentElement?.setAttribute("data-simplified-text", "1");
  }

  return { changed: nodes.length };
}

simplifyDocumentText();
