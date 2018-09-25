'use strict';

const shell = require('./shell.js');
const glob = require('glob').sync;
const fs = require('fs');

try {
    fs.accessSync('chromium', fs.constants.F_OK);
}
catch (ex) {
    console.log(shell(`
    mkdir chromium
    cd chromium
    git init
    git remote add -t master --no-tags origin https://github.com/chromium/chromium.git
    git fetch --depth=1 --recurse-submodules=no
    git config core.sparsecheckout true
    echo chrome/common/extensions/api>.git/info/sparse-checkout
    echo extensions/common/api>>.git/info/sparse-checkout
    git checkout master
    `) || 'checkout ok');
}

const HEAD = `
<!DOCTYPE html>
<html>
<head>
<title>Google Chrome Extension API Support</title>
<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />
<style>
body { font-family: 'Roboto', sans-serif; }
li { line-height: 1.5em; }
p {
    margin-bottom: 3em;
}
p, .content > span { color: grey; }
p a {
    color: white;
    background-color: #668de5;
    border-radius: 3px;
    padding: 3px;
}
p a:hover {
    background-color: #356be5;
}
.content {
    max-width: 80em;
    margin-top: 3em;
    margin-left: auto;
    margin-right: auto;
}
.buttongrouplabel {
    margin-right: 3em;
}
input[name="categories"] {
    margin-left: 1em;
}
input[name="categories"]:checked + span {
    color: black;
}
</style>
</head>
<body>
<div class="content">
<h1>Google Chrome Extension API Support</h1>
<p>API as documented at <a href="https://developer.chrome.com/extensions/api_index">Chrome APIs.</a></p>
<style>
.collapsible-list li {
  list-style-type: none;
}

.not-done:before {
    content: "\\2718";
    color: #e64251;
    margin-right: 0.25em;
}
.all-done:before {
    content: "\\2713";
    font-weight: bolder;
    color: #2bb95a;
    margin-right: 0.25em;
}
.some-done:before {
    content: "\\2713";
    font-weight: bolder;
    color: #f37d32;
    margin-right: 0.25em;
}

.collapsible-list li ul {
  display: none;
}
.collapsible-list li:target ul {
  display: initial;
}

.collapsible-list li .unfold {
  display: initial;
}
.collapsible-list li:target .unfold {
  display: none;
}
.collapsible-list li .collapse {
  display: none;
}
.collapsible-list li:target .collapse {
  display: initial;
}

.collapsible-list li ul li {
  margin-left: 2em;
}

#hide-not-done:checked ~ ul .not-done {
    display: none;
}
</style>
<span class="buttongrouplabel">Show</span><input type="radio" name="categories" checked /> <span>All</span> <input type="radio" name="categories" id="hide-not-done" /> <span>Done</span>
<ul class="collapsible-list">
`;
const LIST_END = `
</ul>
</div>
`;
const TAIL = `
</body>
</html>
`;

let apiCount = 0;
let doneCount = 0;
let partlyCount = 0;


const progress = require('./progress.json');
let commonApi = glob('**/*.json',
    {
        cwd: 'chromium/chrome/common/extensions/api',
        ignore: [
            '**/_*.json',
            '**/*_private.json',
            '**/*_internal.json',
            '**/*_tag.json',
            '**/action.json',
            '**/app.json',
            '**/data_reduction_proxy.json',
            '**/manifest_types.json'
        ]
    }
).map(fname => { return { fileName: fname, namespace: namespaceName(fname) }; });
commonApi.splice(commonApi.findIndex(f => f.namespace === 'sessions'), 0, { fileName: '../../../../extensions/common/api/runtime.json', namespace: 'runtime' });

const body = commonApi.map(f => { return { namespace: f.namespace, properties: propertyNames(f.fileName) }; })
 .reduce(( html, ns) => html + toHTML(ns), '');

fs.writeFileSync('../../api.html', HEAD + body + LIST_END + progressIndicator(doneCount, partlyCount, apiCount) + TAIL);

function namespaceName(fname) {
    const namespaces = fname.split('/');
    if (namespaces[namespaces.length - 1] === 'input_ime.json') {
        return 'input.ime';
    }
    const parts = namespaces.pop().split('.json')[0].split('_');
    const camelCase = parts.shift() + parts.map(p => p.substr(0, 1).toUpperCase() + p.substr(1)).join('');
    return namespaces.concat(camelCase).join('.');
}

function propertyNames(fname) {
    const buf = fs.readFileSync('./chromium/chrome/common/extensions/api/' + fname, 'utf-8');
    const noComment = buf.split(/[\r\n]+/g)
        .filter(ln => !ln.trimLeft().startsWith('//'))
        .map(ln => {
            const c = ln.match(/(.*)[/][/][^"']+$/);
            return c ? c[1] : ln;
        })
        .join('\n');
    try {
        const defs = JSON.parse(noComment)[0];
        return [ ...(defs.properties ? Object.keys(defs.properties) : []),
        ...(defs.functions ? defs.functions.map(f => f.name) : []),
        ...(defs.events ? defs.events.map(f => f.name) : [])
   ];
}
    catch (ex) {
        debugger;
        return [];
    }
}

function toHTML(ns) {
    apiCount += ns.properties.length;
    if (progress.done[ns.namespace]) {
        doneCount += progress.done[ns.namespace].length;
    }
    if (progress.partly[ns.namespace]) {
        partlyCount += progress.partly[ns.namespace].length;
    }

    const nsStatus = (!progress.done[ns.namespace] && !progress.partly[ns.namespace]) ? 'not-done' : (progress.done[ns.namespace].length >= ns.properties.length ? 'all-done' : 'some-done');
    return `
    <li id="${ns.namespace}" class="${nsStatus}"><a href="#${ns.namespace}" class="unfold">${ns.namespace}</a><a href="#" class="collapse">${ns.namespace}</a>
    <ul>
` +
    ns.properties.map(p => `      <li class="${(progress.done[ns.namespace] || []).indexOf(p) != -1 ? 'all-done' : ((progress.partly[ns.namespace] || []).indexOf(p) != -1 ? 'some-done' : 'not-done')}">${p}${bugs(ns.namespace, p)}</li>`).join(`
`) +
`    </ul>
  </li>
`;
}

function bugs(namespace, property) {
    if (!progress.bugs || !progress.bugs[namespace] || !progress.bugs[namespace][property] || !Array.isArray(progress.bugs[namespace][property])) {
        return '';
    }
    return ' ' + progress.bugs[namespace][property].reduce(function (str, bug) { return str + `<a href="${bug}">${bug}</a>`; }, '');
}

function progressIndicator(done, partly, total) {
    return `
<div style="position: absolute; top: 0px; left: 0px; width: 100%; height: 1rem; background-color: #e64251;">
  <span style="display: inline-block; width: ${100*done/total}%; line-height: 100%; overflow: hidden; white-space: nowrap; color: #2bb95a; background-color: #2bb95a;">${Math.round(100*done/total)}% done</span><span style="display: inline-block; width: ${100*partly/total}%; line-height: 100%; overflow: hidden; white-space: nowrap; color: #f37d32; background-color: #f37d32;">${Math.round(100*partly/total)}% in progress</span>
</div>
`;
}
