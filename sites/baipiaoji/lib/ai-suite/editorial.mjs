import { tools as unicode } from './editorial-unicode.mjs';
import { tools as writing } from './editorial-writing.mjs';
import { tools as markdown } from './editorial-markdown.mjs';
import { tools as html } from './editorial-html.mjs';
import { tools as metadata } from './editorial-metadata.mjs';
import { tools as formats } from './editorial-formats.mjs';

export const tools = [...unicode, ...writing, ...markdown, ...html, ...metadata, ...formats];
