// Word count cache for performance optimization
// Prevents repeated DOMParser calls for the same content
const wordCountCache = new Map<string, number>();
const MAX_CACHE_SIZE = 200;

/** Clears the word count cache (useful for testing) */
export const clearWordCountCache = () => wordCountCache.clear();

export const stripHtml = (html: string) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export const textToHtml = (text: string) => {
  if (!text) return "";
  return text.split('\n').map(line => `<p>${line}</p>`).join('');
};

export const safeHtmlReplace = (html: string, search: string, replace: string) => {
  if (!html || !search) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  const walk = (node: Node) => {
    if (node.nodeType === 3) { // Text node
      const text = node.nodeValue;
      if (text && text.includes(search)) {
        node.nodeValue = text.replaceAll(search, replace);
      }
    } else {
      node.childNodes.forEach(walk);
    }
  };
  
  walk(doc.body);
  return doc.body.innerHTML;
};

export const getWordCount = (input: string, isHtml?: boolean) => {
  if (!input) return 0;

  // Create cache key based on content hash and HTML flag
  // Use first 100 chars + length + isHtml for fast unique key
  const cacheKey = `${input.slice(0, 100)}_${input.length}_${isHtml}`;

  // Check cache first
  const cached = wordCountCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let text = input;

  // Check if we should treat as HTML
  const shouldStrip = isHtml === true || (isHtml === undefined && input.includes('<') && input.includes('>'));

  if (shouldStrip) {
      // Replace closing block tags with spaces to prevent word merging
      const htmlWithSpaces = input.replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>|<br\s*\/?>/gi, ' ');
      text = stripHtml(htmlWithSpaces);
  }

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const count = cleanText ? cleanText.split(' ').length : 0;

  // Manage cache size - remove oldest entry if at max
  if (wordCountCache.size >= MAX_CACHE_SIZE) {
    const firstKey = wordCountCache.keys().next().value;
    if (firstKey) wordCountCache.delete(firstKey);
  }

  // Cache the result
  wordCountCache.set(cacheKey, count);

  return count;
};

export const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "Not Set";
  // Parse date manually to avoid timezone shifts with YYYY-MM-DD format
  const [y, m, d] = dateStr.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return "Not Set";
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return "Not Set";
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
};

export const formatTimeAgo = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

/**
 * Escapes special RTF characters in text content.
 */
const escapeRtf = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    // Handle non-ASCII characters by converting to Unicode escape sequences
    .replace(/[^\x00-\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code > 32767) {
        // For characters above 32767, use negative value
        return `\\u${code - 65536}?`;
      }
      return `\\u${code}?`;
    });
};

/**
 * Converts HTML to RTF format with proper encoding and structure.
 * Supports: headings (h1-h6), paragraphs, bold, italic, underline,
 * lists, blockquotes, and line breaks.
 */
export const htmlToRtf = (html: string): string => {
  if (!html) return '';

  // Parse HTML using DOMParser for reliable tag handling
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Recursive function to process nodes
  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeRtf(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    let content = '';

    // Process child nodes
    for (const child of Array.from(node.childNodes)) {
      content += processNode(child);
    }

    switch (tagName) {
      // Headings with different sizes
      case 'h1':
        return `\\pard\\sb480\\sa240{\\fs48\\b ${content}}\\par\n`;
      case 'h2':
        return `\\pard\\sb360\\sa180{\\fs40\\b ${content}}\\par\n`;
      case 'h3':
        return `\\pard\\sb240\\sa120{\\fs32\\b ${content}}\\par\n`;
      case 'h4':
        return `\\pard\\sb180\\sa90{\\fs28\\b ${content}}\\par\n`;
      case 'h5':
        return `\\pard\\sb120\\sa60{\\fs26\\b ${content}}\\par\n`;
      case 'h6':
        return `\\pard\\sb120\\sa60{\\fs24\\b ${content}}\\par\n`;

      // Paragraphs
      case 'p':
        return `\\pard\\sa200\\sl276\\slmult1 ${content}\\par\n`;

      // Text formatting
      case 'strong':
      case 'b':
        return `{\\b ${content}}`;
      case 'em':
      case 'i':
        return `{\\i ${content}}`;
      case 'u':
        return `{\\ul ${content}}`;
      case 's':
      case 'strike':
      case 'del':
        return `{\\strike ${content}}`;

      // Lists
      case 'ul':
        return `\\pard\\sa100\n${content}\\pard\n`;
      case 'ol':
        return `\\pard\\sa100\n${content}\\pard\n`;
      case 'li':
        // Check if parent is ol or ul
        const parent = element.parentElement;
        if (parent?.tagName.toLowerCase() === 'ol') {
          // Get index for numbered lists
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(element) + 1;
          return `\\pard\\fi-360\\li720 ${index}. ${content}\\par\n`;
        }
        return `\\pard\\fi-360\\li720 \\bullet  ${content}\\par\n`;

      // Blockquotes - indented and italic
      case 'blockquote':
        return `\\pard\\li720\\ri720\\sa200{\\i ${content}}\\par\n`;

      // Line breaks
      case 'br':
        return '\\line\n';

      // Divs and spans - just pass through content
      case 'div':
        return `${content}\\par\n`;
      case 'span':
        return content;

      // Links - underline and show URL
      case 'a':
        const href = element.getAttribute('href');
        if (href) {
          return `{\\ul ${content}} ({\\cf1 ${escapeRtf(href)}})`;
        }
        return content;

      // Default - just return content
      default:
        return content;
    }
  };

  // Process the body content
  let rtfContent = '';
  for (const child of Array.from(doc.body.childNodes)) {
    rtfContent += processNode(child);
  }

  // Build complete RTF document with proper header
  const rtfHeader = [
    '{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat',
    '{\\fonttbl{\\f0\\froman\\fcharset0 Times New Roman;}{\\f1\\fswiss\\fcharset0 Arial;}}',
    '{\\colortbl;\\red0\\green0\\blue128;}', // Color table for links
    '\\viewkind4\\uc1',
    '\\f0\\fs24', // Default font: Times New Roman, 12pt
    '\\pard\\sa200\\sl276\\slmult1', // Default paragraph formatting
  ].join('\n');

  return `${rtfHeader}\n${rtfContent}\n}`
};