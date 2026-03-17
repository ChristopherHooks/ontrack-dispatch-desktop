// Shared markdown renderer for in-app document content.
// Used by Documents page and any document modal overlays.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function inlineMd(s: string): string {
  return s
    // [[Document Title]] → clickable cross-reference
    .replace(/\[\[(.+?)\]\]/g, '<a data-doc-link="$1" class="text-orange-400 hover:text-orange-300 underline cursor-pointer font-medium">$1</a>')
    // Pipe-separated doc links: [[A]] | [[B]] — handled by the above already
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em class="text-gray-400">$1</em>')
    .replace(/`(.+?)`/g,       '<code class="bg-surface-600 text-orange-300 px-1 rounded text-xs font-mono">$1</code>')
}

export function renderMd(text: string): string {
  const lines = text.split(String.fromCharCode(10))
  const out: string[] = []
  let inUl = false, inOl = false
  for (const line of lines) {
    const closeList = () => {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (inOl) { out.push('</ol>'); inOl = false }
    }
    if (line.startsWith('### ')) {
      closeList()
      out.push('<h3 class="text-base font-semibold text-gray-100 mt-4 mb-1">' + inlineMd(esc(line.slice(4))) + '</h3>')
    } else if (line.startsWith('## ')) {
      closeList()
      out.push('<h2 class="text-lg font-bold text-gray-100 mt-5 mb-2">' + inlineMd(esc(line.slice(3))) + '</h2>')
    } else if (line.startsWith('# ')) {
      closeList()
      out.push('<h1 class="text-xl font-bold text-white mt-5 mb-2">' + inlineMd(esc(line.slice(2))) + '</h1>')
    } else if (/^\d+\.\s/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol class="list-decimal list-inside space-y-1 my-2 text-gray-300">'); inOl = true }
      out.push('<li class="text-sm">' + inlineMd(esc(line.replace(/^\d+\.\s/, ''))) + '</li>')
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="list-disc list-inside space-y-1 my-2 text-gray-300">'); inUl = true }
      out.push('<li class="text-sm">' + inlineMd(esc(line.slice(2))) + '</li>')
    } else if (line.startsWith('> ')) {
      closeList()
      out.push('<blockquote class="border-l-2 border-orange-600 pl-3 my-2 text-gray-400 italic text-sm">' + esc(line.slice(2)) + '</blockquote>')
    } else if (line.trim() === '---') {
      closeList()
      out.push('<hr class="border-surface-400 my-3"/>')
    } else if (line.trim() === '') {
      closeList()
      out.push('<div class="my-1"></div>')
    } else {
      closeList()
      out.push('<p class="text-sm text-gray-300 my-1 leading-relaxed">' + inlineMd(esc(line)) + '</p>')
    }
  }
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')
  return out.join('')
}
