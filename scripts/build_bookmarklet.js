'use strict';
// Builds embed-bookmarklet.txt: a self-contained, single-line bookmarklet that
// embeds the gzip+base64 payload of embed-cloudflare-tight.html and copies the exact
// HTML to the clipboard on click. No remote fetch at runtime.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'embed-cloudflare-tight.html');
const outPath = path.join(root, 'embed-bookmarklet.txt');

const html = fs.readFileSync(htmlPath);
const payload = zlib.gzipSync(html).toString('base64');

const bookmarklet =
  'javascript:void(async()=>{' +
  'const b="' + payload + '";' +
  'const copy=async(t)=>{' +
  'if(navigator.clipboard&&window.isSecureContext){' +
  'try{await navigator.clipboard.writeText(t);return true}catch(e){}' +
  '}' +
  'const a=document.createElement("textarea");' +
  'a.value=t;a.style.cssText="position:fixed;left:-9999px;top:0;opacity:0";' +
  'document.body.appendChild(a);a.focus();a.select();' +
  'const ok=document.execCommand("copy");a.remove();' +
  'if(!ok)throw Error("copy")' +
  '};' +
  'try{' +
  'const u=Uint8Array.from(atob(b),c=>c.charCodeAt(0));' +
  'const html=await new Response(' +
  'new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip"))' +
  ').text();' +
  'await copy(html);' +
  'alert("Dharane embed copied")' +
  '}catch(e){alert("Unable to copy Dharane embed")}' +
  '})()';

fs.writeFileSync(outPath, bookmarklet + '\n');
console.log('Wrote ' + outPath + ' (' + Buffer.byteLength(bookmarklet) + ' bytes)');
