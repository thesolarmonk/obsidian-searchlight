/* eslint-disable no-return-await */
import { request } from 'obsidian';
import random_words from 'random-words';
import { random } from './util';

const NOTE = 'note';
const CURRENT = 'current';
const BOAT = 'boat';
const LINK = 'link';
const WORDS = 'words';
const WIKI = 'wiki';

const LITERAL = 'LITERAL';
const EXPRESSION = 'EXPRESSION';

class Evaluator {
  constructor() {
    if (Evaluator.instance) {
      // eslint-disable-next-line no-constructor-return
      return Evaluator.instance;
    }
    Evaluator.instance = this;

    this.keyword_evaluators = new Map([
      [NOTE, () => this.note()],
      [CURRENT, () => this.current()],
      [BOAT, () => this.boat()],
      [LINK, (file_name) => this.link(file_name)],
      [WORDS, (num_words) => this.words(num_words)],
      [WIKI, (query) => this.wiki(query)],
    ]);
  }

  setup(plugin, seed) {
    this.app = plugin.app;
    this.plugin = plugin;
    this.seed = seed;
  }

  // Keywords

  note() {
    const notes = this.app.vault.getMarkdownFiles();
    const random_note = notes[Math.floor(random(this.seed) * notes.length)];
    return {
      text: random_note.basename,
      link: 'INTERNAL',
    };
  }

  current() {
    // TODO: use this.editor
    const current_note = this.app.workspace.getActiveFile();
    return {
      text: current_note.basename,
      link: 'INTERNAL',
    };
  }

  boat() {
    let random_boat;
    let tries = 0;

    do {
      const notes = this.app.metadataCache.unresolvedLinks;
      const note_names = [...Object.keys(notes)];
      const random_note_name =
        note_names[Math.floor(random(`${tries}-1-${this.seed}`) * note_names.length)];
      const random_note = notes[random_note_name];
      const boat_names = Object.keys(random_note);
      if (boat_names) {
        random_boat = boat_names[Math.floor(random(`${tries}-2-${this.seed}`) * boat_names.length)];
      }
      tries += 1;
    } while (!random_boat);

    return {
      text: random_boat,
      link: 'INTERNAL',
    };
  }

  link(file_name) {
    const file = this.app.vault.getMarkdownFiles().filter((f) => f.basename === file_name);
    const file_path = file[0].path;

    const resolved_links = this.app.metadataCache.resolvedLinks;
    const unresolved_links = this.app.metadataCache.unresolvedLinks;

    const resolved_file_links = resolved_links[file_path];
    const unresolved_file_links = unresolved_links[file_path];

    const file_links = { ...resolved_file_links, ...unresolved_file_links };

    const link_paths = [...Object.keys(file_links)];
    const random_link_path = link_paths[Math.floor(random(this.seed) * link_paths.length)];
    const random_link = this.app.vault.getAbstractFileByPath(random_link_path);

    const random_link_name = random_link ? random_link.basename : random_link_path;

    return {
      text: random_link_name,
      link: 'INTERNAL',
    };
  }

  async wiki(query) {
    let random_wiki_url;
    if (query) {
      random_wiki_url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${query}`;
    } else {
      random_wiki_url = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';
    }

    const response = await request({
      url: random_wiki_url,
    });
    const data = JSON.parse(response);

    let random_wiki;
    if (query) {
      const pages = data.query.search;
      const random_page = pages[Math.floor(random(this.seed) * pages.length)];
      random_wiki = random_page.title;
    } else {
      random_wiki = data.title;
    }

    return {
      text: random_wiki,
      link: 'EXTERNAL',
    };
  }

  words(num_words) {
    return {
      text: random_words({ exactly: parseInt(num_words, 10) || 5, join: ', ' }),
      link: null,
    };
  }

  // Expression

  async evaluate_expression(expression, index) {
    const { keyword, args } = expression;

    let value = null;

    if (this.keyword_evaluators.has(keyword)) {
      const keyword_evaluator = this.keyword_evaluators.get(keyword);
      const arg = args.link || args.text || null;

      // TODO: Repeat until no duplicates
      // do {
      value = await keyword_evaluator(arg);
      // } while (values.has(value));
    }

    return value;
  }

  // Evaluate

  async evaluate(expressions, seed, plugin) {
    this.setup(plugin, seed);

    const values = [];
    let index = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const expression of expressions) {
      let value = null;
      this.seed = `${seed}-${index}`;

      switch (expression.type) {
        case EXPRESSION:
          // eslint-disable-next-line no-await-in-loop
          value = await this.evaluate_expression(expression);
          break;

        case LITERAL:
          value = {
            text: expression.source,
            link: null,
          };
          break;

        default:
          value = null;
          break;
      }

      values.push(value);

      index += 1;
    }

    return values;
  }
}

const evaluator = new Evaluator();
export default evaluator;
