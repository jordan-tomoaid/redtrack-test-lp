/**
 * Minimal element builder. Used instead of innerHTML so that values taken from
 * the query string are always inserted as text and can never become markup.
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, String(value));
  });

  const list = Array.isArray(children) ? children : [children];
  list.filter((child) => child !== null && child !== undefined && child !== false)
    .forEach((child) => node.append(child));

  return node;
}

export function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(node, children) {
  clear(node);
  (Array.isArray(children) ? children : [children])
    .filter(Boolean)
    .forEach((child) => node.append(child));
}
