import { getAllTags, MarkdownView } from 'obsidian';
import { writable } from 'svelte/store';
import evaluator from './evaluator';
import parser from './parser';
import PromptCard from './PromptCard.svelte';
import { random, uuid } from './util';

export default class Prompt {
  static prompts = new Map();

  static parser = parser;

  static evaluator = evaluator;

  constructor(plugin, editor, deck, index = undefined, shuffled = true) {
    this.app = plugin.app;
    this.plugin = plugin;
    this.editor = editor;

    this.id = uuid();

    this.index = index;
    this.deck = deck;
    this.shuffle = this.deck.custom ? null : shuffled;

    Prompt.prompts.set(this.id, this);
  }

  static setup(plugin) {
    Prompt.app = plugin.app;
    Prompt.plugin = plugin;
  }

  get is_ordered() {
    return this.shuffle;
  }

  static async get_deck(file) {
    const deck_file = await this.app.vault.read(file);
    const deck_tags = getAllTags(this.app.metadataCache.getFileCache(file));
    const deck = Prompt.parser.parse_file(deck_file, deck_tags);
    return deck;
  }

  static update_index(current_index = undefined, align_size = 1) {
    let index;

    // Initialize
    if (current_index === undefined) {
      const r = Math.floor(Math.random() * 800000000) + 100000000;
      index = r - (r % align_size);
    }

    // Increment
    else {
      index = current_index + 1;
    }

    return index;
  }

  static async run_prompt(prompt_source, seed) {
    const prompt_expressions = Prompt.parser.parse(prompt_source);
    const prompt_values = await Prompt.evaluator.evaluate(prompt_expressions, seed, Prompt.plugin);
    return prompt_values;
  }

  static render_code_block(prompt_headers, prompt_result = null, error_text = null) {
    let headers_code = '';
    Object.keys(prompt_headers).forEach((header_key) => {
      const header_value = prompt_headers[header_key];
      if (header_value !== null) {
        const header_code = `${header_key}: ${header_value}\n`;
        headers_code += header_code;
      }
    });

    const prompt_text = error_text || prompt_result || '';

    const body_code = `\n${prompt_text}\n\n`;

    // Render prompt code block
    const code_block = `\`\`\`prompt\n${headers_code}${body_code}\`\`\``;

    const prompt = { ...prompt_headers, code_block };
    return prompt;
  }

  static get_error_prompt(prompt) {
    const metadata = {
      deck: prompt.deck,
      section: null,
      index: Prompt.update_index(),
      shuffle: prompt.shuffle,
    };

    const error_text = `[Error]: ${prompt.error}`;

    return Prompt.render_code_block(metadata, null, error_text);
  }

  static async create_custom_prompt(index) {
    const metadata = {
      deck: '~quick~',
      section: null,
      index: Prompt.update_index(index),
      shuffle: null,
    };

    return Prompt.render_code_block(metadata);
  }

  static async get_prompt_from_deck(file, current_index) {
    const deck = await Prompt.get_deck(file);
    const deck_size = deck.lines.length;
    const { shuffle } = deck.metadata;

    if (deck_size === 0) {
      return {
        deck: file.basename,
        shuffle,
        error: `Deck is empty: no prompts found in file '${file.basename}'.`,
      };
    }

    try {
      const index = shuffle
        ? Prompt.update_index(current_index)
        : Prompt.update_index(current_index, deck_size);

      const prompt_source = shuffle
        ? deck.lines[Math.floor(random(index) * deck_size)]
        : deck.lines[index % deck_size];

      const prompt_values = await Prompt.run_prompt(prompt_source.text, index);
      const prompt_result = prompt_values.map((value) => value.text).join();

      const metadata = {
        deck: file.basename,
        section: prompt_source.section,
        index,
        shuffle,
      };

      return Prompt.render_code_block(metadata, prompt_result);
    } catch {
      return {
        deck: file.basename,
        shuffle,
        error: `Prompt from file ${file.basename} failed to run.`,
      };
    }
  }

  static async generate(deck, index) {
    const prompt = deck?.custom
      ? await Prompt.create_custom_prompt()
      : await Prompt.get_prompt_from_deck(deck, index);

    if (prompt.error) {
      return Prompt.get_error_prompt(prompt);
    }

    return prompt;
  }

  static async add_prompt(editor, deck) {
    const prompt = await Prompt.generate(deck);

    let cursor = editor.getCursor();
    const line_number = cursor.line;

    // Add prompt code block
    prompt.code_block += `\n`;
    editor.replaceRange(prompt.code_block, {
      line: line_number,
      ch: 0,
    });

    // TODO: do dynamically
    cursor = editor.getCursor();
    let cursor_line;
    if (deck.custom) {
      // Quick prompt: cursor within code_block
      cursor_line = cursor.line + 4;
    } else {
      // Deck prompt: cursor after code_block end
      cursor_line = cursor.line + 8 + (prompt.section ? 1 : 0);
    }
    editor.setCursor(cursor_line);

    return prompt;
  }

  static parse_code_block(code_block_source) {
    const re_prompt =
      /(deck: (.*?)\n)(section: (.*?)\n)?(index: (.*?)\n)?(shuffle: (.*?)\n)?(.*)/gms;
    const matches = [...code_block_source.matchAll(re_prompt)][0];

    const prompt = {
      deck: matches[2],
      section: matches[4],
      index: parseInt(matches[6], 10),
      shuffle: matches[8] === 'true',
      source: matches[9].trim(),
    };

    return prompt;
  }

  static async render_prompt(plugin, code_block, container_el, context) {
    const prompt = Prompt.parse_code_block(code_block);
    prompt.context = context;

    // Prompt component
    const parent_el = container_el.parentElement;
    parent_el.classList.add('searchlight-container');
    if (prompt.deck === '~quick~') {
      parent_el.classList.add('searchlight-container--quick');
    } else {
      parent_el.classList.add('searchlight-container--deck');
    }

    const store = writable(prompt);
    this.prompt_element = new PromptCard({
      target: container_el,
      props: {
        prompt: store,
        // TODO: clean up shuffle callback (pass in -> new Prompt ())
        shuffle: () => Prompt.shuffle_prompt(prompt),
      },
    });

    try {
      if (prompt.deck === '~quick~') {
        prompt.values = await Prompt.run_prompt(prompt.source, prompt.index, plugin);
      } else {
        prompt.result = prompt.source;
      }
    } catch {
      prompt.result = `[Error]: Prompt from file ${prompt.deck} failed to run.`;
    }

    store.set(prompt);
  }

  static async shuffle_prompt(prompt) {
    const active_view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const active_file = active_view.file;
    const active_editor = active_view.editor;
    await active_view.save(false);
    const file_contents = await this.app.vault.read(active_file);

    let modified_file_contents;

    if (prompt.deck === '~quick~') {
      // const deck = { basename: prompt.deck, custom: true };
      const re_index = new RegExp(`index: ?${prompt.index}\n`, 'mg');
      const new_deck_index = prompt.index ? prompt.index + 1 : Prompt.update_index();
      modified_file_contents = file_contents.replace(re_index, `index: ${new_deck_index}\n`);
    } else {
      let new_prompt = {};
      try {
        const prompts_files = this.app.vault.getAbstractFileByPath(
          Prompt.plugin.data.settings.prompts_folder
        ).children;
        // TODO: Store pairings of decks and files
        const prompts_file = prompts_files.filter((file) => file.basename === prompt.deck);
        const [deck] = prompts_file;
        // console.log('deck', deck);

        new_prompt = await Prompt.generate(deck, prompt.index);
        // console.log('new_prompt', new_prompt);
      } catch {
        // eslint-disable-next-line no-param-reassign
        new_prompt = Prompt.get_error_prompt({
          deck: prompt.deck,
          shuffle: prompt.shuffle,
          error: `Deck does not exist, file ${prompt.deck} not found.`,
        });
      }

      // console.log('file_contents', file_contents);

      const re_prompt = new RegExp(
        `^\`\`\`prompt\n(deck: ?(.*?)\n)(section: ?(.*?)\n)?(index: ?(${prompt.index})\n)(shuffle: ?(.*?)\n)?\n*((.+\n)*)\n*\`\`\`$`,
        'mg'
      );
      modified_file_contents = file_contents.replace(re_prompt, new_prompt.code_block);

      // console.log('modified_file_contents', modified_file_contents);
    }

    await this.app.vault.modify(active_file, modified_file_contents);

    await active_view.save(false);
    // active_view.refresh();
    active_editor.focus();
  }
}
