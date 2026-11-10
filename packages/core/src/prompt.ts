import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
export interface Prompt { id: string; version: string; hash: string; text: string }
export async function loadPrompt(path: string): Promise<Prompt> {
  const raw = (await readFile(path, 'utf8')).replace(/\r\n/g, '\n');
  const match = /^---\nid: ([\w-]+)\nversion: ([\w.-]+)\n---\n([\s\S]+)$/.exec(raw);
  if (!match) throw new Error('Invalid prompt front matter (id, version required)');
  return { id: match[1]!, version: match[2]!, hash: createHash('sha256').update(raw).digest('hex'), text: match[3]!.trim() };
}
