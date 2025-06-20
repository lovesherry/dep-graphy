import { AnalyzedDependencyNode } from '../types';
import fs from 'fs';
import path from 'path';

const typeOrder = {
  entry: 0,
  external: 1,
  component: 2,
  hook: 3,
  function: 4,
  enum: 5,
  type: 6,
  interface: 7,
  const: 8,
  style: 9,
  media: 10,
  ignored: 11,
  circular: 12,
  unknown: 13, // 确保 unknown 在最后
};

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderNode(node: AnalyzedDependencyNode, depth = 0): string {
  const indent = depth * 20;
  const children = (node.deps || [])
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
    .map(dep => renderNode(dep, depth + 1))
    .join('\n');

  const namePart = `${node.name} from ${node.filePath}`

  return `
    <div class="dep-node" style="margin-left: ${indent}px">
      <span class="dep-type dep-${node.type}">${escapeHtml(namePart)}</span>
      <span class="dep-meta"> (${node.type})</span>
    </div>
    ${children}
  `;
}

export function renderAnalyzedHtml(roots: AnalyzedDependencyNode[], outputPath = 'dependency-graph.html') {
  const body = roots.map(root => {
    const entryPath = root.filePath ? path.relative(process.cwd(), root.filePath) : 'Unknown Entry';

    return `
      <div class="entry-block">
        <div class="entry-header">${escapeHtml(entryPath)}</div>
        <div class="entry-deps">
          ${renderNode(root)}
        </div>
      </div>
    `;
  }).join('\n');

  const html = `
    <html>
      <head>
        <title>Dependency Graph</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, sans-serif;
            background: #f9f9f9;
            padding: 40px;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #222;
            margin-bottom: 40px;
          }
          .entry-block {
            display: flex;
            margin-bottom: 40px;
            border: 1px solid #ddd;
            border-radius: 12px;
            background: white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            overflow: hidden;
          }
          .entry-header {
            min-width: 280px;
            max-width: 280px;
            background: #2f3542;
            color: #fff;
            padding: 16px;
            font-weight: 600;
            font-size: 16px;
            border-right: 1px solid #ccc;
          }
          .entry-deps {
            flex: 1;
            padding: 16px 20px;
            background: #fdfdfd;
          }
          .dep-node {
            margin: 6px 0;
            padding-left: 6px;
            border-left: 2px solid #eee;
            position: relative;
          }
          .dep-node::before {
            content: '→';
            position: absolute;
            left: -14px;
            top: 0;
            color: #bbb;
            font-size: 12px;
          }
          .dep-type {
            font-weight: 500;
            font-family: monospace;
            font-size: 14px;
          }
          .dep-meta {
            font-size: 12px;
            margin-left: 8px;
            color: #888;
          }

          /* 更稳重统一的颜色系统 */
          .dep-entry { color: #1e90ff; }       /* 蓝色 */
          .dep-external { color: #7f8c8d; }    /* 中灰 */
          .dep-component { color: #2ecc71; }   /* 绿色 */
          .dep-hook { color: #e67e22; }        /* 橙色 */
          .dep-function { color: #9b59b6; }    /* 紫色 */
          .dep-style { color: #3498db; }       /* 天蓝 */
          .dep-media { color: #d35400; }       /* 深橙 */
          .dep-ignored { color: #95a5a6; text-decoration: line-through; } /* 灰+删除线 */
          .dep-unknown { color: #c0392b; font-style: italic; } /* 红+斜体 */
        </style>
      </head>
      <body>
        <h1>Dependency Graph</h1>
        ${body}
      </body>
    </html>
  `;

  fs.writeFileSync(outputPath, html, 'utf-8');
}
